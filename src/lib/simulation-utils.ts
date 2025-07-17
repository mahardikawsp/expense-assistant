import { Budget, Expense, SimulatedExpense } from '@/types';
import { calculateBudgetUsage, getCurrentBudgetPeriod } from './budget-utils';
import { prisma } from './prisma';

/**
 * Utility functions for simulation management
 */

/**
 * Analyze the impact of simulated expenses on budgets
 * @param simulatedExpenses Array of simulated expenses
 * @param userId User ID
 * @returns Promise with budget status information
 */
export async function analyzeBudgetImpact(
    simulatedExpenses: SimulatedExpense[],
    userId: string
) {
    // Get unique categories from simulated expenses
    const categories = [...new Set(simulatedExpenses.map(e => e.category))];

    // Get all active budgets for these categories
    const budgets = await prisma.budget.findMany({
        where: {
            userId,
            category: {
                in: categories,
            },
        },
    });

    if (budgets.length === 0) {
        return [];
    }

    const budgetStatus = [];

    for (const budget of budgets) {
        // Convert Prisma budget to our Budget type
        const typedBudget: Budget = {
            id: budget.id,
            userId: budget.userId,
            category: budget.category,
            limit: parseFloat(budget.limit.toString()),
            period: budget.period.toLowerCase() as 'monthly' | 'weekly' | 'daily',
            startDate: budget.startDate,
            endDate: budget.endDate || undefined,
            createdAt: budget.createdAt,
            updatedAt: budget.updatedAt
        };

        // Get current period for this budget
        const { startDate, endDate } = getCurrentBudgetPeriod(typedBudget);

        // Get all actual expenses in this category and period
        const actualExpenses = await prisma.expense.findMany({
            where: {
                userId,
                category: budget.category,
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
        });

        // Convert Prisma expenses to our Expense type
        const typedActualExpenses: Expense[] = actualExpenses.map(exp => ({
            id: exp.id,
            userId: exp.userId,
            amount: parseFloat(exp.amount.toString()),
            description: exp.description,
            date: exp.date,
            category: exp.category,
            createdAt: exp.createdAt,
            updatedAt: exp.updatedAt
        }));

        // Create simulated expenses for this category
        const categorySimulatedExpenses = simulatedExpenses
            .filter(e => e.category === budget.category)
            .map((e, index) => ({
                id: `sim-${index}`,
                userId,
                amount: parseFloat(e.amount.toString()),
                description: 'Simulated: ' + (e.description || 'Expense'),
                date: new Date(e.date),
                category: e.category,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

        // Combine actual and simulated expenses
        const combinedExpenses = [...typedActualExpenses, ...categorySimulatedExpenses];

        // Calculate budget usage with combined expenses
        const usage = calculateBudgetUsage(typedBudget, combinedExpenses);

        // Add budget object to the usage result
        budgetStatus.push({
            ...usage,
            budget: typedBudget,
        });
    }

    return budgetStatus;
}

/**
 * Convert a simulation to actual expenses
 * @param simulationId Simulation ID
 * @param userId User ID
 * @returns Promise with created expenses
 */
export async function convertSimulationToExpenses(simulationId: string, userId: string) {
    // Get the simulation with expenses
    const simulation = await prisma.simulation.findUnique({
        where: {
            id: simulationId,
            userId,
        },
        include: {
            expenses: true,
        },
    });

    if (!simulation) {
        throw new Error('Simulation not found');
    }

    if (simulation.expenses.length === 0) {
        throw new Error('Simulation has no expenses to convert');
    }

    // Convert simulated expenses to actual expenses
    const createdExpenses = [];

    for (const simExpense of simulation.expenses) {
        // Create actual expense
        const expense = await prisma.expense.create({
            data: {
                userId,
                amount: simExpense.amount,
                description: simExpense.description,
                category: simExpense.category,
                date: simExpense.date,
            },
        });

        createdExpenses.push(expense);
    }

    return createdExpenses;
}