'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
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
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on a mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Financial Analytics</h1>
                    <p className="text-muted-foreground">Insights into your financial patterns</p>
                </div>

                {/* Filter controls - Full width on mobile, side by side on desktop */}
                <div className="flex flex-col gap-2 w-full">
                    <select
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm w-full"
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
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm w-full"
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

                {analyticsData && (
                    <>
                        {/* Summary cards - 2x2 grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border bg-card p-3">
                                <h3 className="text-xs font-medium text-muted-foreground">Total Income</h3>
                                <p className="mt-1 text-lg font-bold truncate">{formatCurrency(analyticsData.income.total)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                                <h3 className="text-xs font-medium text-muted-foreground">Total Expenses</h3>
                                <p className="mt-1 text-lg font-bold truncate">{formatCurrency(analyticsData.expenses.total)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                                <h3 className="text-xs font-medium text-muted-foreground">Savings</h3>
                                <p className="mt-1 text-lg font-bold truncate">{formatCurrency(analyticsData.savings.amount)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                                <h3 className="text-xs font-medium text-muted-foreground">Savings Rate</h3>
                                <p className="mt-1 text-lg font-bold">
                                    {analyticsData.savings.rate.toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Expense by Category Chart */}
                        <div className="rounded-lg border border-border bg-card p-3">
                            <h3 className="mb-2 text-base font-medium">Expenses by Category</h3>
                            <div className="h-[250px]">
                                {analyticsData.expenses.byCategory.length > 0 ? (
                                    <PieChart
                                        labels={analyticsData.expenses.byCategory.map((item: any) => item.category)}
                                        data={analyticsData.expenses.byCategory.map((item: any) => item.amount)}
                                    />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No expense data available</p>
                                )}
                            </div>
                        </div>

                        {/* Expense Trend Chart */}
                        <div className="rounded-lg border border-border bg-card p-3">
                            <h3 className="mb-2 text-base font-medium">Expense Trend</h3>
                            <div className="h-[250px]">
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

                        {/* Monthly Comparison Chart */}
                        {monthlyData && monthlyData.months && (
                            <div className="rounded-lg border border-border bg-card p-3">
                                <h3 className="mb-2 text-base font-medium">Monthly Comparison</h3>
                                <div className="h-[250px]">
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
                            </div>
                        )}

                        {/* Category Breakdown - Simplified for mobile */}
                        <div className="rounded-lg border border-border bg-card p-3">
                            <h3 className="mb-2 text-base font-medium">Category Breakdown</h3>
                            <div className="space-y-2">
                                {analyticsData.expenses.byCategory.map((category: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center border-b border-border py-2">
                                        <span className="text-sm truncate max-w-[60%]">{category.category}</span>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{formatCurrency(category.amount)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {analyticsData.expenses.total > 0
                                                    ? ((category.amount / analyticsData.expenses.total) * 100).toFixed(1)
                                                    : '0.0'}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {analyticsData.expenses.byCategory.length === 0 && (
                                    <p className="text-muted-foreground text-center py-4">No expense data available</p>
                                )}
                                <div className="flex justify-between items-center pt-2 font-medium">
                                    <span>Total</span>
                                    <span>{formatCurrency(analyticsData.expenses.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Summary - Simplified for mobile */}
                        {monthlyData && monthlyData.months && (
                            <div className="rounded-lg border border-border bg-card p-3">
                                <h3 className="mb-2 text-base font-medium">Monthly Summary</h3>
                                <div className="space-y-2">
                                    {monthlyData.months.map((month: any, index: number) => (
                                        <div key={index} className="border-b border-border py-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">{month.month}</span>
                                                {month.expenseChange !== undefined && (
                                                    <span
                                                        className={`text-xs ${month.expenseChange < 0
                                                                ? 'text-success'
                                                                : month.expenseChange > 0
                                                                    ? 'text-destructive'
                                                                    : ''
                                                            }`}
                                                    >
                                                        {month.expenseChange > 0 ? '+' : ''}
                                                        {month.expenseChange.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 mt-1">
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Income</div>
                                                    <div className="text-sm truncate">{formatCurrency(month.income)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Expenses</div>
                                                    <div className="text-sm truncate">{formatCurrency(month.expenses)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Savings</div>
                                                    <div className="text-sm truncate">{formatCurrency(month.savings)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Report Generation - Simplified for mobile */}
                        <div className="rounded-lg border border-border bg-card p-3">
                            <h3 className="mb-2 text-base font-medium">Generate Reports</h3>
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Monthly Report</h4>
                                    <div className="flex flex-col gap-2">
                                        <select
                                            className="rounded-md border border-border bg-background px-3 py-2 text-sm w-full"
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
                                            className="rounded-md border border-border bg-background px-3 py-2 text-sm w-full"
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
                                        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground w-full">
                                            Generate Monthly Report
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Annual Report</h4>
                                    <div className="flex flex-col gap-2">
                                        <select
                                            className="rounded-md border border-border bg-background px-3 py-2 text-sm w-full"
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
                                        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground w-full">
                                            Generate Annual Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}