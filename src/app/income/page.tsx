'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { IncomeForm } from '@/components/forms/income-form';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';

interface Income {
    id: string;
    amount: number;
    source: string;
    description?: string;
    date: Date;
    category: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function IncomePage() {
    const [incomeEntries, setIncomeEntries] = useState<Income[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
    const { addToast } = useToast();
    const router = useRouter();

    // Fetch income entries
    const fetchIncomeEntries = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/income');
            if (!response.ok) {
                throw new Error('Failed to fetch income entries');
            }
            const data = await response.json();
            setIncomeEntries(data.data);
        } catch (error) {
            console.error('Error fetching income entries:', error);
            addToast({
                title: 'Error',
                message: 'Failed to load income entries. Please try again.',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load income entries on component mount
    useEffect(() => {
        fetchIncomeEntries();
    }, []);

    // Handle delete income
    const handleDeleteIncome = async () => {
        if (!selectedIncome) return;

        try {
            const response = await fetch(`/api/income/${selectedIncome.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete income entry');
            }

            addToast({
                title: 'Income Deleted',
                message: 'Income entry has been deleted successfully.',
                type: 'success',
            });

            // Refresh income entries
            fetchIncomeEntries();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting income:', error);
            addToast({
                title: 'Error',
                message: 'Failed to delete income entry. Please try again.',
                type: 'error',
            });
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Income</h1>
                        <p className="text-muted-foreground">Manage your income sources</p>
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)}>Add Income</Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : incomeEntries.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8">
                            <div className="text-center">
                                <h3 className="text-lg font-medium">No income entries yet</h3>
                                <p className="text-muted-foreground mt-1">
                                    Add your first income entry to start tracking your finances.
                                </p>
                                <Button
                                    className="mt-4"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    Add Income
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {incomeEntries.map((income) => (
                            <Card key={income.id} className="overflow-hidden">
                                <CardHeader className="bg-muted/50 pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{income.source}</CardTitle>
                                        <div className="text-xl font-bold text-primary">
                                            {formatCurrency(income.amount)}
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(income.date), 'MMM d, yyyy')}
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="mb-2">
                                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                            {income.category}
                                        </span>
                                    </div>
                                    {income.description && (
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {income.description}
                                        </p>
                                    )}
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedIncome(income);
                                                setIsEditModalOpen(true);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedIncome(income);
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
                )}
            </div>

            {/* Add Income Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Income"
            >
                <IncomeForm
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchIncomeEntries();
                    }}
                    onCancel={() => setIsAddModalOpen(false)}
                />
            </Modal>

            {/* Edit Income Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Income"
            >
                {selectedIncome && (
                    <IncomeForm
                        initialData={selectedIncome}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            fetchIncomeEntries();
                        }}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Income"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete this income entry?</p>
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
                        <Button variant="destructive" onClick={handleDeleteIncome}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}