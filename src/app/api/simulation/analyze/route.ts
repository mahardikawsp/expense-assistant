import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { analyzeBudgetImpact } from '@/lib/simulation-utils';

// Schema for budget analysis
const analyzeSchema = z.object({
    expenses: z.array(
        z.object({
            amount: z.string().or(z.number()).transform(val =>
                typeof val === 'string' ? parseFloat(val) : val
            ),
            description: z.string().optional(),
            category: z.string().min(1, 'Category is required'),
            date: z.string().min(1, 'Date is required'),
        })
    ).min(1, 'At least one expense is required'),
});

/**
 * POST /api/simulation/analyze
 * Analyze budget impact of simulated expenses
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();

        // Validate request body
        const validationResult = analyzeSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { expenses } = validationResult.data;

        // Convert to SimulatedExpense format
        const simulatedExpenses = expenses.map((expense, index) => ({
            id: `temp-${index}`,
            simulationId: 'temp',
            amount: expense.amount,
            description: expense.description || 'Simulated expense',
            category: expense.category,
            date: new Date(expense.date),
        }));

        // Analyze budget impact
        const budgetStatus = await analyzeBudgetImpact(simulatedExpenses, userId);

        if (budgetStatus.length === 0) {
            return NextResponse.json({
                budgetStatus: [],
                message: 'No active budgets found for the expense categories',
            });
        }

        return NextResponse.json({ budgetStatus });
    } catch (error) {
        console.error('Error analyzing budget impact:', error);
        return NextResponse.json(
            { error: 'Failed to analyze budget impact' },
            { status: 500 }
        );
    }
}