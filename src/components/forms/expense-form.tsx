'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EXPENSE_CATEGORIES } from '@/lib/db-utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormError, FormField, FormLabel } from '@/components/forms/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select, SelectOption } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

// Convert expense categories to select options
const categoryOptions: SelectOption[] = EXPENSE_CATEGORIES.map((category) => ({
    value: category,
    label: category,
}));

// Expense form schema
const expenseSchema = z.object({
    amount: z.string().min(1, { message: 'Amount is required' }).refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        { message: 'Amount must be a positive number' }
    ),
    description: z.string().min(1, { message: 'Description is required' }),
    date: z.string().min(1, { message: 'Date is required' }),
    category: z.string().min(1, { message: 'Category is required' }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
    initialData?: {
        id: string;
        amount: number;
        description: string;
        date: Date;
        category: string;
    };
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ExpenseForm({ initialData, onSuccess, onCancel }: ExpenseFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    // Initialize form with default values or initial data
    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: initialData
            ? {
                amount: initialData.amount.toString(),
                description: initialData.description,
                date: format(new Date(initialData.date), 'yyyy-MM-dd'),
                category: initialData.category,
            }
            : {
                amount: '',
                description: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                category: '',
            },
    });

    const onSubmit = async (data: ExpenseFormValues) => {
        setIsLoading(true);

        try {
            // Convert form data to API format
            const payload = {
                amount: parseFloat(data.amount),
                description: data.description,
                date: data.date,
                category: data.category,
            };

            // Determine if we're creating or updating
            const url = initialData
                ? `/api/expense/${initialData.id}`
                : '/api/expense';

            const method = initialData ? 'PUT' : 'POST';

            // Make API request
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save expense');
            }

            // Show success message
            addToast({
                title: initialData ? 'Expense Updated' : 'Expense Added',
                message: initialData
                    ? 'Your expense entry has been updated successfully.'
                    : 'Your expense has been added successfully.',
                type: 'success',
            });

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to save expense',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form form={form} onSubmit={onSubmit} className="space-y-4">
            <FormField>
                <FormLabel htmlFor="amount">Amount</FormLabel>
                <FormControl>
                    <NumberInput
                        id="amount"
                        prefix="Rp "
                        placeholder="1,000,000"
                        disabled={isLoading}
                        onValueChange={(value) => {
                            form.setValue('amount', value.toString(), { shouldValidate: true });
                        }}
                        value={form.watch('amount')}
                    />
                </FormControl>
                <FormError>{form.formState.errors.amount?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="description">Description</FormLabel>
                <FormControl>
                    <Input
                        id="description"
                        placeholder="e.g., Grocery shopping, Rent payment"
                        disabled={isLoading}
                        {...form.register('description')}
                    />
                </FormControl>
                <FormError>{form.formState.errors.description?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="category">Category</FormLabel>
                <FormControl>
                    <Select
                        id="category"
                        options={categoryOptions}
                        placeholder="Select a category"
                        value={form.watch('category')}
                        onChange={(value) => form.setValue('category', value, { shouldValidate: true })}
                        disabled={isLoading}
                        error={!!form.formState.errors.category}
                    />
                </FormControl>
                <FormError>{form.formState.errors.category?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="date">Date</FormLabel>
                <FormControl>
                    <Input
                        id="date"
                        type="date"
                        disabled={isLoading}
                        {...form.register('date')}
                    />
                </FormControl>
                <FormError>{form.formState.errors.date?.message}</FormError>
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={isLoading}>
                    {isLoading
                        ? initialData
                            ? 'Updating...'
                            : 'Adding...'
                        : initialData
                            ? 'Update Expense'
                            : 'Add Expense'}
                </Button>
            </div>
        </Form>
    );
}