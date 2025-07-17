import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkBudgetLimitsAndNotify, formatNotification, markNotificationAsRead, getUnreadNotificationCount } from '../notification-utils';
import { prisma } from '../prisma';
import { calculateBudgetUsage, getCurrentBudgetPeriod } from '../budget-utils';

// Mock dependencies
vi.mock('../prisma', () => ({
    prisma: {
        budget: {
            findMany: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        },
        expense: {
            findMany: vi.fn(),
        },
        notification: {
            create: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
    },
}));

vi.mock('../budget-utils', () => ({
    calculateBudgetUsage: vi.fn(),
    getCurrentBudgetPeriod: vi.fn(),
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}));

// Mock mailgun.js and form-data
vi.mock('mailgun.js', () => ({
    default: vi.fn(() => ({
        client: vi.fn(() => ({
            messages: {
                create: vi.fn().mockResolvedValue({ id: 'message-id' }),
            },
        })),
    })),
}));

vi.mock('form-data', () => ({
    default: vi.fn(),
}));

describe('Notification Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('checkBudgetLimitsAndNotify', () => {
        it('should return empty arrays when no budgets are found', async () => {
            // Mock budget.findMany to return empty array
            (prisma.budget.findMany as any).mockResolvedValue([]);

            const expense = {
                id: 'expense-1',
                userId: 'user-1',
                amount: 100,
                description: 'Test expense',
                date: new Date(),
                category: 'Food',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await checkBudgetLimitsAndNotify(expense, 'user-1');

            expect(result).toEqual({ notifications: [], budgetStatus: [] });
            expect(prisma.budget.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    category: 'Food',
                },
            });
        });

        it('should create a budget_exceeded notification when budget is exceeded', async () => {
            // Mock budget.findMany
            (prisma.budget.findMany as any).mockResolvedValue([
                {
                    id: 'budget-1',
                    userId: 'user-1',
                    category: 'Food',
                    limit: '200.00',
                    period: 'MONTHLY',
                    startDate: new Date('2023-01-01'),
                    endDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock user.findUnique
            (prisma.user.findUnique as any).mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                name: 'Test User',
            });

            // Mock getCurrentBudgetPeriod
            (getCurrentBudgetPeriod as any).mockReturnValue({
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-02-01'),
            });

            // Mock expense.findMany
            (prisma.expense.findMany as any).mockResolvedValue([
                {
                    id: 'expense-2',
                    userId: 'user-1',
                    amount: '150.00',
                    description: 'Existing expense',
                    date: new Date('2023-01-15'),
                    category: 'Food',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock calculateBudgetUsage to indicate budget exceeded
            (calculateBudgetUsage as any).mockReturnValue({
                spent: 250,
                limit: 200,
                remaining: -50,
                percentage: 125,
                isOverBudget: true,
                isActive: true,
                periodStart: new Date('2023-01-01'),
                periodEnd: new Date('2023-02-01'),
                expenses: [],
            });

            // Mock notification.create
            (prisma.notification.create as any).mockResolvedValue({
                id: 'notification-1',
                userId: 'user-1',
                type: 'budget_exceeded',
                message: 'Your Food budget has been exceeded by $50.00. You\'ve spent $250.00 of your $200.00 monthly budget.',
                isRead: false,
                createdAt: new Date(),
            });

            const expense = {
                id: 'expense-1',
                userId: 'user-1',
                amount: 100,
                description: 'Test expense',
                date: new Date('2023-01-20'),
                category: 'Food',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await checkBudgetLimitsAndNotify(expense, 'user-1');

            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].type).toBe('budget_exceeded');
            expect(prisma.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    type: 'budget_exceeded',
                    message: expect.any(String),
                    isRead: false,
                },
            });
        });

        it('should create a budget_warning notification when budget is approaching limit', async () => {
            // Mock budget.findMany
            (prisma.budget.findMany as any).mockResolvedValue([
                {
                    id: 'budget-1',
                    userId: 'user-1',
                    category: 'Food',
                    limit: '200.00',
                    period: 'MONTHLY',
                    startDate: new Date('2023-01-01'),
                    endDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock user.findUnique
            (prisma.user.findUnique as any).mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                name: 'Test User',
            });

            // Mock getCurrentBudgetPeriod
            (getCurrentBudgetPeriod as any).mockReturnValue({
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-02-01'),
            });

            // Mock expense.findMany
            (prisma.expense.findMany as any).mockResolvedValue([
                {
                    id: 'expense-2',
                    userId: 'user-1',
                    amount: '100.00',
                    description: 'Existing expense',
                    date: new Date('2023-01-15'),
                    category: 'Food',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock calculateBudgetUsage to indicate budget warning (80%)
            (calculateBudgetUsage as any).mockReturnValue({
                spent: 160,
                limit: 200,
                remaining: 40,
                percentage: 80,
                isOverBudget: false,
                isActive: true,
                periodStart: new Date('2023-01-01'),
                periodEnd: new Date('2023-02-01'),
                expenses: [],
            });

            // Mock notification.create
            (prisma.notification.create as any).mockResolvedValue({
                id: 'notification-1',
                userId: 'user-1',
                type: 'budget_warning',
                message: 'You\'ve used 80% of your Food budget. You have $40.00 remaining for this monthly period.',
                isRead: false,
                createdAt: new Date(),
            });

            const expense = {
                id: 'expense-1',
                userId: 'user-1',
                amount: 60,
                description: 'Test expense',
                date: new Date('2023-01-20'),
                category: 'Food',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await checkBudgetLimitsAndNotify(expense, 'user-1');

            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].type).toBe('budget_warning');
            expect(prisma.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    type: 'budget_warning',
                    message: expect.any(String),
                    isRead: false,
                },
            });
        });

        it('should not create notifications when budget is under 80%', async () => {
            // Mock budget.findMany
            (prisma.budget.findMany as any).mockResolvedValue([
                {
                    id: 'budget-1',
                    userId: 'user-1',
                    category: 'Food',
                    limit: '200.00',
                    period: 'MONTHLY',
                    startDate: new Date('2023-01-01'),
                    endDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock getCurrentBudgetPeriod
            (getCurrentBudgetPeriod as any).mockReturnValue({
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-02-01'),
            });

            // Mock expense.findMany
            (prisma.expense.findMany as any).mockResolvedValue([
                {
                    id: 'expense-2',
                    userId: 'user-1',
                    amount: '50.00',
                    description: 'Existing expense',
                    date: new Date('2023-01-15'),
                    category: 'Food',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock calculateBudgetUsage to indicate budget is under warning threshold
            (calculateBudgetUsage as any).mockReturnValue({
                spent: 100,
                limit: 200,
                remaining: 100,
                percentage: 50,
                isOverBudget: false,
                isActive: true,
                periodStart: new Date('2023-01-01'),
                periodEnd: new Date('2023-02-01'),
                expenses: [],
            });

            const expense = {
                id: 'expense-1',
                userId: 'user-1',
                amount: 50,
                description: 'Test expense',
                date: new Date('2023-01-20'),
                category: 'Food',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await checkBudgetLimitsAndNotify(expense, 'user-1');

            expect(result.notifications).toHaveLength(0);
            expect(prisma.notification.create).not.toHaveBeenCalled();
        });
    });

    describe('formatNotification', () => {
        it('should format budget_exceeded notification correctly', () => {
            const notification = {
                id: 'notification-1',
                userId: 'user-1',
                type: 'budget_exceeded',
                message: 'Budget exceeded message',
                isRead: false,
                createdAt: new Date(),
            };

            const formatted = formatNotification(notification);

            expect(formatted).toEqual({
                id: 'notification-1',
                message: 'Budget exceeded message',
                isRead: false,
                createdAt: expect.any(Date),
                type: 'budget_exceeded',
                severity: 'error',
                icon: 'alert-circle',
                title: 'Budget Exceeded',
            });
        });

        it('should format budget_warning notification correctly', () => {
            const notification = {
                id: 'notification-1',
                userId: 'user-1',
                type: 'budget_warning',
                message: 'Budget warning message',
                isRead: false,
                createdAt: new Date(),
            };

            const formatted = formatNotification(notification);

            expect(formatted).toEqual({
                id: 'notification-1',
                message: 'Budget warning message',
                isRead: false,
                createdAt: expect.any(Date),
                type: 'budget_warning',
                severity: 'warning',
                icon: 'alert-triangle',
                title: 'Budget Warning',
            });
        });

        it('should format unknown notification types with default values', () => {
            const notification = {
                id: 'notification-1',
                userId: 'user-1',
                type: 'unknown_type',
                message: 'Unknown notification',
                isRead: false,
                createdAt: new Date(),
            };

            const formatted = formatNotification(notification);

            expect(formatted).toEqual({
                id: 'notification-1',
                message: 'Unknown notification',
                isRead: false,
                createdAt: expect.any(Date),
                type: 'unknown_type',
                severity: 'info',
                icon: 'info',
                title: 'Notification',
            });
        });
    });

    describe('markNotificationAsRead', () => {
        it('should mark a notification as read', async () => {
            (prisma.notification.update as any).mockResolvedValue({
                id: 'notification-1',
                userId: 'user-1',
                type: 'budget_warning',
                message: 'Test message',
                isRead: true,
                createdAt: new Date(),
            });

            await markNotificationAsRead('notification-1', 'user-1');

            expect(prisma.notification.update).toHaveBeenCalledWith({
                where: {
                    id: 'notification-1',
                    userId: 'user-1',
                },
                data: {
                    isRead: true,
                },
            });
        });
    });

    describe('getUnreadNotificationCount', () => {
        it('should return the count of unread notifications', async () => {
            (prisma.notification.count as any).mockResolvedValue(5);

            const count = await getUnreadNotificationCount('user-1');

            expect(count).toBe(5);
            expect(prisma.notification.count).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    isRead: false,
                },
            });
        });
    });
});