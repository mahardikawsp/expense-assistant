import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/simulation/[id]
 * Get a specific simulation by ID
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { id } = params;

        const simulation = await prisma.simulation.findUnique({
            where: {
                id,
                userId, // Ensure the simulation belongs to the current user
            },
            include: {
                expenses: true,
            },
        });

        if (!simulation) {
            return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
        }

        return NextResponse.json({ data: simulation });
    } catch (error) {
        console.error('Error fetching simulation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch simulation' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/simulation/[id]
 * Update a simulation
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { id } = params;
        const body = await request.json();

        // Check if simulation exists and belongs to user
        const existingSimulation = await prisma.simulation.findUnique({
            where: {
                id,
                userId,
            },
        });

        if (!existingSimulation) {
            return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
        }

        // Update simulation name
        const updatedSimulation = await prisma.simulation.update({
            where: {
                id,
            },
            data: {
                name: body.name,
            },
            include: {
                expenses: true,
            },
        });

        // If expenses are provided, update them
        if (body.expenses && Array.isArray(body.expenses)) {
            // Delete existing expenses
            await prisma.simulatedExpense.deleteMany({
                where: {
                    simulationId: id,
                },
            });

            // Create new expenses
            const expenses = await Promise.all(
                body.expenses.map(async (expense: any) => {
                    return prisma.simulatedExpense.create({
                        data: {
                            simulationId: id,
                            amount: expense.amount,
                            description: expense.description,
                            category: expense.category,
                            date: new Date(expense.date),
                        },
                    });
                })
            );

            // Return updated simulation with new expenses
            return NextResponse.json({
                data: {
                    ...updatedSimulation,
                    expenses,
                },
            });
        }

        return NextResponse.json({ data: updatedSimulation });
    } catch (error) {
        console.error('Error updating simulation:', error);
        return NextResponse.json(
            { error: 'Failed to update simulation' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/simulation/[id]
 * Delete a simulation
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { id } = params;

        // Check if simulation exists and belongs to user
        const existingSimulation = await prisma.simulation.findUnique({
            where: {
                id,
                userId,
            },
        });

        if (!existingSimulation) {
            return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
        }

        // Delete simulation (this will cascade delete the simulated expenses)
        await prisma.simulation.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting simulation:', error);
        return NextResponse.json(
            { error: 'Failed to delete simulation' },
            { status: 500 }
        );
    }
}