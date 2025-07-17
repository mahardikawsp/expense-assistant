import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { BUDGET_PERIODS, EXPENSE_CATEGORIES } from '@/lib/db-utils';

// Budget creation schema
const budgetSchema = z.object({
    category: z.string().refine(
        (val) => EXPENSE_CATEGORIES.includes(val),
        { message: 'Invalid category' }
    ),
    limit: z.number().positive({ message: 'Budget limit must be a positive number' }),
    period: z.string().refine(
        (val) => BUDGET_PERIODS.includes(val as any),
        { message: 'Invalid budget period' }
    ),
    startDate: z.string().refine(
        (val) => !isNaN(Date.parse(val)),
        { message: 'Invalid start date' }
    ),
    endDate: z.string().optional().refine(
        (val) => !val || !isNaN(Date.parse(val)),
        { message: 'Invalid end date' }
    ),
});

// GET handler to fetch all budgets for the current user
export async function GET(request: NextRequest) {
    try {
        // Get user session
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const period = searchParams.get('period');

        // Build query filters
        const filters: any = {
            userId: session.user.id,
        };

        if (category) {
            filters.category = category;
        }

        if (period) {
            filters.period = period;
        }

        // Fetch budgets from database
        const budgets = await prisma.budget.findMany({
            where: filters,
            orderBy: [
                { category: 'asc' },
                { period: 'asc' },
            ],
        });

        return NextResponse.json(budgets);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch budgets' },
            { status: 500 }
        );
    }
}

// POST handler to create a new budget
export async function POST(request: NextRequest) {
    try {
        // Get user session
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = budgetSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid budget data', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { category, limit, period, startDate, endDate } = validationResult.data;

        // Check if a budget for this category and period already exists
        const existingBudget = await prisma.budget.findFirst({
            where: {
                userId: session.user.id,
                category,
                period: period as any,
            },
        });

        if (existingBudget) {
            return NextResponse.json(
                { error: `A ${period.toLowerCase()} budget for ${category} already exists` },
                { status: 409 }
            );
        }

        // Create new budget
        const budget = await prisma.budget.create({
            data: {
                userId: session.user.id,
                category,
                limit,
                period: period as any,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
            },
        });

        return NextResponse.json(budget, { status: 201 });
    } catch (error) {
        console.error('Error creating budget:', error);
        return NextResponse.json(
            { error: 'Failed to create budget' },
            { status: 500 }
        );
    }
}