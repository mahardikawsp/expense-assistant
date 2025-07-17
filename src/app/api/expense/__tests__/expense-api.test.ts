import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        expense: {
            findMany: vi.fn(),
            count: vi.fn(),
            create: vi.fn(),
            aggregate: vi.fn(),
        },
        $queryRaw: vi.fn(),
    },
}));

describe('Expense API', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('GET /api/expense', () => {
        it('should return 401 if user is not authenticated', async () => {
            // Mock auth to return no session
            vi.mocked(auth).mockResolvedValue(null);

            // Create mock request
            const request = new NextRequest('http://localhost:3000/api/expense');

            // Call the handler
            const response = await GET(request);
            const data = await response.json();

            // Verify response
            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return expenses for authenticated user', async () => {
            // Mock auth to return a session
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-123', email: 'test@example.com' },
            } as any);

            // Mock prisma responses
            vi.mocked(prisma.expense.count).mockResolvedValue(2);
            vi.mocked(prisma.expense.findMany).mockResolvedValue([
                {
                    id: 'expense-1',
                    userId: 'user-123',
                    amount: 100,
                    description: 'Groceries',
                    date: new Date(),
                    category: 'Food & Dining',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'expense-2',
                    userId: 'user-123',
                    amount: 50,
                    description: 'Gas',
                    date: new Date(),
                    category: 'Transportation',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                { category: 'Food & Dining', total: 100 },
                { category: 'Transportation', total: 50 },
            ]);
            vi.mocked(prisma.expense.aggregate).mockResolvedValue({
                _sum: { amount: 150 },
            } as any);

            // Create mock request
            const request = new NextRequest('http://localhost:3000/api/expense');

            // Call the handler
            const response = await GET(request);
            const data = await response.json();

            // Verify response
            expect(response.status).toBe(200);
            expect(data.data).toHaveLength(2);
            expect(data.totals.overall).toBe(150);
            expect(data.pagination.total).toBe(2);
        });
    });

    describe('POST /api/expense', () => {
        it('should return 401 if user is not authenticated', async () => {
            // Mock auth to return no session
            vi.mocked(auth).mockResolvedValue(null);

            // Create mock request
            const request = new NextRequest('http://localhost:3000/api/expense', {
                method: 'POST',
                body: JSON.stringify({}),
            });

            // Call the handler
            const response = await POST(request);
            const data = await response.json();

            // Verify response
            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should create a new expense for authenticated user', async () => {
            // Mock auth to return a session
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-123', email: 'test@example.com' },
            } as any);

            // Mock expense creation
            const mockExpense = {
                id: 'expense-1',
                userId: 'user-123',
                amount: 100,
                description: 'Groceries',
                date: new Date(),
                category: 'Food & Dining',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as any);

            // Create mock request with valid expense data
            const request = new NextRequest('http://localhost:3000/api/expense', {
                method: 'POST',
                body: JSON.stringify({
                    amount: 100,
                    description: 'Groceries',
                    date: '2023-01-01',
                    category: 'Food & Dining',
                }),
            });

            // Call the handler
            const response = await POST(request);
            const data = await response.json();

            // Verify response
            expect(response.status).toBe(201);
            expect(data.id).toBe('expense-1');
            expect(data.amount).toBe(100);
            expect(data.description).toBe('Groceries');
            expect(data.category).toBe('Food & Dining');

            // Verify prisma was called correctly
            expect(prisma.expense.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-123',
                    amount: 100,
                    description: 'Groceries',
                    date: expect.any(Date),
                    category: 'Food & Dining',
                },
            });
        });

        it('should return 400 for invalid expense data', async () => {
            // Mock auth to return a session
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-123', email: 'test@example.com' },
            } as any);

            // Create mock request with invalid data (missing required fields)
            const request = new NextRequest('http://localhost:3000/api/expense', {
                method: 'POST',
                body: JSON.stringify({
                    amount: -100, // Invalid: negative amount
                    // Missing description
                    date: '2023-01-01',
                    category: 'Food & Dining',
                }),
            });

            // Call the handler
            const response = await POST(request);
            const data = await response.json();

            // Verify response
            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid input');
        });
    });
});