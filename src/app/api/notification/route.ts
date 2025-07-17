import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatNotification } from '@/lib/notification-utils';

/**
 * GET handler to fetch notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = request.nextUrl;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 20;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : 1;
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const type = searchParams.get('type');

        // Build filter conditions
        const where: any = {
            userId: session.user.id,
        };

        if (unreadOnly) {
            where.isRead = false;
        }

        if (type) {
            where.type = type;
        }

        // Get total count for pagination
        const total = await prisma.notification.count({ where });

        // Get notifications with pagination
        const notifications = await prisma.notification.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Format notifications for display
        const formattedNotifications = notifications.map(formatNotification);

        return NextResponse.json({
            data: formattedNotifications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

/**
 * POST handler to mark all notifications as read
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();
        const { action } = body;

        if (action === 'markAllAsRead') {
            // Mark all notifications as read
            await prisma.notification.updateMany({
                where: {
                    userId: session.user.id,
                    isRead: false,
                },
                data: {
                    isRead: true,
                },
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
        );
    }
}