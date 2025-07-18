import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkBudgetLimitsAndNotify } from '@/lib/notification-utils';
import { convertSimulationToExpenses } from '@/lib/simulation-utils';

/**
 * POST /api/simulation/[id]/convert
 * Convert a simulation to actual expenses
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { id } = await params;

        // Check if simulation exists and belongs to user
        const simulation = await prisma.simulation.findUnique({
            where: {
                id,
                userId,
            },
            include: {
                expenses: true,
            },
        });

        if (!simulation) {
            return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
        }

        if (simulation.expenses.length === 0) {
            return NextResponse.json(
                { error: 'Simulation has no expenses to convert' },
                { status: 400 }
            );
        }

        // Use the utility function to convert simulation to expenses
        const createdExpenses = await convertSimulationToExpenses(id, userId);

        // Check for budget notifications for each expense
        const notifications = [];
        for (const expense of createdExpenses) {
            const { notifications: expenseNotifications } = await checkBudgetLimitsAndNotify(
                expense,
                userId
            );

            if (expenseNotifications && expenseNotifications.length > 0) {
                notifications.push(...expenseNotifications);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                expenses: createdExpenses,
                notifications,
            },
        });
    } catch (error) {
        console.error('Error converting simulation to expenses:', error);
        return NextResponse.json(
            { error: 'Failed to convert simulation to expenses' },
            { status: 500 }
        );
    }
}