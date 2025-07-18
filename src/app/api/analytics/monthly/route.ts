import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// Define types for our monthly data
interface CategoryExpense {
    category: string;
    amount: number;
}

interface MonthlyData {
    month: string;
    expenses: number;
    income: number;
    savings: number;
    savingsRate: number;
    categories: CategoryExpense[];
}

interface MonthlyComparisonData extends MonthlyData {
    expenseChange: number;
    incomeChange: number;
    savingsChange: number;
}

/**
 * GET /api/analytics/monthly
 * Retrieves monthly analytics data for comparison
 */
export async function GET(request: Request) {
    try {
        // Get the current user
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse query parameters
        const url = new URL(request.url);
        const monthsToCompare = parseInt(url.searchParams.get('months') || '6', 10);

        // Limit to reasonable range
        const months = Math.min(Math.max(monthsToCompare, 1), 12);

        const now = new Date();
        const monthlyData: MonthlyData[] = [];

        // Get data for each month
        for (let i = 0; i < months; i++) {
            const targetDate = subMonths(now, i);
            const startDate = startOfMonth(targetDate);
            const endDate = endOfMonth(targetDate);
            const monthName = format(startDate, 'MMM yyyy');

            // Get expenses for the month
            const expenses = await prisma.expense.aggregate({
                where: {
                    userId: user.id,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: {
                    amount: true,
                },
            });

            // Get income for the month
            const income = await prisma.income.aggregate({
                where: {
                    userId: user.id,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: {
                    amount: true,
                },
            });

            // Get expenses by category
            const expensesByCategory = await prisma.expense.groupBy({
                by: ['category'],
                where: {
                    userId: user.id,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: {
                    amount: true,
                },
            });

            // Calculate totals
            const totalExpenses = parseFloat(expenses._sum.amount?.toString() || '0');
            const totalIncome = parseFloat(income._sum.amount?.toString() || '0');
            const savings = totalIncome - totalExpenses;
            const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

            monthlyData.push({
                month: monthName,
                expenses: totalExpenses,
                income: totalIncome,
                savings,
                savingsRate,
                categories: expensesByCategory.map(item => ({
                    category: item.category,
                    amount: parseFloat(item._sum.amount?.toString() || '0'),
                })),
            });
        }

        // Calculate month-over-month changes
        const monthlyComparison: MonthlyComparisonData[] = monthlyData.map((month, index) => {
            if (index === monthlyData.length - 1) {
                return {
                    ...month,
                    expenseChange: 0,
                    incomeChange: 0,
                    savingsChange: 0,
                };
            }

            const nextMonth = monthlyData[index + 1];
            const expenseChange = nextMonth.expenses > 0
                ? ((month.expenses - nextMonth.expenses) / nextMonth.expenses) * 100
                : 0;
            const incomeChange = nextMonth.income > 0
                ? ((month.income - nextMonth.income) / nextMonth.income) * 100
                : 0;
            const savingsChange = nextMonth.savings > 0
                ? ((month.savings - nextMonth.savings) / nextMonth.savings) * 100
                : 0;

            return {
                ...month,
                expenseChange,
                incomeChange,
                savingsChange,
            };
        });

        return NextResponse.json({
            months: monthlyComparison,
        });
    } catch (error) {
        console.error('Monthly analytics API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch monthly analytics data' },
            { status: 500 }
        );
    }
}