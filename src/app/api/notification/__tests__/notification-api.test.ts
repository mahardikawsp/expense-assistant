import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatNotification } from '@/lib/notification-utils';

// Mock dependencies
vi.mock('next/server', () => ({
    NextRequest: vi.fn(),
    NextResponse: {
        json: vi.fn((data, options) => ({ data, options })),
    },
}));

vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        notification: {
            count: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}));

vi.mock('@/lib/notification-utils', () => ({
    formatNotification: vi.fn(notification => ({
        ...notification,
        severity: notification.type === 'budget_exceeded' ? 'error' : 'warning',
        icon: notification.type === 'budget_exceeded' ? 'alert-circle' : 'alert-triangle',
        title: notification.type === 'budget_exceeded' ? 'Budget Exceeded' : 'Budget Warning',
    })),
}));

describe('Notification API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('GET handler', () => {
        it('should return unauthorized if user is not authenticated', async () => {
            // Mock auth to return no session
            (auth as any).mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/notification');
            const response = await GET(request);

            expect(response.data.error).toBe('Unauthorized');
            expect(response.options.status).toBe(401);
        });

        it('should return notifications with pagination', async () => {
            // Mock auth to return a valid session
            (auth as any).mockResolvedValue({
                user: { id: 'user-1' },
            });

            // Mock URL with search params
            const request = new NextRequest('http://localhost:3000/api/notification?page=1&limit=10');

            // Mock notification count
            (prisma.notification.count as any).mockResolvedValue(15);

            // Mock notifications
            const mockNotifications = [
                {
                    id: 'notification-1',
                    userId: 'user-1',
                    type: 'budget_exceeded',
                    message: 'Budget exceeded message',
                    isRead: false,
                    createdAt: new Date(),
                },
                {
                    id: 'notification-2',
                    userId: 'user-1',
                    type: 'budget_warning',
                    message: 'Budget warning message',
                    isRead: true,
                    createdAt: new Date(),
                },
            ];

            (prisma.notification.findMany as any).mockResolvedValue(mockNotifications);

            const response = await GET(request);

            expect(prisma.notification.count).toHaveBeenCalled();
            expect(prisma.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                take: 10,
                skip: 0,
                orderBy: { createdAt: 'desc' },
            });

            expect(formatNotification).toHaveBeenCalledTimes(2);
            expect(response.data.pagination).toEqual({
                total: 15,
                page: 1,
                limit: 10,
                totalPages: 2,
            });
            expect(response.data.data).toHaveLength(2);
        });

        it('should filter by unread notifications when requested', async () => {
            // Mock auth to return a valid session
            (auth as any).mockResolvedValue({
                user: { id: 'user-1' },
            });

            // Mock URL with search params
            const request = new NextRequest('http://localhost:3000/api/notification?unreadOnly=true');

            // Mock notification count
            (prisma.notification.count as any).mockResolvedValue(5);

            // Mock notifications
            const mockNotifications = [
                {
                    id: 'notification-1',
                    userId: 'user-1',
                    type: 'budget_exceeded',
                    message: 'Budget exceeded message',
                    isRead: false,
                    createdAt: new Date(),
                },
            ];

            (prisma.notification.findMany as any).mockResolvedValue(mockNotifications);

            const response = await GET(request);

            expect(prisma.notification.count).toHaveBeenCalledWith({
                where: { userId: 'user-1', isRead: false },
            });
            expect(prisma.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1', isRead: false },
                take: 20,
                skip: 0,
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should filter by notification type when requested', async () => {
            // Mock auth to return a valid session
            (auth as any).mockResolvedValue({
                user: { id: 'user-1' },
            });

            // Mock URL with search params
            const request = new NextRequest('http://localhost:3000/api/notification?type=budget_exceeded');

            // Mock notification count
            (prisma.notification.count as any).mockResolvedValue(3);

            // Mock notifications
            const mockNotifications = [
                {
                    id: 'notification-1',
                    userId: 'user-1',
                    type: 'budget_exceeded',
                    message: 'Budget exceeded message',
                    isRead: false,
                    createdAt: new Date(),
                },
            ];

            (prisma.notification.findMany as any).mockResolvedValue(mockNotifications);

            const response = await GET(request);

            expect(prisma.notification.count).toHaveBeenCalledWith({
                where: { userId: 'user-1', type: 'budget_exceeded' },
            });
            expect(prisma.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1', type: 'budget_exceeded' },
                take: 20,
                skip: 0,
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    describe('POST handler', () => {
        it('should return unauthorized if user is not authenticated', async () => {
            // Mock auth to return no session
            (auth as any).mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/notification', {
                method: 'POST',
                body: JSON.stringify({ action: 'markAllAsRead' }),
            });

            const response = await POST(request);

            expect(response.data.error).toBe('Unauthorized');
            expect(response.options.status).toBe(401);
        });

        it('should mark all notifications as read', async () => {
            // Mock auth to return a valid session
            (auth as any).mockResolvedValue({
                user: { id: 'user-1' },
            });

            // Mock request body
            const request = new NextRequest('http://localhost:3000/api/notification', {
                method: 'POST',
                body: JSON.stringify({ action: 'markAllAsRead' }),
            });

            // Mock updateMany
            (prisma.notification.updateMany as any).mockResolvedValue({ count: 5 });

            const response = await POST(request);

            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    isRead: false,
                },
                data: {
                    isRead: true,
                },
            });

            expect(response.data.success).toBe(true);
        });

        it('should return error for invalid action', async () => {
            // Mock auth to return a valid session
            (auth as any).mockResolvedValue({
                user: { id: 'user-1' },
            });

            // Mock request body with invalid action
            const request = new NextRequest('http://localhost:3000/api/notification', {
                method: 'POST',
                body: JSON.stringify({ action: 'invalidAction' }),
            });

            const response = await POST(request);

            expect(response.data.error).toBe('Invalid action');
            expect(response.options.status).toBe(400);
        });
    });
});