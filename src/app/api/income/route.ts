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

// GET handler to fetch all income entries for the authenticated user
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
    const total = await prisma.income.count({ where });

    // Get income entries with pagination and sorting
    const income = await prisma.income.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json({
      data: income,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income entries' },
      { status: 500 }
    );
  }
}

// POST handler to create a new income entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Create new income entry
    const income = await prisma.income.create({
      data: {
        userId: session.user.id,
        amount,
        source,
        description,
        date: new Date(date),
        category,
      },
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json(
      { error: 'Failed to create income entry' },
      { status: 500 }
    );
  }
}