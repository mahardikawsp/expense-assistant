'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { INCOME_CATEGORIES } from '@/lib/db-utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormError, FormField, FormLabel } from '@/components/forms/form';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

// Convert income categories to select options
const categoryOptions: SelectOption[] = INCOME_CATEGORIES.map((category) => ({
    value: category,
    label: category,
}));

// Income form schema
const incomeSchema = z.object({
    amount: z.string().min(1, { message: 'Amount is required' }).refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        { message: 'Amount must be a positive number' }
    ),
    source: z.string().min(1, { message: 'Source is required' }),
    description: z.string().optional(),
    date: z.string().min(1, { message: 'Date is required' }),
    category: z.string().min(1, { message: 'Category is required' }),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

interface IncomeFormProps {
    initialData?: {
        id: string;
        amount: number;
        source: string;
        description?: string;
        date: Date;
        category: string;
    };
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function IncomeForm({ initialData, onSuccess, onCancel }: IncomeFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    // Initialize form with default values or initial data
    const form = useForm<IncomeFormValues>({
        resolver: zodResolver(incomeSchema),
        defaultValues: initialData
            ? {
                amount: initialData.amount.toString(),
                source: initialData.source,
                description: initialData.description || '',
                date: format(new Date(initialData.date), 'yyyy-MM-dd'),
                category: initialData.category,
            }
            : {
                amount: '',
                source: '',
                description: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                category: '',
            },
    });

    const onSubmit = async (data: IncomeFormValues) => {
        setIsLoading(true);

        try {
            // Convert form data to API format
            const payload = {
                amount: parseFloat(data.amount),
                source: data.source,
                description: data.description || undefined,
                date: data.date,
                category: data.category,
            };

            // Determine if we're creating or updating
            const url = initialData
                ? `/api/income/${initialData.id}`
                : '/api/income';

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
                throw new Error(errorData.error || 'Failed to save income');
            }

            // Show success message
            addToast({
                title: initialData ? 'Income Updated' : 'Income Added',
                message: initialData
                    ? 'Your income entry has been updated successfully.'
                    : 'Your income has been added successfully.',
                type: 'success',
            });

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error saving income:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to save income',
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
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-muted-foreground">$</span>
                        </div>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-7"
                            disabled={isLoading}
                            {...form.register('amount')}
                        />
                    </div>
                </FormControl>
                <FormError>{form.formState.errors.amount?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="source">Source</FormLabel>
                <FormControl>
                    <Input
                        id="source"
                        placeholder="e.g., Salary, Freelance"
                        disabled={isLoading}
                        {...form.register('source')}
                    />
                </FormControl>
                <FormError>{form.formState.errors.source?.message}</FormError>
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

            <FormField>
                <FormLabel htmlFor="description">Description (Optional)</FormLabel>
                <FormControl>
                    <Input
                        id="description"
                        placeholder="Add additional details"
                        disabled={isLoading}
                        {...form.register('description')}
                    />
                </FormControl>
                <FormError>{form.formState.errors.description?.message}</FormError>
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
                            ? 'Update Income'
                            : 'Add Income'}
                </Button>
            </div>
        </Form>
    );
}