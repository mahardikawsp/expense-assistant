import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeBudgetImpact, convertSimulationToExpenses } from '../simulation-utils';
import { prisma } from '../prisma';
import { calculateBudgetUsage, getCurrentBudgetPeriod } from '../budget-utils';

// Mock dependencies
vi.mock('../prisma', () => ({
    prisma: {
        budget: {
            findMany: vi.fn(),
        },
        expense: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
        simulation: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../budget-utils', () => ({
    calculateBudgetUsage: vi.fn(),
    getCurrentBudgetPeriod: vi.fn(),
}));

describe('Simulation Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('analyzeBudgetImpact', () => {
        it('should return empty array when no budgets are found', async () => {
            // Mock budget.findMany to return empty array
            (prisma.budget.findMany as any).mockResolvedValue([]);

            const simulatedExpenses = [
                {
                    id: 'sim-1',
                    simulationId: 'simulation-1',
                    amount: 100,
                    description: 'Test expense',
                    category: 'Food',
                    date: new Date(),
                },
            ];

            const result = await analyzeBudgetImpact(simulatedExpenses, 'user-1');

            expect(result).toEqual([]);
            expect(prisma.budget.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    category: {
                        in: ['Food'],
                    },
                },
            });
        });

        it('should analyze budget impact correctly', async () => {
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
                    id: 'expense-1',
                    userId: 'user-1',
                    amount: '150.00',
                    description: 'Existing expense',
                    date: new Date('2023-01-15'),
                    category: 'Food',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            // Mock calculateBudgetUsage
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

            const simulatedExpenses = [
                {
                    id: 'sim-1',
                    simulationId: 'simulation-1',
                    amount: 100,
                    description: 'Test expense',
                    category: 'Food',
                    date: new Date('2023-01-20'),
                },
            ];

            const result = await analyzeBudgetImpact(simulatedExpenses, 'user-1');

            expect(result).toHaveLength(1);
            expect(result[0].isOverBudget).toBe(true);
            expect(result[0].percentage).toBe(125);
            expect(calculateBudgetUsage).toHaveBeenCalled();
        });

        it('should handle multiple budget categories', async () => {
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
                {
                    id: 'budget-2',
                    userId: 'user-1',
                    category: 'Entertainment',
                    limit: '100.00',
                    period: 'MONTHLY',
                    startDate: new Date('2023-01-01'),
                    endDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            ]);

            // Mock getCurrentBudgetPeriod
            (getCurrentBudgetPeriod as any).mockReturnValue({
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-02-01'),
            });

            // Mock expense.findMany for Food category
            (prisma.expense.findMany as any)
                .mockResolvedValueOnce([
                    {
                        id: 'expense-1',
                        userId: 'user-1',
                        amount: '150.00',
                        description: 'Existing food expense',
                        date: new Date('2023-01-15'),
                        category: 'Food',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ])
                // Mock expense.findMany for Entertainment category
                .mockResolvedValueOnce([
                    {
                        id: 'expense-2',
                        userId: 'user-1',
                        amount: '50.00',
                        description: 'Existing entertainment expense',
                        date: new Date('2023-01-10'),
                        category: 'Entertainment',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ]);

            // Mock calculateBudgetUsage
            (calculateBudgetUsage as any)
                .mockReturnValueOnce({
                    spent: 250,
                    limit: 200,
                    remaining: -50,
                    percentage: 125,
                    isOverBudget: true,
                    isActive: true,
                    periodStart: new Date('2023-01-01'),
                    periodEnd: new Date('2023-02-01'),
                    expenses: [],
                })
                .mockReturnValueOnce({
                    spent: 80,
                    limit: 100,
                    remaining: 20,
                    percentage: 80,
                    isOverBudget: false,
                    isActive: true,
                    periodStart: new Date('2023-01-01'),
                    periodEnd: new Date('2023-02-01'),
                    expenses: [],
                });

            const simulatedExpenses = [
                {
                    id: 'sim-1',
                    simulationId: 'simulation-1',
                    amount: 100,
                    description: 'Test food expense',
                    category: 'Food',
                    date: new Date('2023-01-20'),
                },
                {
                    id: 'sim-2',
                    simulationId: 'simulation-1',
                    amount: 30,
                    description: 'Test entertainment expense',
                    category: 'Entertainment',
                    date: new Date('2023-01-25'),
                }
            ];

            const result = await analyzeBudgetImpact(simulatedExpenses, 'user-1');

            expect(result).toHaveLength(2);
            expect(result[0].isOverBudget).toBe(true);
            expect(result[1].isOverBudget).toBe(false);
            expect(calculateBudgetUsage).toHaveBeenCalledTimes(2);
        });
    });

    describe('convertSimulationToExpenses', () => {
        it('should throw error if simulation not found', async () => {
            // Mock simulation.findUnique to return null
            (prisma.simulation.findUnique as any).mockResolvedValue(null);

            await expect(convertSimulationToExpenses('simulation-1', 'user-1')).rejects.toThrow(
                'Simulation not found'
            );
        });

        it('should throw error if simulation has no expenses', async () => {
            // Mock simulation.findUnique to return simulation with no expenses
            (prisma.simulation.findUnique as any).mockResolvedValue({
                id: 'simulation-1',
                userId: 'user-1',
                name: 'Test Simulation',
                createdAt: new Date(),
                expenses: [],
            });

            await expect(convertSimulationToExpenses('simulation-1', 'user-1')).rejects.toThrow(
                'Simulation has no expenses to convert'
            );
        });

        it('should convert simulated expenses to actual expenses', async () => {
            // Mock simulation.findUnique
            (prisma.simulation.findUnique as any).mockResolvedValue({
                id: 'simulation-1',
                userId: 'user-1',
                name: 'Test Simulation',
                createdAt: new Date(),
                expenses: [
                    {
                        id: 'sim-expense-1',
                        simulationId: 'simulation-1',
                        amount: '100.00',
                        description: 'Test expense 1',
                        category: 'Food',
                        date: new Date('2023-01-15'),
                    },
                    {
                        id: 'sim-expense-2',
                        simulationId: 'simulation-1',
                        amount: '50.00',
                        description: 'Test expense 2',
                        category: 'Transportation',
                        date: new Date('2023-01-16'),
                    },
                ],
            });

            // Mock expense.create
            (prisma.expense.create as any)
                .mockResolvedValueOnce({
                    id: 'expense-1',
                    userId: 'user-1',
                    amount: '100.00',
                    description: 'Test expense 1',
                    category: 'Food',
                    date: new Date('2023-01-15'),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .mockResolvedValueOnce({
                    id: 'expense-2',
                    userId: 'user-1',
                    amount: '50.00',
                    description: 'Test expense 2',
                    category: 'Transportation',
                    date: new Date('2023-01-16'),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

            const result = await convertSimulationToExpenses('simulation-1', 'user-1');

            expect(result).toHaveLength(2);
            expect(prisma.expense.create).toHaveBeenCalledTimes(2);
            expect(prisma.expense.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    amount: '100.00',
                    description: 'Test expense 1',
                    category: 'Food',
                    date: expect.any(Date),
                },
            });
            expect(prisma.expense.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    amount: '50.00',
                    description: 'Test expense 2',
                    category: 'Transportation',
                    date: expect.any(Date),
                },
            });
        });

        it('should handle decimal amounts correctly', async () => {
            // Mock simulation.findUnique
            (prisma.simulation.findUnique as any).mockResolvedValue({
                id: 'simulation-1',
                userId: 'user-1',
                name: 'Test Simulation',
                createdAt: new Date(),
                expenses: [
                    {
                        id: 'sim-expense-1',
                        simulationId: 'simulation-1',
                        amount: '99.99',
                        description: 'Test expense with decimal',
                        category: 'Food',
                        date: new Date('2023-01-15'),
                    }
                ],
            });

            // Mock expense.create
            (prisma.expense.create as any).mockResolvedValue({
                id: 'expense-1',
                userId: 'user-1',
                amount: '99.99',
                description: 'Test expense with decimal',
                category: 'Food',
                date: new Date('2023-01-15'),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await convertSimulationToExpenses('simulation-1', 'user-1');

            expect(result).toHaveLength(1);
            expect(prisma.expense.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    amount: '99.99',
                    description: 'Test expense with decimal',
                    category: 'Food',
                    date: expect.any(Date),
                },
            });
        });
    });
});