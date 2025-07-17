import { Budget, Expense } from '@/types';
import { addDays, addMonths, addWeeks, isAfter, isBefore, isWithinInterval } from 'date-fns';

/**
 * Utility functions for budget calculations and management
 */

/**
 * Check if a budget is currently active
 * @param budget The budget to check
 * @returns boolean indicating if the budget is active
 */
export function isBudgetActive(budget: Budget): boolean {
    const now = new Date();
    const startDate = new Date(budget.startDate);

    if (budget.endDate) {
        const endDate = new Date(budget.endDate);
        return isWithinInterval(now, { start: startDate, end: endDate });
    }

    return isAfter(now, startDate) || now.getTime() === startDate.getTime();
}

/**
 * Calculate the current period's start and end dates for a budget
 * @param budget The budget to calculate period for
 * @returns Object containing start and end dates for the current period
 */
export function getCurrentBudgetPeriod(budget: Budget): { startDate: Date; endDate: Date } {
    const now = new Date();
    const budgetStart = new Date(budget.startDate);

    // For inactive budgets that haven't started yet, return the first period
    if (isBefore(now, budgetStart)) {
        switch (budget.period.toLowerCase()) {
            case 'daily':
                return { startDate: budgetStart, endDate: addDays(budgetStart, 1) };
            case 'weekly':
                return { startDate: budgetStart, endDate: addWeeks(budgetStart, 1) };
            case 'monthly':
                return { startDate: budgetStart, endDate: addMonths(budgetStart, 1) };
            default:
                return { startDate: budgetStart, endDate: addMonths(budgetStart, 1) };
        }
    }

    // For active budgets, calculate the current period
    // Initialize with default values to avoid "used before assigned" errors
    let periodStart = new Date();
    let periodEnd = new Date();

    switch (budget.period.toLowerCase()) {
        case 'daily':
            // Current day
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            periodEnd = addDays(periodStart, 1);
            break;

        case 'weekly':
            // Calculate days since budget start
            const daysSinceStart = Math.floor((now.getTime() - budgetStart.getTime()) / (1000 * 60 * 60 * 24));
            const weeksSinceStart = Math.floor(daysSinceStart / 7);

            // Calculate current week's start date
            periodStart = addWeeks(budgetStart, weeksSinceStart);
            periodEnd = addWeeks(periodStart, 1);
            break;

        case 'monthly':
            // Calculate months since budget start
            const monthsSinceStart =
                (now.getFullYear() - budgetStart.getFullYear()) * 12 +
                (now.getMonth() - budgetStart.getMonth());

            // Calculate current month's start and end dates
            periodStart = addMonths(budgetStart, monthsSinceStart);
            periodEnd = addMonths(periodStart, 1);
            break;

        default:
            // Default to monthly if period is not recognized
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodEnd = addMonths(periodStart, 1);
            break;
    }

    // If budget has an end date and period end is after budget end, adjust period end
    if (budget.endDate && isAfter(periodEnd, new Date(budget.endDate))) {
        periodEnd = new Date(budget.endDate);
    }

    return { startDate: periodStart, endDate: periodEnd };
}

/**
 * Calculate budget usage for a specific budget
 * @param budget The budget to calculate usage for
 * @param expenses List of expenses to consider
 * @returns Object with budget usage statistics
 */
export function calculateBudgetUsage(budget: Budget, expenses: Expense[]) {
    // Get current period dates
    const { startDate, endDate } = getCurrentBudgetPeriod(budget);

    // Filter expenses by category and date range
    const periodExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return (
            expense.category === budget.category &&
            isWithinInterval(expenseDate, { start: startDate, end: endDate })
        );
    });

    // Calculate total spent
    const spent = periodExpenses.reduce((total, expense) => total + parseFloat(expense.amount.toString()), 0);

    // Calculate percentage used
    const limit = parseFloat(budget.limit.toString());
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
        spent,
        limit,
        remaining: limit - spent,
        percentage: Math.min(percentage, 100), // Cap at 100% for display purposes
        isOverBudget: spent > limit,
        isActive: isBudgetActive(budget),
        periodStart: startDate,
        periodEnd: endDate,
        expenses: periodExpenses,
    };
}

/**
 * Check if adding a new expense would exceed any budget limits
 * @param expense The expense to check
 * @param budgets List of budgets to check against
 * @returns Object with budget warning information or null if no warnings
 */
export function checkBudgetWarnings(expense: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, budgets: Budget[]) {
    // Find matching budget for this category
    const matchingBudgets = budgets.filter(budget =>
        budget.category === expense.category && isBudgetActive(budget)
    );

    if (matchingBudgets.length === 0) {
        return null; // No active budgets for this category
    }

    const warnings = matchingBudgets.map(budget => {
        // Get current period expenses
        const { startDate, endDate } = getCurrentBudgetPeriod(budget);

        // Simulate adding this expense
        const expenseAmount = parseFloat(expense.amount.toString());
        const limit = parseFloat(budget.limit.toString());

        // Calculate current spending for this period and category
        // This would typically come from a database query in a real implementation
        // For this example, we'll assume we have the current spent amount
        const currentSpent = 0; // This should be replaced with actual data

        const newTotal = currentSpent + expenseAmount;
        const newPercentage = (newTotal / limit) * 100;

        // Check if this would exceed or approach the budget
        if (newTotal > limit) {
            return {
                budget,
                type: 'exceeded',
                amount: newTotal - limit,
                percentage: newPercentage,
            };
        } else if (newPercentage >= 80) {
            return {
                budget,
                type: 'approaching',
                amount: limit - newTotal,
                percentage: newPercentage,
            };
        }

        return null;
    }).filter(Boolean);

    return warnings.length > 0 ? warnings : null;
}

/**
 * Format currency for display
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}