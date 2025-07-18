import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeInput } from './security-utils';

/**
 * Base class for API errors
 */
export class ApiError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
    }
}

/**
 * Error for database operations
 */
export class DatabaseError extends ApiError {
    constructor(message: string = 'Database operation failed') {
        super(message, 500);
    }
}

/**
 * Error for not found resources
 */
export class NotFoundError extends ApiError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

/**
 * Error for unauthorized access
 */
export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized access') {
        super(message, 401);
    }
}

/**
 * Error for forbidden access
 */
export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden access') {
        super(message, 403);
    }
}

/**
 * Error for validation failures
 */
export class ValidationError extends ApiError {
    errors: Record<string, string[]>;

    constructor(errors: Record<string, string[]>) {
        super('Validation failed', 400);
        this.errors = errors;
    }
}

/**
 * Sanitize an object recursively
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject) as unknown as T;
    }

    const result = {} as Record<string, any>;

    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
        if (typeof value === 'string') {
            result[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value);
        } else {
            result[key] = value;
        }
    }

    return result as T;
}

/**
 * Validate API input using Zod schema
 * @param request NextRequest object
 * @param schema Zod schema for validation
 * @param options Options for validation
 * @returns Validation result
 */
export async function validateApiInput<T>(
    request: NextRequest,
    schema: z.ZodType<T>,
    options: {
        userId?: string;
        requestId?: string;
        sanitize?: boolean;
    } = {}
): Promise<
    | { success: true; data: T }
    | { success: false; error: NextResponse }
> {
    try {
        const body = await request.json();

        // Sanitize input if requested
        const input = options.sanitize ? sanitizeObject(body) : body;

        // Validate with Zod schema
        const result = schema.safeParse(input);

        if (!result.success) {
            // Format validation errors
            const formattedErrors: Record<string, string[]> = {};

            for (const error of result.error.errors) {
                const path = error.path.join('.');
                if (!formattedErrors[path]) {
                    formattedErrors[path] = [];
                }
                formattedErrors[path].push(error.message);
            }

            return {
                success: false,
                error: NextResponse.json({
                    error: 'Validation failed',
                    details: formattedErrors,
                    requestId: options.requestId,
                }, { status: 400 }),
            };
        }

        return { success: true, data: result.data };
    } catch (error) {
        return {
            success: false,
            error: NextResponse.json({
                error: 'Invalid request body',
                requestId: options.requestId,
            }, { status: 400 }),
        };
    }
}