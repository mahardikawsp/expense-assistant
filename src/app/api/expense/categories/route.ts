import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/expense/categories
 * Get all unique expense categories for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get all unique categories from user's expenses
        const expenses = await prisma.expense.findMany({
            where: { userId },
            select: { category: true },
            distinct: ['category'],
        });

        // Extract categories
        const categories = expenses.map(expense => expense.category);

        // Add some default categories if the user doesn't have any expenses yet
        if (categories.length === 0) {
            return NextResponse.json({
                categories: [
                    'Food',
                    'Housing',
                    'Transportation',
                    'Entertainment',
                    'Healthcare',
                    'Utilities',
                    'Education',
                    'Shopping',
                    'Travel',
                    'Other'
                ]
            });
        }

        return NextResponse.json({ categories });
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expense categories' },
            { status: 500 }
        );
    }
}