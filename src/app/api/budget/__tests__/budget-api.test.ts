import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        budget: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}));

vi.mock('@/lib/session', () => ({
    getServerSession: vi.fn(),
}));

// Import after mocking
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PUT, DELETE } from '../[id]/route';

describe('Budget API', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        // Mock session for authenticated user
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-123', email: 'test@example.com' },
            expires: new Date().toISOString(),
        });
    });

    describe('GET /api/budget', () => {
        it('should return 401 if user is not authenticated', async () => {
            // Mock unauthenticated session
            vi.mocked(getServerSession).mockResolvedValueOnce(null);

            const request = new NextRequest('http://localhost:3000/api/budget');
            const response = await GET(request);

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: 'Unauthorized' });
        });

        it('should return budgets for authenticated user', async () => {
            const mockBudgets = [
                {
                    id: 'budget-1',
                    userId: 'user-123',
                    category: 'Food & Dining',
                    limit: 500,
                    period: 'MONTHLY',
                    startDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            vi.mocked(prisma.budget.findMany).mockResolvedValueOnce(mockBudgets);

            const request = new NextRequest('http://localhost:3000/api/budget');
            const response = await GET(request);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(mockBudgets);
            expect(prisma.budget.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                orderBy: [{ category: 'asc' }, { period: 'asc' }],
            });
        });

        it('should apply category and period filters', async () => {
            vi.mocked(prisma.budget.findMany).mockResolvedValueOnce([]);

            const request = new NextRequest(
                'http://localhost:3000/api/budget?category=Housing&period=MONTHLY'
            );
            await GET(request);

            expect(prisma.budget.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-123',
                    category: 'Housing',
                    period: 'MONTHLY',
                },
                orderBy: [{ category: 'asc' }, { period: 'asc' }],
            });
        });
    });

    describe('POST /api/budget', () => {
        it('should create a new budget', async () => {
            const budgetData = {
                category: 'Housing',
                limit: 1000,
                period: 'MONTHLY',
                startDate: '2023-01-01',
            };

            vi.mocked(prisma.budget.findFirst).mockResolvedValueOnce(null);
            vi.mocked(prisma.budget.create).mockResolvedValueOnce({
                id: 'new-budget',
                userId: 'user-123',
                ...budgetData,
                startDate: new Date(budgetData.startDate),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const request = new NextRequest('http://localhost:3000/api/budget', {
                method: 'POST',
                body: JSON.stringify(budgetData),
            });

            const response = await POST(request);

            expect(response.status).toBe(201);
            expect(prisma.budget.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-123',
                    category: 'Housing',
                    limit: 1000,
                    period: 'MONTHLY',
                    startDate: expect.any(Date),
                    endDate: null,
                },
            });
        });

        it('should return 409 if budget already exists for category and period', async () => {
            const budgetData = {
                category: 'Housing',
                limit: 1000,
                period: 'MONTHLY',
                startDate: '2023-01-01',
            };

            vi.mocked(prisma.budget.findFirst).mockResolvedValueOnce({
                id: 'existing-budget',
                userId: 'user-123',
                category: 'Housing',
                limit: 800,
                period: 'MONTHLY',
                startDate: new Date(),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const request = new NextRequest('http://localhost:3000/api/budget', {
                method: 'POST',
                body: JSON.stringify(budgetData),
            });

            const response = await POST(request);

            expect(response.status).toBe(409);
            expect(await response.json()).toEqual({
                error: 'A monthly budget for Housing already exists',
            });
        });
    });

    describe('GET /api/budget/[id]', () => {
        it('should return a specific budget', async () => {
            const mockBudget = {
                id: 'budget-1',
                userId: 'user-123',
                category: 'Food & Dining',
                limit: 500,
                period: 'MONTHLY',
                startDate: new Date(),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(prisma.budget.findUnique).mockResolvedValueOnce(mockBudget);

            const request = new NextRequest('http://localhost:3000/api/budget/budget-1');
            const response = await GET_BY_ID(request, { params: { id: 'budget-1' } });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(mockBudget);
        });

        it('should return 404 if budget not found', async () => {
            vi.mocked(prisma.budget.findUnique).mockResolvedValueOnce(null);

            const request = new NextRequest('http://localhost:3000/api/budget/nonexistent');
            const response = await GET_BY_ID(request, { params: { id: 'nonexistent' } });

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Budget not found' });
        });

        it('should return 403 if budget belongs to another user', async () => {
            vi.mocked(prisma.budget.findUnique).mockResolvedValueOnce({
                id: 'budget-1',
                userId: 'another-user',
                category: 'Food & Dining',
                limit: 500,
                period: 'MONTHLY',
                startDate: new Date(),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const request = new NextRequest('http://localhost:3000/api/budget/budget-1');
            const response = await GET_BY_ID(request, { params: { id: 'budget-1' } });

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: 'Unauthorized' });
        });
    });

    describe('PUT /api/budget/[id]', () => {
        it('should update an existing budget', async () => {
            const existingBudget = {
                id: 'budget-1',
                userId: 'user-123',
                category: 'Food & Dining',
                limit: 500,
                period: 'MONTHLY',
                startDate: new Date(),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updateData = {
                category: 'Food & Dining',
                limit: 600,
                period: 'MONTHLY',
                startDate: '2023-01-01',
            };

            vi.mocked(prisma.budget.findUnique).mockResolvedValueOnce(existingBudget);
            vi.mocked(prisma.budget.findFirst).mockResolvedValueOnce(null);
            vi.mocked(prisma.budget.update).mockResolvedValueOnce({
                ...existingBudget,
                limit: 600,
                startDate: new Date(updateData.startDate),
            });

            const request = new NextRequest('http://localhost:3000/api/budget/budget-1', {
                method: 'PUT',
                body: JSON.stringify(updateData),
            });

            const response = await PUT(request, { params: { id: 'budget-1' } });

            expect(response.status).toBe(200);
            expect(prisma.budget.update).toHaveBeenCalledWith({
                where: { id: 'budget-1' },
                data: {
                    category: 'Food & Dining',
                    limit: 600,
                    period: 'MONTHLY',
                    startDate: expect.any(Date),
                    endDate: null,
                },
            });
        });
    });

    describe('DELETE /api/budget/[id]', () => {
        it('should delete a budget', async () => {
            vi.mocked(prisma.budget.findUnique).mockResolvedValueOnce({
                id: 'budget-1',
                userId: 'user-123',
                category: 'Food & Dining',
                limit: 500,
                period: 'MONTHLY',
                startDate: new Date(),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const request = new NextRequest('http://localhost:3000/api/budget/budget-1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: 'budget-1' } });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ success: true });
            expect(prisma.budget.delete).toHaveBeenCalledWith({
                where: { id: 'budget-1' },
            });
        });
    });
});