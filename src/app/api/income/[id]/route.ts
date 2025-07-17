import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { INCOME_CATEGORIES } from '@/lib/db-utils';
import { prisma } from '@/lib/prisma';

// Schema for income validation
const incomeSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be a positive number' }),
  source: z.string().min(1, { message: 'Source is required' }),
  description: z.string().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  category: z.string().refine((category) => INCOME_CATEGORIES.includes(category), {
    message: 'Invalid category',
  }),
});

// GET handler to fetch a specific income entry
export async function GET(
  _request: NextRequest,
  // { params }: { params: { id: string } }
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get income entry
    const income = await prisma.income.findUnique({
      where: { id },
    });

    // Check if income exists and belongs to the user
    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    if (income.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(income);
  } catch (error) {
    console.error('Error fetching income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income entry' },
      { status: 500 }
    );
  }
}

// PUT handler to update an income entry
export async function PUT(
  request: NextRequest,
  // { params }: { params: { id: string } }
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if income exists and belongs to the user
    const existingIncome = await prisma.income.findUnique({
      where: { id },
    });

    if (!existingIncome) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    if (existingIncome.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = incomeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { amount, source, description, date, category } = validationResult.data;

    // Update income entry
    const updatedIncome = await prisma.income.update({
      where: { id },
      data: {
        amount,
        source,
        description,
        date: new Date(date),
        category,
      },
    });

    return NextResponse.json(updatedIncome);
  } catch (error) {
    console.error('Error updating income:', error);
    return NextResponse.json(
      { error: 'Failed to update income entry' },
      { status: 500 }
    );
  }
}

// DELETE handler to remove an income entry
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

    // Check if income exists and belongs to the user
    const existingIncome = await prisma.income.findUnique({
      where: { id },
    });

    if (!existingIncome) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    if (existingIncome.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete income entry
    await prisma.income.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income:', error);
    return NextResponse.json(
      { error: 'Failed to delete income entry' },
      { status: 500 }
    );
  }
}