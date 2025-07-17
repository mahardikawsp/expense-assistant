'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { formatCurrency } from '@/lib/utils';
import { EXPENSE_CATEGORIES } from '@/lib/db-utils';

export default function AnalyticsPage() {
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [monthlyData, setMonthlyData] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Fetch analytics data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch general analytics data
                const response = await fetch(`/api/analytics?period=${period}${selectedCategory ? `&category=${selectedCategory}` : ''}`);
                const data = await response.json();
                setAnalyticsData(data);

                // Fetch monthly comparison data
                const monthlyResponse = await fetch('/api/analytics/monthly?months=6');
                const monthlyData = await monthlyResponse.json();
                setMonthlyData(monthlyData);
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period, selectedCategory]);

    // Handle period change
    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPeriod(e.target.value);
    };

    // Handle category filter change
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategory(e.target.value === 'all' ? null : e.target.value);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Financial Analytics</h1>
                        <p className="text-muted-foreground">Insights into your financial patterns</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            className="rounded-md border border-border bg-background px-3 py-3 md:py-2 text-base md:text-sm"
                            value={period}
                            onChange={handlePeriodChange}
                            aria-label="Select time period"
                        >
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="quarter">Last 3 Months</option>
                            <option value="year">This Year</option>
                        </select>
                        <select
                            className="rounded-md border border-border bg-background px-3 py-3 md:py-2 text-base md:text-sm"
                            value={selectedCategory || 'all'}
                            onChange={handleCategoryChange}
                            aria-label="Select expense category"
                        >
                            <option value="all">All Categories</option>
                            {EXPENSE_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {analyticsData && (
                    <>
                        {/* Summary cards */}
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                                <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
                                <p className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold">{formatCurrency(analyticsData.income.total)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                                <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
                                <p className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold">{formatCurrency(analyticsData.expenses.total)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                                <h3 className="text-sm font-medium text-muted-foreground">Savings</h3>
                                <p className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold">{formatCurrency(analyticsData.savings.amount)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                                <h3 className="text-sm font-medium text-muted-foreground">Savings Rate</h3>
                                <p className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold">
                                    {analyticsData.savings.rate.toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Expense by Category */}
                            <div className="rounded-lg border border-border bg-card p-6">
                                <h3 className="mb-4 text-lg font-medium">Expenses by Category</h3>
                                {analyticsData.expenses.byCategory.length > 0 ? (
                                    <PieChart
                                        labels={analyticsData.expenses.byCategory.map((item: any) => item.category)}
                                        data={analyticsData.expenses.byCategory.map((item: any) => item.amount)}
                                    />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No expense data available</p>
                                )}
                            </div>

                            {/* Expense Trend */}
                            <div className="rounded-lg border border-border bg-card p-6">
                                <h3 className="mb-4 text-lg font-medium">Expense Trend</h3>
                                {analyticsData.expenses.trend.length > 0 ? (
                                    <LineChart
                                        labels={analyticsData.expenses.trend.map((item: any) => item.date)}
                                        datasets={[
                                            {
                                                label: 'Daily Expenses',
                                                data: analyticsData.expenses.trend.map((item: any) => item.amount),
                                                fill: true,
                                            },
                                        ]}
                                    />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No trend data available</p>
                                )}
                            </div>
                        </div>

                        {/* Monthly Comparison */}
                        {monthlyData && monthlyData.months && (
                            <div className="rounded-lg border border-border bg-card p-6">
                                <h3 className="mb-4 text-lg font-medium">Monthly Comparison</h3>
                                <LineChart
                                    labels={monthlyData.months.map((item: any) => item.month)}
                                    datasets={[
                                        {
                                            label: 'Income',
                                            data: monthlyData.months.map((item: any) => item.income),
                                            borderColor: 'rgb(5, 150, 105)',
                                            backgroundColor: 'rgba(5, 150, 105, 0.1)',
                                        },
                                        {
                                            label: 'Expenses',
                                            data: monthlyData.months.map((item: any) => item.expenses),
                                            borderColor: 'rgb(239, 68, 68)',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        },
                                        {
                                            label: 'Savings',
                                            data: monthlyData.months.map((item: any) => item.savings),
                                            borderColor: 'rgb(59, 130, 246)',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        },
                                    ]}
                                />
                            </div>
                        )}

                        {/* Category Breakdown Table */}
                        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                            <h3 className="mb-4 text-lg font-medium">Category Breakdown</h3>
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="py-3 text-left font-medium">Category</th>
                                                <th className="py-3 text-right font-medium">Amount</th>
                                                <th className="py-3 text-right font-medium">% of Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsData.expenses.byCategory.map((category: any, index: number) => (
                                                <tr key={index} className="border-b border-border">
                                                    <td className="py-3 whitespace-nowrap">{category.category}</td>
                                                    <td className="py-3 text-right">{formatCurrency(category.amount)}</td>
                                                    <td className="py-3 text-right">
                                                        {analyticsData.expenses.total > 0
                                                            ? ((category.amount / analyticsData.expenses.total) * 100).toFixed(1)
                                                            : '0.0'}
                                                        %
                                                    </td>
                                                </tr>
                                            ))}
                                            {analyticsData.expenses.byCategory.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                                                        No expense data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="font-medium bg-muted/30">
                                                <td className="py-3 pl-2">Total</td>
                                                <td className="py-3 text-right">{formatCurrency(analyticsData.expenses.total)}</td>
                                                <td className="py-3 text-right pr-2">100%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Comparison Table */}
                        {monthlyData && monthlyData.months && (
                            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                                <h3 className="mb-4 text-lg font-medium">Monthly Financial Summary</h3>
                                <div className="overflow-x-auto -mx-4 sm:mx-0">
                                    <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="py-3 text-left font-medium">Month</th>
                                                    <th className="py-3 text-right font-medium">Income</th>
                                                    <th className="py-3 text-right font-medium">Expenses</th>
                                                    <th className="py-3 text-right font-medium">Savings</th>
                                                    <th className="py-3 text-right font-medium">Savings Rate</th>
                                                    {monthlyData.months[0].expenseChange !== undefined && (
                                                        <th className="py-3 text-right font-medium">MoM Change</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthlyData.months.map((month: any, index: number) => (
                                                    <tr key={index} className="border-b border-border">
                                                        <td className="py-3 whitespace-nowrap">{month.month}</td>
                                                        <td className="py-3 text-right whitespace-nowrap">{formatCurrency(month.income)}</td>
                                                        <td className="py-3 text-right whitespace-nowrap">{formatCurrency(month.expenses)}</td>
                                                        <td className="py-3 text-right whitespace-nowrap">{formatCurrency(month.savings)}</td>
                                                        <td className="py-3 text-right whitespace-nowrap">{month.savingsRate.toFixed(1)}%</td>
                                                        {month.expenseChange !== undefined && (
                                                            <td className="py-3 text-right whitespace-nowrap">
                                                                <span
                                                                    className={
                                                                        month.expenseChange < 0
                                                                            ? 'text-success'
                                                                            : month.expenseChange > 0
                                                                                ? 'text-destructive'
                                                                                : ''
                                                                    }
                                                                >
                                                                    {month.expenseChange > 0 ? '+' : ''}
                                                                    {month.expenseChange.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Report Generation */}
                <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                    <h3 className="mb-4 text-lg font-medium">Generate Reports</h3>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <h4 className="font-medium">Monthly Report</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    className="rounded-md border border-border bg-background px-3 py-3 md:py-2 text-base md:text-sm flex-1"
                                    defaultValue={new Date().getMonth()}
                                    aria-label="Select month"
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i} value={i}>
                                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="rounded-md border border-border bg-background px-3 py-3 md:py-2 text-base md:text-sm flex-1"
                                    defaultValue={new Date().getFullYear()}
                                    aria-label="Select year"
                                >
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = new Date().getFullYear() - 2 + i;
                                        return (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        );
                                    })}
                                </select>
                                <button className="rounded-md bg-primary px-4 py-3 md:py-2 text-base md:text-sm text-primary-foreground w-full sm:w-auto">
                                    Generate
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <h4 className="font-medium">Annual Report</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    className="rounded-md border border-border bg-background px-3 py-3 md:py-2 text-base md:text-sm flex-1"
                                    defaultValue={new Date().getFullYear()}
                                    aria-label="Select year"
                                >
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = new Date().getFullYear() - 2 + i;
                                        return (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        );
                                    })}
                                </select>
                                <button className="rounded-md bg-primary px-4 py-3 md:py-2 text-base md:text-sm text-primary-foreground w-full sm:w-auto">
                                    Generate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}