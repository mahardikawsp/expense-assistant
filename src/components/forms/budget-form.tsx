'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EXPENSE_CATEGORIES, BUDGET_PERIODS } from '@/lib/db-utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormError, FormField, FormLabel, FormDescription } from '@/components/forms/form';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

// Convert expense categories to select options
const categoryOptions: SelectOption[] = EXPENSE_CATEGORIES.map((category) => ({
    value: category,
    label: category,
}));

// Convert budget periods to select options
const periodOptions: SelectOption[] = BUDGET_PERIODS.map((period) => ({
    value: period,
    label: period.charAt(0) + period.slice(1).toLowerCase(),
}));

// Budget form schema
const budgetSchema = z.object({
    category: z.string().min(1, { message: 'Category is required' }),
    limit: z.string().min(1, { message: 'Budget limit is required' }).refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        { message: 'Budget limit must be a positive number' }
    ),
    period: z.string().min(1, { message: 'Budget period is required' }),
    startDate: z.string().min(1, { message: 'Start date is required' }),
    endDate: z.string().optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
    initialData?: {
        id: string;
        category: string;
        limit: number;
        period: string;
        startDate: Date;
        endDate?: Date;
    };
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function BudgetForm({ initialData, onSuccess, onCancel }: BudgetFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    // Initialize form with default values or initial data
    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: initialData
            ? {
                category: initialData.category,
                limit: initialData.limit.toString(),
                period: initialData.period,
                startDate: format(new Date(initialData.startDate), 'yyyy-MM-dd'),
                endDate: initialData.endDate ? format(new Date(initialData.endDate), 'yyyy-MM-dd') : undefined,
            }
            : {
                category: '',
                limit: '',
                period: 'MONTHLY',
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: '',
            },
    });

    const onSubmit = async (data: BudgetFormValues) => {
        setIsLoading(true);

        try {
            // Convert form data to API format
            const payload = {
                category: data.category,
                limit: parseFloat(data.limit),
                period: data.period,
                startDate: data.startDate,
                endDate: data.endDate && data.endDate.trim() !== '' ? data.endDate : undefined,
            };

            // Determine if we're creating or updating
            const url = initialData
                ? `/api/budget/${initialData.id}`
                : '/api/budget';

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
                throw new Error(errorData.error || 'Failed to save budget');
            }

            // Show success message
            addToast({
                title: initialData ? 'Budget Updated' : 'Budget Added',
                message: initialData
                    ? 'Your budget has been updated successfully.'
                    : 'Your budget has been added successfully.',
                type: 'success',
            });

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error saving budget:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to save budget',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form form={form} onSubmit={onSubmit} className="space-y-4">
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
                <FormLabel htmlFor="limit">Budget Limit</FormLabel>
                <FormControl>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-muted-foreground">$</span>
                        </div>
                        <Input
                            id="limit"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-7"
                            disabled={isLoading}
                            {...form.register('limit')}
                        />
                    </div>
                </FormControl>
                <FormError>{form.formState.errors.limit?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="period">Budget Period</FormLabel>
                <FormControl>
                    <Select
                        id="period"
                        options={periodOptions}
                        placeholder="Select a period"
                        value={form.watch('period')}
                        onChange={(value) => form.setValue('period', value, { shouldValidate: true })}
                        disabled={isLoading}
                        error={!!form.formState.errors.period}
                    />
                </FormControl>
                <FormDescription>
                    How often this budget resets (daily, weekly, or monthly)
                </FormDescription>
                <FormError>{form.formState.errors.period?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="startDate">Start Date</FormLabel>
                <FormControl>
                    <Input
                        id="startDate"
                        type="date"
                        disabled={isLoading}
                        {...form.register('startDate')}
                    />
                </FormControl>
                <FormError>{form.formState.errors.startDate?.message}</FormError>
            </FormField>

            <FormField>
                <FormLabel htmlFor="endDate">End Date (Optional)</FormLabel>
                <FormControl>
                    <Input
                        id="endDate"
                        type="date"
                        disabled={isLoading}
                        {...form.register('endDate')}
                    />
                </FormControl>
                <FormDescription>
                    Leave blank for ongoing budgets
                </FormDescription>
                <FormError>{form.formState.errors.endDate?.message}</FormError>
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
                            ? 'Update Budget'
                            : 'Add Budget'}
                </Button>
            </div>
        </Form>
    );
}