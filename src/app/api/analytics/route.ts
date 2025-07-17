import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';

/**
 * GET /api/analytics
 * Retrieves analytics data for the current user
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
        const period = url.searchParams.get('period') || 'month';
        const category = url.searchParams.get('category') || null;

        // Determine date range based on period
        let startDate: Date;
        let endDate: Date;
        const now = new Date();

        switch (period) {
            case 'year':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                break;
            case 'quarter':
                startDate = subMonths(now, 3);
                endDate = now;
                break;
            case 'week':
                const day = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                break;
            case 'month':
            default:
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
        }

        // Build the where clause for expenses
        const expenseWhere: any = {
            userId: user.id,
            date: {
                gte: startDate,
                lte: endDate,
            },
        };

        // Add category filter if provided
        if (category) {
            expenseWhere.category = category;
        }

        // Get total expenses for the period
        const totalExpenses = await prisma.expense.aggregate({
            where: expenseWhere,
            _sum: {
                amount: true,
            },
        });

        // Get expenses by category
        const expensesByCategory = await prisma.expense.groupBy({
            by: ['category'],
            where: expenseWhere,
            _sum: {
                amount: true,
            },
        });

        // Get expenses by date for trend analysis
        const expensesByDate = await prisma.expense.groupBy({
            by: ['date'],
            where: expenseWhere,
            _sum: {
                amount: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        // Format expenses by date for chart display
        const trendData = expensesByDate.map(item => ({
            date: format(item.date, 'yyyy-MM-dd'),
            amount: parseFloat(item._sum.amount?.toString() || '0'),
        }));

        // Get income data for the period
        const incomeWhere = {
            userId: user.id,
            date: {
                gte: startDate,
                lte: endDate,
            },
        };

        const totalIncome = await prisma.income.aggregate({
            where: incomeWhere,
            _sum: {
                amount: true,
            },
        });

        // Get income by category
        const incomeByCategory = await prisma.income.groupBy({
            by: ['category'],
            where: incomeWhere,
            _sum: {
                amount: true,
            },
        });

        // Calculate savings rate
        const totalIncomeValue = parseFloat(totalIncome._sum.amount?.toString() || '0');
        const totalExpensesValue = parseFloat(totalExpenses._sum.amount?.toString() || '0');
        const savings = totalIncomeValue - totalExpensesValue;
        const savingsRate = totalIncomeValue > 0 ? (savings / totalIncomeValue) * 100 : 0;

        // Get budget status
        const budgets = await prisma.budget.findMany({
            where: {
                userId: user.id,
            },
        });

        // Format the response
        return NextResponse.json({
            period: {
                start: startDate,
                end: endDate,
                name: period,
            },
            income: {
                total: totalIncomeValue,
                byCategory: incomeByCategory.map(item => ({
                    category: item.category,
                    amount: parseFloat(item._sum.amount?.toString() || '0'),
                })),
            },
            expenses: {
                total: totalExpensesValue,
                byCategory: expensesByCategory.map(item => ({
                    category: item.category,
                    amount: parseFloat(item._sum.amount?.toString() || '0'),
                })),
                trend: trendData,
            },
            savings: {
                amount: savings,
                rate: savingsRate,
            },
            budgets: budgets.length,
        });
    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics data' },
            { status: 500 }
        );
    }
}