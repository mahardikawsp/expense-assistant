import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, UnauthorizedError } from './error-utils';
import crypto from 'crypto';

type ApiHandler = (
    request: NextRequest,
    context: {
        userId: string;
        requestId: string;
    }
) => Promise<NextResponse>;

/**
 * Generate a unique request ID
 * @returns Unique request ID
 */
function generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Higher-order function to wrap API handlers with common middleware functionality
 * @param handler API handler function
 * @returns Wrapped handler with middleware
 */
export function withApiMiddleware(handler: ApiHandler) {
    return async (request: NextRequest): Promise<NextResponse> => {
        // Generate a unique request ID for tracing
        const requestId = generateRequestId();

        try {
            // Get user from session
            const session = await auth();

            // Check if user is authenticated
            if (!session?.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            // Call the handler with user ID and request ID
            return await handler(request, {
                userId: session.user.id,
                requestId,
            });
        } catch (error) {
            // Handle known API errors
            if (error instanceof ApiError) {
                return NextResponse.json({
                    error: error.message,
                    requestId,
                }, { status: error.statusCode });
            }

            // Handle unknown errors
            console.error(`[${requestId}] Unhandled error:`, error);

            return NextResponse.json({
                error: 'An unexpected error occurred',
                requestId,
            }, { status: 500 });
        }
    };
}