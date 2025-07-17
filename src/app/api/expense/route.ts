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

// GET handler to fetch all expense entries for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = request.nextUrl;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 50;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : 1;
        const category = searchParams.get('category');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const sortBy = searchParams.get('sortBy') || 'date';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build filter conditions
        const where: any = {
            userId: session.user.id,
        };

        if (category) {
            where.category = category;
        }

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        } else if (startDate) {
            where.date = {
                gte: new Date(startDate),
            };
        } else if (endDate) {
            where.date = {
                lte: new Date(endDate),
            };
        }

        // Get total count for pagination
        const total = await prisma.expense.count({ where });

        // Get expense entries with pagination and sorting
        const expenses = await prisma.expense.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
        });

        // Calculate totals by category using Prisma's groupBy
        const categoryTotals = await prisma.expense.groupBy({
            by: ['category'],
            where,
            _sum: {
                amount: true,
            },
        });

        // Transform the result to match the expected format
        const formattedCategoryTotals = categoryTotals.map(item => ({
            category: item.category,
            total: Number(item._sum.amount) || 0,
        }));

        // Calculate overall total
        const overallTotal = await prisma.expense.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });

        return NextResponse.json({
            data: expenses,
            totals: {
                byCategory: formattedCategoryTotals,
                overall: overallTotal._sum.amount || 0,
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expense entries' },
            { status: 500 }
        );
    }
}

// POST handler to create a new expense entry
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Create new expense entry
        const expense = await prisma.expense.create({
            data: {
                userId: session.user.id,
                amount,
                description,
                date: new Date(date),
                category,
            },
        });

        // Check if this expense causes budget overrun and create notifications
        const { checkBudgetLimitsAndNotify } = await import('@/lib/notification-utils');
        // Convert Prisma expense to our Expense type to avoid type errors
        const typedExpense = {
            ...expense,
            amount: parseFloat(expense.amount.toString())
        };
        const { notifications } = await checkBudgetLimitsAndNotify(typedExpense, session.user.id);

        // Return the created expense along with any notifications
        return NextResponse.json({
            expense,
            notifications: notifications.length > 0 ? notifications : null
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json(
            { error: 'Failed to create expense entry' },
            { status: 500 }
        );
    }
}