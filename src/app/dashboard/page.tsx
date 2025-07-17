import React from 'react';

import { BarChart } from '@/components/charts/bar-chart';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Notification } from '@/components/notifications/notification';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { formatCurrency } from '@/lib/utils';
import { formatNotification } from '@/lib/notification-utils';

export default async function DashboardPage() {
  // Get the current user
  const user = await getCurrentUser();

  if (!user) {
    return null; // Handle unauthenticated state
  }

  // Fetch real data from the database
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // Get income for the current month
  const incomeData = await prisma.income.aggregate({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Get expenses for the current month
  const expenseData = await prisma.expense.aggregate({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Get expenses by category
  const expensesByCategory = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Format expenses by category for chart
  const categoryLabels = expensesByCategory.map(item => item.category);
  const categoryData = expensesByCategory.map(item =>
    parseFloat(item._sum.amount?.toString() || '0')
  );

  // Get recent notifications
  const recentNotifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  // Format notifications for display
  const formattedNotifications = recentNotifications.map(formatNotification);

  // Calculate totals
  const totalIncome = parseFloat(incomeData._sum.amount?.toString() || '0');
  const totalExpenses = parseFloat(expenseData._sum.amount?.toString() || '0');
  const remainingBudget = totalIncome - totalExpenses;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your financial overview</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Remaining Budget</h3>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(remainingBudget)}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-medium">Expenses by Category</h3>
            {categoryData.length > 0 ? (
              <BarChart
                labels={categoryLabels}
                datasets={[
                  {
                    label: 'Amount',
                    data: categoryData,
                  },
                ]}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">No expense data available</p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-medium">Notifications</h3>
            <div className="space-y-4">
              {formattedNotifications.map((notification) => (
                <Notification
                  key={notification.id}
                  title={notification.title}
                  message={notification.message}
                  type={notification.severity}
                />
              ))}
              {formattedNotifications.length === 0 && (
                <p className="text-muted-foreground">No new notifications</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}