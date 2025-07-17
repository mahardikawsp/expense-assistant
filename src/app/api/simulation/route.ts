import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { withApiMiddleware } from '@/lib/api-middleware';
import { validateApiInput, sanitizeObject, DatabaseError, NotFoundError } from '@/lib/error-utils';

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
export const GET = withApiMiddleware(async (request: NextRequest, { userId, requestId }) => {
    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    try {
        // Get total count for pagination
        const total = await prisma.simulation.count({
            where: { userId },
        });

        // Get simulations with their expenses
        const simulations = await prisma.simulation.findMany({
            where: { userId },
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
            requestId,
        });
    } catch (error) {
        throw new DatabaseError('Failed to fetch simulations');
    }
});

/**
 * POST /api/simulation
 * Create a new simulation
 */
export const POST = withApiMiddleware(async (request: NextRequest, { userId, requestId }) => {
    // Validate and sanitize request body
    const validation = await validateApiInput(request, simulationSchema, {
        userId,
        requestId,
        sanitize: true
    });

    if (!validation.success) {
        return validation.error;
    }

    const { name, expenses } = validation.data;

    try {
        // Create simulation with expenses
        const simulation = await prisma.simulation.create({
            data: {
                name,
                userId,
                expenses: {
                    create: expenses.map(expense => ({
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

        return NextResponse.json({
            data: simulation,
            requestId
        }, { status: 201 });
    } catch (error) {
        throw new DatabaseError('Failed to create simulation');
    }
});