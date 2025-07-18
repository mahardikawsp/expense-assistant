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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your financial overview</p>
        </div>

        {/* Summary cards - 2x2 grid on mobile, 3x1 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-lg border border-border bg-card p-3 md:p-4">
            <h3 className="text-xs md:text-sm font-medium text-muted-foreground">Total Income</h3>
            <p className="mt-1 text-lg md:text-xl lg:text-2xl font-bold truncate">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 md:p-4">
            <h3 className="text-xs md:text-sm font-medium text-muted-foreground">Total Expenses</h3>
            <p className="mt-1 text-lg md:text-xl lg:text-2xl font-bold truncate">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 md:p-4 col-span-2 md:col-span-1">
            <h3 className="text-xs md:text-sm font-medium text-muted-foreground">Remaining Budget</h3>
            <p className="mt-1 text-lg md:text-xl lg:text-2xl font-bold truncate">{formatCurrency(remainingBudget)}</p>
          </div>
        </div>

        {/* Charts - Stack on mobile, side by side on desktop */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-3 md:p-4">
            <h3 className="mb-2 md:mb-4 text-base md:text-lg font-medium">Expenses by Category</h3>
            <div className="h-[250px] md:h-[300px]">
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
          </div>
          <div className="rounded-lg border border-border bg-card p-3 md:p-4">
            <h3 className="mb-2 md:mb-4 text-base md:text-lg font-medium">Notifications</h3>
            <div className="space-y-3 md:space-y-4 max-h-[250px] md:max-h-[300px] overflow-y-auto">
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