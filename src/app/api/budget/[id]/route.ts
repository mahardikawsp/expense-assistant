import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { BUDGET_PERIODS, EXPENSE_CATEGORIES } from '@/lib/db-utils';

// Budget update schema
const budgetUpdateSchema = z.object({
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

// GET handler to fetch a specific budget
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Get user session
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Fetch budget from database
        const budget = await prisma.budget.findUnique({
            where: {
                id,
            },
        });

        // Check if budget exists and belongs to the current user
        if (!budget) {
            return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
        }

        if (budget.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(budget);
    } catch (error) {
        console.error('Error fetching budget:', error);
        return NextResponse.json(
            { error: 'Failed to fetch budget' },
            { status: 500 }
        );
    }
}

// PUT handler to update a budget
export async function PUT(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Get user session
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Fetch budget to update
        const existingBudget = await prisma.budget.findUnique({
            where: {
                id,
            },
        });

        // Check if budget exists and belongs to the current user
        if (!existingBudget) {
            return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
        }

        if (existingBudget.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Parse and validate request body
        const body = await _request.json();
        const validationResult = budgetUpdateSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid budget data', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { category, limit, period, startDate, endDate } = validationResult.data;

        // Check for duplicate budget (same category and period, different ID)
        if (category !== existingBudget.category || period !== existingBudget.period) {
            const duplicateBudget = await prisma.budget.findFirst({
                where: {
                    userId: session.user.id,
                    category,
                    period: period as any,
                    id: { not: id },
                },
            });

            if (duplicateBudget) {
                return NextResponse.json(
                    { error: `A ${period.toLowerCase()} budget for ${category} already exists` },
                    { status: 409 }
                );
            }
        }

        // Update budget
        const updatedBudget = await prisma.budget.update({
            where: {
                id,
            },
            data: {
                category,
                limit,
                period: period as any,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
            },
        });

        return NextResponse.json(updatedBudget);
    } catch (error) {
        console.error('Error updating budget:', error);
        return NextResponse.json(
            { error: 'Failed to update budget' },
            { status: 500 }
        );
    }
}

// DELETE handler to remove a budget
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Get user session
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Fetch budget to delete
        const budget = await prisma.budget.findUnique({
            where: {
                id,
            },
        });

        // Check if budget exists and belongs to the current user
        if (!budget) {
            return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
        }

        if (budget.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete budget
        await prisma.budget.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting budget:', error);
        return NextResponse.json(
            { error: 'Failed to delete budget' },
            { status: 500 }
        );
    }
}