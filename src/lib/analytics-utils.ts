import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { prisma } from './prisma';
import { EXPENSE_CATEGORIES } from './db-utils';

/**
 * Utility functions for analytics and reporting
 */

/**
 * Get expense trend data for a specific time period
 * @param userId User ID
 * @param months Number of months to include
 * @returns Promise with trend data
 */
export async function getExpenseTrend(userId: string, months = 6) {
    const now = new Date();
    const data = [];

    for (let i = 0; i < months; i++) {
        const targetDate = subMonths(now, i);
        const startDate = startOfMonth(targetDate);
        const endDate = endOfMonth(targetDate);
        const monthName = format(startDate, 'MMM yyyy');

        const expenses = await prisma.expense.aggregate({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        data.unshift({
            month: monthName,
            amount: parseFloat(expenses._sum.amount?.toString() || '0'),
        });
    }

    return data;
}

/**
 * Get category breakdown for a specific time period
 * @param userId User ID
 * @param startDate Start date
 * @param endDate End date
 * @returns Promise with category breakdown data
 */
export async function getCategoryBreakdown(userId: string, startDate: Date, endDate: Date) {
    const expensesByCategory = await prisma.expense.groupBy({
        by: ['category'],
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        _sum: {
            amount: true,
        },
    });

    // Calculate total for percentages
    const total = expensesByCategory.reduce(
        (sum, item) => sum + parseFloat(item._sum.amount?.toString() || '0'),
        0
    );

    // Format data with percentages
    return expensesByCategory.map(item => {
        const amount = parseFloat(item._sum.amount?.toString() || '0');
        return {
            category: item.category,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0,
        };
    });
}

/**
 * Get spending pattern analysis
 * @param userId User ID
 * @param months Number of months to analyze
 * @returns Promise with spending pattern analysis
 */
export async function getSpendingPatternAnalysis(userId: string, months = 3) {
    const now = new Date();
    const startDate = subMonths(now, months);

    // Get all expenses for the period
    const expenses = await prisma.expense.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: now,
            },
        },
        select: {
            amount: true,
            category: true,
            date: true,
        },
        orderBy: {
            date: 'asc',
        },
    });

    // Initialize category data
    const categoryData: Record<string, { total: number; trend: number[] }> = {};
    EXPENSE_CATEGORIES.forEach(category => {
        categoryData[category] = { total: 0, trend: Array(months).fill(0) };
    });

    // Process expenses
    expenses.forEach(expense => {
        const amount = parseFloat(expense.amount.toString());
        const category = expense.category;
        const expenseDate = new Date(expense.date);
        const monthIndex = months - 1 - Math.floor((now.getTime() - expenseDate.getTime()) / (30 * 24 * 60 * 60 * 1000));

        if (monthIndex >= 0 && monthIndex < months) {
            if (!categoryData[category]) {
                categoryData[category] = { total: 0, trend: Array(months).fill(0) };
            }
            categoryData[category].total += amount;
            categoryData[category].trend[monthIndex] += amount;
        }
    });

    // Generate month labels
    const monthLabels = [];
    for (let i = 0; i < months; i++) {
        const targetDate = subMonths(now, months - 1 - i);
        monthLabels.push(format(targetDate, 'MMM'));
    }

    // Format results
    return {
        monthLabels,
        categories: Object.entries(categoryData)
            .filter(([_, data]) => data.total > 0)
            .map(([category, data]) => ({
                category,
                total: data.total,
                trend: data.trend,
            }))
            .sort((a, b) => b.total - a.total),
    };
}

/**
 * Generate a monthly report
 * @param userId User ID
 * @param month Month to generate report for (0-11)
 * @param year Year to generate report for
 * @returns Promise with monthly report data
 */
export async function generateMonthlyReport(userId: string, month: number, year: number) {
    const startDate = new Date(year, month, 1);
    const endDate = endOfMonth(startDate);

    // Get expenses
    const expenses = await prisma.expense.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: {
            date: 'asc',
        },
    });

    // Get income
    const income = await prisma.income.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: {
            date: 'asc',
        },
    });

    // Get budgets
    const budgets = await prisma.budget.findMany({
        where: {
            userId,
        },
    });

    // Calculate totals
    const totalExpenses = expenses.reduce(
        (sum, expense) => sum + parseFloat(expense.amount.toString()),
        0
    );

    const totalIncome = income.reduce(
        (sum, inc) => sum + parseFloat(inc.amount.toString()),
        0
    );

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(expense => {
        const amount = parseFloat(expense.amount.toString());
        const category = expense.category;
        expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
    });

    // Format category data
    const categoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }));

    // Check budget status
    const budgetStatus = budgets.map(budget => {
        const categoryExpenses = expenses.filter(e => e.category === budget.category);
        const spent = categoryExpenses.reduce(
            (sum, expense) => sum + parseFloat(expense.amount.toString()),
            0
        );
        const limit = parseFloat(budget.limit.toString());

        return {
            category: budget.category,
            limit,
            spent,
            remaining: limit - spent,
            percentage: limit > 0 ? (spent / limit) * 100 : 0,
            isOverBudget: spent > limit,
        };
    });

    return {
        period: {
            month: format(startDate, 'MMMM'),
            year: format(startDate, 'yyyy'),
            startDate,
            endDate,
        },
        summary: {
            totalIncome,
            totalExpenses,
            netSavings: totalIncome - totalExpenses,
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        },
        categories: categoryData,
        budgets: budgetStatus,
        transactions: {
            expenses: expenses.map(e => ({
                id: e.id,
                date: e.date,
                category: e.category,
                description: e.description,
                amount: parseFloat(e.amount.toString()),
            })),
            income: income.map(i => ({
                id: i.id,
                date: i.date,
                source: i.source,
                description: i.description || '',
                amount: parseFloat(i.amount.toString()),
            })),
        },
    };
}

/**
 * Generate a yearly report
 * @param userId User ID
 * @param year Year to generate report for
 * @returns Promise with yearly report data
 */
export async function generateYearlyReport(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get monthly data
    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = endOfMonth(monthStart);

        // Get expenses for the month
        const expenses = await prisma.expense.aggregate({
            where: {
                userId,
                date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // Get income for the month
        const income = await prisma.income.aggregate({
            where: {
                userId,
                date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
            _sum: {
                amount: true,
            },
        });

        const totalExpenses = parseFloat(expenses._sum.amount?.toString() || '0');
        const totalIncome = parseFloat(income._sum.amount?.toString() || '0');

        monthlyData.push({
            month: format(monthStart, 'MMM'),
            expenses: totalExpenses,
            income: totalIncome,
            savings: totalIncome - totalExpenses,
        });
    }

    // Get category breakdown for the year
    const expensesByCategory = await prisma.expense.groupBy({
        by: ['category'],
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        _sum: {
            amount: true,
        },
    });

    // Calculate yearly totals
    const yearlyExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0);
    const yearlyIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
    const yearlySavings = yearlyIncome - yearlyExpenses;

    return {
        year,
        summary: {
            totalIncome: yearlyIncome,
            totalExpenses: yearlyExpenses,
            netSavings: yearlySavings,
            savingsRate: yearlyIncome > 0 ? (yearlySavings / yearlyIncome) * 100 : 0,
        },
        monthly: monthlyData,
        categories: expensesByCategory.map(item => ({
            category: item.category,
            amount: parseFloat(item._sum.amount?.toString() || '0'),
            percentage: yearlyExpenses > 0
                ? (parseFloat(item._sum.amount?.toString() || '0') / yearlyExpenses) * 100
                : 0,
        })),
    };
}