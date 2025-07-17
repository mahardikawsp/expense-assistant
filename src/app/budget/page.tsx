'use client';

import { format, isAfter, isWithinInterval } from 'date-fns';
import { useEffect, useState } from 'react';

import { Budget } from '@/types';
import { BudgetForm } from '@/components/forms/budget-form';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { EXPENSE_CATEGORIES } from '@/lib/db-utils';
import { formatCurrency } from '@/lib/utils';

export default function BudgetPage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [expenses, setExpenses] = useState<{ category: string; amount: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const { addToast } = useToast();

    // Fetch budgets and expenses
    const fetchBudgets = async () => {
        setIsLoading(true);
        try {
            // Fetch budgets
            const budgetResponse = await fetch('/api/budget');
            if (!budgetResponse.ok) {
                throw new Error('Failed to fetch budgets');
            }
            const budgetData = await budgetResponse.json();
            setBudgets(budgetData);

            // Fetch expenses for the current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const expenseResponse = await fetch(
                `/api/expense?startDate=${format(startOfMonth, 'yyyy-MM-dd')}&endDate=${format(endOfMonth, 'yyyy-MM-dd')}`
            );
            if (!expenseResponse.ok) {
                throw new Error('Failed to fetch expenses');
            }
            const expenseData = await expenseResponse.json();

            // Use the category totals directly from the API response
            const categoryTotals = expenseData.totals?.byCategory || [];

            // Convert to the format expected by the component
            const expensesArray = categoryTotals.map((item: { category: string; total: number }) => ({
                category: item.category,
                amount: item.total,
            }));

            setExpenses(expensesArray);
        } catch (error) {
            console.error('Error fetching data:', error);
            addToast({
                title: 'Error',
                message: 'Failed to load budget data',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load budgets on component mount
    useEffect(() => {
        fetchBudgets();
    }, []);

    // Handle budget deletion
    const handleDeleteBudget = async () => {
        if (!selectedBudget) return;

        try {
            const response = await fetch(`/api/budget/${selectedBudget.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete budget');
            }

            // Remove budget from state
            setBudgets((prevBudgets) => prevBudgets.filter((budget) => budget.id !== selectedBudget.id));

            addToast({
                title: 'Budget Deleted',
                message: 'Your budget has been deleted successfully',
                type: 'success',
            });

            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting budget:', error);
            addToast({
                title: 'Error',
                message: 'Failed to delete budget',
                type: 'error',
            });
        }
    };

    // Calculate budget usage
    const getBudgetUsage = (budget: Budget) => {
        const categoryExpenses = expenses.find((e) => e.category === budget.category);
        const spent = categoryExpenses ? categoryExpenses.amount : 0;
        const limit = parseFloat(budget.limit.toString());
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;

        return {
            spent,
            limit,
            percentage: Math.min(percentage, 100), // Cap at 100% for display purposes
            isActive: isBudgetActive(budget),
            isOverBudget: spent > limit,
        };
    };

    // Check if a budget is currently active
    const isBudgetActive = (budget: Budget) => {
        const now = new Date();
        const startDate = new Date(budget.startDate);

        if (budget.endDate) {
            const endDate = new Date(budget.endDate);
            return isWithinInterval(now, { start: startDate, end: endDate });
        }

        return isAfter(now, startDate) || now.getTime() === startDate.getTime();
    };

    // Get status color based on percentage
    const getStatusColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-amber-500';
        return 'bg-green-500';
    };

    // Group budgets by period
    const groupedBudgets = budgets.reduce((acc: Record<string, Budget[]>, budget) => {
        const period = budget.period;
        if (!acc[period]) {
            acc[period] = [];
        }
        acc[period].push(budget);
        return acc;
    }, {});

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Budget Management</h1>
                        <p className="text-muted-foreground">Set and track your spending limits</p>
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)}>Add Budget</Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : Object.entries(groupedBudgets).length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8">
                            <div className="text-center">
                                <h3 className="text-lg font-medium">No budgets set up yet</h3>
                                <p className="text-muted-foreground mt-1">
                                    Create your first budget to start tracking your spending against your limits
                                </p>
                                <Button
                                    className="mt-4"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    Create Your First Budget
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {Object.entries(groupedBudgets).map(([period, periodBudgets]) => (
                            <div key={period} className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">
                                    {period.charAt(0) + period.slice(1).toLowerCase()} Budgets
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {periodBudgets.map((budget) => {
                                        const { spent, limit, percentage, isActive, isOverBudget } = getBudgetUsage(budget);
                                        const statusColor = getStatusColor(percentage);

                                        return (
                                            <Card key={budget.id} className={`${!isActive ? 'opacity-70' : ''}`}>
                                                <CardHeader className="bg-muted/50 pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-lg">{budget.category}</CardTitle>
                                                        <div className="text-xl font-bold text-primary">
                                                            {formatCurrency(limit)}
                                                        </div>
                                                    </div>
                                                    <CardDescription>
                                                        {isActive ? (
                                                            isOverBudget ? (
                                                                <span className="text-red-500 font-medium">Over Budget!</span>
                                                            ) : (
                                                                'Active'
                                                            )
                                                        ) : (
                                                            'Inactive'
                                                        )}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="pt-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span>Spent: {formatCurrency(spent)}</span>
                                                            <span>{Math.round(percentage)}% used</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                            <div
                                                                className={`h-2.5 rounded-full ${statusColor}`}
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>
                                                                {formatCurrency(limit - spent)} remaining
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-2">
                                                            {budget.startDate && (
                                                                <div>
                                                                    Start: {format(new Date(budget.startDate), 'MMM d, yyyy')}
                                                                </div>
                                                            )}
                                                            {budget.endDate && (
                                                                <div>
                                                                    End: {format(new Date(budget.endDate), 'MMM d, yyyy')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end gap-2 mt-4">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedBudget(budget);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedBudget(budget);
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Budget Categories without Budgets */}
                        {budgets.length > 0 && (
                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4">Categories Without Budgets</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {EXPENSE_CATEGORIES.filter(
                                        (category) => !budgets.some((budget) => budget.category === category)
                                    ).map((category) => (
                                        <Card key={category} className="bg-muted/30">
                                            <CardHeader>
                                                <CardTitle className="text-lg">{category}</CardTitle>
                                                <CardDescription>No budget set</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Button
                                                    onClick={() => {
                                                        setSelectedBudget(null);
                                                        setIsAddModalOpen(true);
                                                    }}
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    Create Budget
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add Budget Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Budget"
            >
                <BudgetForm
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchBudgets();
                    }}
                    onCancel={() => setIsAddModalOpen(false)}
                />
            </Modal>

            {/* Edit Budget Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Budget"
            >
                {selectedBudget && (
                    <BudgetForm
                        initialData={selectedBudget}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            fetchBudgets();
                        }}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Budget"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete this budget?</p>
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteBudget}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}