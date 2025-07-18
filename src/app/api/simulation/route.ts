import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Schema for simulation creation
const simulationSchema = z.object({
    name: z.string().min(1, 'Simulation name is required'),
    expenses: z.array(
        z.object({
            amount: z.union([
                z.number().positive('Amount must be a positive number'),
                z.string().transform(val => {
                    const num = parseFloat(val);
                    if (isNaN(num) || num <= 0) {
                        throw new Error('Amount must be a positive number');
                    }
                    return num;
                })
            ]),
            description: z.string().min(1, 'Description is required'),
            category: z.string().min(1, 'Category is required'),
            date: z.string().min(1, 'Date is required'),
        })
    ).min(1, 'At least one expense is required'),
});

// Schema for budget analysis
const analyzeSchema = z.object({
    expenses: z.array(
        z.object({
            amount: z.union([
                z.number().positive('Amount must be a positive number'),
                z.string().transform(val => {
                    const num = parseFloat(val);
                    if (isNaN(num) || num <= 0) {
                        throw new Error('Amount must be a positive number');
                    }
                    return num;
                })
            ]),
            category: z.string().min(1, 'Category is required'),
            date: z.string().min(1, 'Date is required'),
        })
    ).min(1, 'At least one expense is required'),
});

/**
 * GET /api/simulation
 * Get all simulations for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = request.nextUrl;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : 1;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const total = await prisma.simulation.count({
            where: { userId: session.user.id },
        });

        // Get simulations with their expenses
        const simulations = await prisma.simulation.findMany({
            where: { userId: session.user.id },
            include: {
                expenses: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limit,
        });

        return NextResponse.json({
            data: simulations,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching simulations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch simulations' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/simulation
 * Create a new simulation
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        // Check if user is authenticated
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = simulationSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { name, expenses } = validationResult.data;

        // Create simulation with expenses
        const simulation = await prisma.simulation.create({
            data: {
                name,
                userId: session.user.id,
                expenses: {
                    create: expenses.map((expense: {
                        amount: number;
                        description: string;
                        category: string;
                        date: string;
                    }) => ({
                        amount: expense.amount,
                        description: expense.description,
                        category: expense.category,
                        date: new Date(expense.date),
                    })),
                },
            },
            include: {
                expenses: true,
            },
        });

        return NextResponse.json(simulation, { status: 201 });
    } catch (error) {
        console.error('Error creating simulation:', error);
        return NextResponse.json(
            { error: 'Failed to create simulation' },
            { status: 500 }
        );
    }
}