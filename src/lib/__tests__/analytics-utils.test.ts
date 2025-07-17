import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getExpenseTrend,
    getCategoryBreakdown,
    getSpendingPatternAnalysis,
    generateMonthlyReport,
    generateYearlyReport,
} from '../analytics-utils';
import { prisma } from '../prisma';

// Mock the Prisma client
vi.mock('../prisma', () => ({
    prisma: {
        expense: {
            aggregate: vi.fn(),
            groupBy: vi.fn(),
            findMany: vi.fn(),
        },
        income: {
            aggregate: vi.fn(),
            groupBy: vi.fn(),
            findMany: vi.fn(),
        },
        budget: {
            findMany: vi.fn(),
        },
    },
}));

describe('Analytics Utils', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getExpenseTrend', () => {
        it('should return expense trend data for the specified months', async () => {
            // Mock the Prisma response
            const mockAggregate = prisma.expense.aggregate as any;
            mockAggregate.mockResolvedValue({
                _sum: {
                    amount: 150.75,
                },
            });

            const result = await getExpenseTrend('user123', 3);

            // Verify the result structure
            expect(result).toHaveLength(3);
            expect(result[0]).toHaveProperty('month');
            expect(result[0]).toHaveProperty('amount');
            expect(typeof result[0].amount).toBe('number');

            // Verify Prisma was called correctly
            expect(mockAggregate).toHaveBeenCalledTimes(3);
        });
    });

    describe('getCategoryBreakdown', () => {
        it('should return category breakdown with percentages', async () => {
            // Mock the Prisma response
            const mockGroupBy = prisma.expense.groupBy as any;
            mockGroupBy.mockResolvedValue([
                { category: 'Food & Dining', _sum: { amount: 200 } },
                { category: 'Housing', _sum: { amount: 800 } },
            ]);

            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-31');
            const result = await getCategoryBreakdown('user123', startDate, endDate);

            // Verify the result structure
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('category', 'Food & Dining');
            expect(result[0]).toHaveProperty('amount', 200);
            expect(result[0]).toHaveProperty('percentage', 20); // 200 / 1000 * 100
            expect(result[1]).toHaveProperty('category', 'Housing');
            expect(result[1]).toHaveProperty('amount', 800);
            expect(result[1]).toHaveProperty('percentage', 80); // 800 / 1000 * 100

            // Verify Prisma was called correctly
            expect(mockGroupBy).toHaveBeenCalledWith({
                by: ['category'],
                where: {
                    userId: 'user123',
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: {
                    amount: true,
                },
            });
        });
    });

    describe('getSpendingPatternAnalysis', () => {
        it('should return spending pattern analysis with trends', async () => {
            // Mock the Prisma response
            const mockFindMany = prisma.expense.findMany as any;
            mockFindMany.mockResolvedValue([
                { amount: 100, category: 'Food & Dining', date: new Date('2023-01-15') },
                { amount: 150, category: 'Food & Dining', date: new Date('2023-02-15') },
                { amount: 200, category: 'Housing', date: new Date('2023-01-10') },
                { amount: 200, category: 'Housing', date: new Date('2023-02-10') },
                { amount: 200, category: 'Housing', date: new Date('2023-03-10') },
            ]);

            const result = await getSpendingPatternAnalysis('user123', 3);

            // Verify the result structure
            expect(result).toHaveProperty('monthLabels');
            expect(result).toHaveProperty('categories');
            expect(result.monthLabels).toHaveLength(3);
            expect(result.categories.length).toBeGreaterThan(0);

            // Find the Food & Dining category
            const foodCategory = result.categories.find((c: any) => c.category === 'Food & Dining');
            expect(foodCategory).toBeDefined();
            expect(foodCategory.total).toBe(250); // 100 + 150
            expect(foodCategory.trend).toHaveLength(3);

            // Verify Prisma was called correctly
            expect(mockFindMany).toHaveBeenCalled();
        });
    });

    describe('generateMonthlyReport', () => {
        it('should generate a monthly report with all required sections', async () => {
            // Mock the Prisma responses
            const mockExpenseFindMany = prisma.expense.findMany as any;
            mockExpenseFindMany.mockResolvedValue([
                { id: 'exp1', amount: 100, category: 'Food & Dining', date: new Date('2023-01-15'), description: 'Groceries' },
                { id: 'exp2', amount: 200, category: 'Housing', date: new Date('2023-01-10'), description: 'Rent' },
            ]);

            const mockIncomeFindMany = prisma.income.findMany as any;
            mockIncomeFindMany.mockResolvedValue([
                { id: 'inc1', amount: 1000, source: 'Salary', date: new Date('2023-01-01'), description: 'Monthly salary' },
            ]);

            const mockBudgetFindMany = prisma.budget.findMany as any;
            mockBudgetFindMany.mockResolvedValue([
                { id: 'bud1', category: 'Food & Dining', limit: 150, period: 'MONTHLY' },
                { id: 'bud2', category: 'Housing', limit: 500, period: 'MONTHLY' },
            ]);

            const result = await generateMonthlyReport('user123', 0, 2023); // January 2023

            // Verify the result structure
            expect(result).toHaveProperty('period');
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('categories');
            expect(result).toHaveProperty('budgets');
            expect(result).toHaveProperty('transactions');

            // Check summary calculations
            expect(result.summary.totalIncome).toBe(1000);
            expect(result.summary.totalExpenses).toBe(300); // 100 + 200
            expect(result.summary.netSavings).toBe(700); // 1000 - 300
            expect(result.summary.savingsRate).toBe(70); // (1000 - 300) / 1000 * 100

            // Check budget status
            expect(result.budgets).toHaveLength(2);
            const foodBudget = result.budgets.find((b: any) => b.category === 'Food & Dining');
            expect(foodBudget).toBeDefined();
            expect(foodBudget.spent).toBe(100);
            expect(foodBudget.remaining).toBe(50); // 150 - 100
            expect(foodBudget.isOverBudget).toBe(false);

            // Verify Prisma was called correctly
            expect(mockExpenseFindMany).toHaveBeenCalled();
            expect(mockIncomeFindMany).toHaveBeenCalled();
            expect(mockBudgetFindMany).toHaveBeenCalled();
        });
    });

    describe('generateYearlyReport', () => {
        it('should generate a yearly report with monthly breakdown', async () => {
            // Mock the Prisma responses
            const mockExpenseAggregate = prisma.expense.aggregate as any;
            mockExpenseAggregate.mockResolvedValue({
                _sum: {
                    amount: 300,
                },
            });

            const mockIncomeAggregate = prisma.income.aggregate as any;
            mockIncomeAggregate.mockResolvedValue({
                _sum: {
                    amount: 1000,
                },
            });

            const mockExpenseGroupBy = prisma.expense.groupBy as any;
            mockExpenseGroupBy.mockResolvedValue([
                { category: 'Food & Dining', _sum: { amount: 1200 } },
                { category: 'Housing', _sum: { amount: 2400 } },
            ]);

            const result = await generateYearlyReport('user123', 2023);

            // Verify the result structure
            expect(result).toHaveProperty('year', 2023);
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('monthly');
            expect(result).toHaveProperty('categories');

            // Check monthly data
            expect(result.monthly).toHaveLength(12);
            expect(result.monthly[0]).toHaveProperty('month');
            expect(result.monthly[0]).toHaveProperty('expenses');
            expect(result.monthly[0]).toHaveProperty('income');
            expect(result.monthly[0]).toHaveProperty('savings');

            // Check category breakdown
            expect(result.categories).toHaveLength(2);
            expect(result.categories[0]).toHaveProperty('category');
            expect(result.categories[0]).toHaveProperty('amount');
            expect(result.categories[0]).toHaveProperty('percentage');

            // Verify Prisma was called correctly
            expect(mockExpenseAggregate).toHaveBeenCalledTimes(12);
            expect(mockIncomeAggregate).toHaveBeenCalledTimes(12);
            expect(mockExpenseGroupBy).toHaveBeenCalled();
        });
    });
});