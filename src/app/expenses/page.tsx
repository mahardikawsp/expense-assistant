'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ExpenseForm } from '@/components/forms/expense-form';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Select, SelectOption } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { EXPENSE_CATEGORIES } from '@/lib/db-utils';
import { formatCurrency } from '@/lib/utils';

interface Expense {
    id: string;
    amount: number;
    description: string;
    date: Date;
    category: string;
    createdAt: Date;
    updatedAt: Date;
}

interface CategoryTotal {
    category: string;
    total: number;
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
    const [overallTotal, setOverallTotal] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const { addToast } = useToast();
    const router = useRouter();

    // Create category filter options
    const categoryOptions: SelectOption[] = [
        { value: '', label: 'All Categories' },
        ...EXPENSE_CATEGORIES.map((category) => ({
            value: category,
            label: category,
        })),
    ];

    // Fetch expense entries
    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const url = selectedCategory
                ? `/api/expense?category=${encodeURIComponent(selectedCategory)}`
                : '/api/expense';

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch expense entries');
            }
            const data = await response.json();
            setExpenses(data.data);
            setCategoryTotals(data.totals.byCategory);
            setOverallTotal(data.totals.overall);
        } catch (error) {
            console.error('Error fetching expense entries:', error);
            addToast({
                title: 'Error',
                message: 'Failed to load expense entries. Please try again.',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load expense entries on component mount and when category filter changes
    useEffect(() => {
        fetchExpenses();
    }, [selectedCategory]);

    // Handle delete expense
    const handleDeleteExpense = async () => {
        if (!selectedExpense) return;

        try {
            const response = await fetch(`/api/expense/${selectedExpense.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete expense entry');
            }

            addToast({
                title: 'Expense Deleted',
                message: 'Expense entry has been deleted successfully.',
                type: 'success',
            });

            // Refresh expense entries
            fetchExpenses();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting expense:', error);
            addToast({
                title: 'Error',
                message: 'Failed to delete expense entry. Please try again.',
                type: 'error',
            });
        }
    };

    // Group expenses by category
    const expensesByCategory = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
        if (!acc[expense.category]) {
            acc[expense.category] = [];
        }
        acc[expense.category].push(expense);
        return acc;
    }, {});

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Expenses</h1>
                        <p className="text-muted-foreground">Manage your expenses</p>
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)}>Add Expense</Button>
                </div>

                {/* Category filter and totals */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/50 p-4 rounded-lg">
                    <div className="w-full md:w-64">
                        <label className="block text-sm font-medium mb-1">Filter by Category</label>
                        <Select
                            options={categoryOptions}
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            placeholder="Select category"
                        />
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-sm text-muted-foreground">Total Expenses</div>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(overallTotal)}</div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : expenses.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8">
                            <div className="text-center">
                                <h3 className="text-lg font-medium">No expense entries yet</h3>
                                <p className="text-muted-foreground mt-1">
                                    Add your first expense entry to start tracking your spending.
                                </p>
                                <Button
                                    className="mt-4"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    Add Expense
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(expensesByCategory).map(([category, categoryExpenses]) => (
                            <div key={category} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold">{category}</h2>
                                    <div className="text-lg font-medium text-primary">
                                        {formatCurrency(
                                            categoryTotals.find((ct) => ct.category === category)?.total ||
                                            categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
                                        )}
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {categoryExpenses.map((expense) => (
                                        <Card key={expense.id} className="overflow-hidden">
                                            <CardHeader className="bg-muted/50 pb-2">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-lg">{expense.description}</CardTitle>
                                                    <div className="text-xl font-bold text-primary">
                                                        {formatCurrency(expense.amount)}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(expense.date), 'MMM d, yyyy')}
                                                </p>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="mb-2">
                                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                                        {expense.category}
                                                    </span>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedExpense(expense);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedExpense(expense);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Expense"
            >
                <ExpenseForm
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchExpenses();
                    }}
                    onCancel={() => setIsAddModalOpen(false)}
                />
            </Modal>

            {/* Edit Expense Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Expense"
            >
                {selectedExpense && (
                    <ExpenseForm
                        initialData={selectedExpense}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            fetchExpenses();
                        }}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Expense"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete this expense entry?</p>
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
                        <Button variant="destructive" onClick={handleDeleteExpense}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}