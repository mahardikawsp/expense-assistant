import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { EXPENSE_CATEGORIES } from '@/lib/db-utils';
import { prisma } from '@/lib/prisma';

// Schema for expense validation
const expenseSchema = z.object({
    amount: z.number().positive({ message: 'Amount must be a positive number' }),
    description: z.string().min(1, { message: 'Description is required' }),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
    }),
    category: z.string().refine((category) => EXPENSE_CATEGORIES.includes(category), {
        message: 'Invalid category',
    }),
});

// GET handler to fetch a specific expense entry
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get expense entry
        const expense = await prisma.expense.findUnique({
            where: { id },
        });

        // Check if expense exists and belongs to the user
        if (!expense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (expense.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Error fetching expense:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expense entry' },
            { status: 500 }
        );
    }
}

// PUT handler to update an expense entry
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check if expense exists and belongs to the user
        const existingExpense = await prisma.expense.findUnique({
            where: { id },
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (existingExpense.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = expenseSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { amount, description, date, category } = validationResult.data;

        // Update expense entry
        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: {
                amount,
                description,
                date: new Date(date),
                category,
            },
        });

        // Check if this expense update causes budget overrun and create notifications
        const { checkBudgetLimitsAndNotify } = await import('@/lib/notification-utils');
        // Convert Prisma expense to our Expense type to avoid type errors
        const typedExpense = {
            ...updatedExpense,
            amount: parseFloat(updatedExpense.amount.toString())
        };
        const { notifications } = await checkBudgetLimitsAndNotify(typedExpense, session.user.id);

        // Return the updated expense along with any notifications
        return NextResponse.json({
            expense: updatedExpense,
            notifications: notifications.length > 0 ? notifications : null
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        return NextResponse.json(
            { error: 'Failed to update expense entry' },
            { status: 500 }
        );
    }
}

// DELETE handler to remove an expense entry
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check if expense exists and belongs to the user
        const existingExpense = await prisma.expense.findUnique({
            where: { id },
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (existingExpense.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete expense entry
        await prisma.expense.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return NextResponse.json(
            { error: 'Failed to delete expense entry' },
            { status: 500 }
        );
    }
}