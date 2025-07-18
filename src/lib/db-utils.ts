import { prisma } from './prisma';

/**
 * Utility functions for database operations
 */

/**
 * Check if the database connection is working
 * @returns Promise<boolean> True if connection is successful
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Execute a simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    // Log error in production environment
    return false;
  }
}

/**
 * Get database statistics for monitoring
 * @returns Promise with database statistics
 */
export async function getDatabaseStats() {
  try {
    const userCount = await prisma.user.count();
    const incomeCount = await prisma.income.count();
    const expenseCount = await prisma.expense.count();
    const budgetCount = await prisma.budget.count();

    return {
      userCount,
      incomeCount,
      expenseCount,
      budgetCount,
      status: 'connected',
    };
  } catch (_error) {
    return {
      status: 'error',
      error: _error instanceof Error ? _error.message : 'Unknown error',
    };
  }
}

/**
 * Predefined expense categories
 */
export const EXPENSE_CATEGORIES = [
  'Belanja Mingguan',
  'Belanja Bulanan',
  'Keluarga',
  'Istri',
  'Have Fun',
  'Baby',
  'Transportasi',
  'Paket Data',
  'Kos',
  'Other'
];

/**
 * Predefined income categories
 */
export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Gifts',
  'Other',
];

/**
 * Budget period types
 */
export const BUDGET_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;