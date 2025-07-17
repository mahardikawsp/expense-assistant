'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

// Define the schema for the form
const simulationSchema = z.object({
    name: z.string().min(1, 'Simulation name is required'),
    expenses: z.array(
        z.object({
            amount: z.string().refine(
                (val) => {
                    const num = parseFloat(val);
                    return !isNaN(num) && num > 0;
                },
                { message: 'Amount must be a positive number' }
            ),
            description: z.string().min(1, 'Description is required'),
            category: z.string().min(1, 'Category is required'),
            date: z.string().min(1, 'Date is required'),
        })
    ).min(1, 'At least one expense is required'),
});

type SimulationFormData = z.infer<typeof simulationSchema>;

interface SimulationFormProps {
    onSubmit: (data: SimulationFormData) => void;
    initialData?: SimulationFormData;
}

export function SimulationForm({ onSubmit, initialData }: SimulationFormProps) {
    const [categories, setCategories] = useState<string[]>([]);
    const [budgetStatus, setBudgetStatus] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { addToast } = useToast();

    // Initialize form with react-hook-form
    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
        reset,
    } = useForm<SimulationFormData>({
        resolver: zodResolver(simulationSchema),
        defaultValues: initialData || {
            name: '',
            expenses: [{ amount: '', description: '', category: '', date: format(new Date(), 'yyyy-MM-dd') }],
        },
    });

    // Use field array for dynamic expenses
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'expenses',
    });

    // Watch form values for budget analysis
    const formValues = watch();

    // Fetch expense categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/expense/categories');
                if (!response.ok) {
                    throw new Error('Failed to fetch categories');
                }
                const data = await response.json();
                setCategories(data.categories);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        fetchCategories();
    }, []);

    // Analyze budget impact
    const analyzeBudgetImpact = async () => {
        if (formValues.expenses.some(e => !e.amount || !e.category || !e.date)) {
            addToast({
                title: 'Incomplete Data',
                message: 'Please fill in all expense details before analyzing budget impact',
                type: 'warning',
            });
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/simulation/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ expenses: formValues.expenses }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze budget impact');
            }

            const data = await response.json();
            setBudgetStatus(data.budgetStatus);
        } catch (error) {
            console.error('Error analyzing budget impact:', error);
            addToast({
                title: 'Error',
                message: 'Failed to analyze budget impact',
                type: 'error',
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle form submission
    const handleFormSubmit = (data: SimulationFormData) => {
        // Format the data before submission
        const formattedData = {
            name: data.name,
            expenses: data.expenses.map(expense => ({
                amount: parseFloat(expense.amount),
                description: expense.description,
                category: expense.category,
                date: expense.date,
            })),
        };

        onSubmit(formattedData as any);
        reset();
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Simulation Name
                </label>
                <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Monthly Groceries Scenario"
                    {...register('name')}
                />
                {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Simulated Expenses</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ amount: '', description: '', category: '', date: format(new Date(), 'yyyy-MM-dd') })}
                    >
                        Add Expense
                    </Button>
                </div>

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md relative">
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                aria-label="Remove expense"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 6L6 18"></path>
                                    <path d="M6 6l12 12"></path>
                                </svg>
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Description
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="e.g., Grocery Shopping"
                                        {...register(`expenses.${index}.description`)}
                                        className="h-10 md:h-auto text-base md:text-sm"
                                    />
                                    {errors.expenses?.[index]?.description && (
                                        <p className="text-destructive text-sm mt-1">
                                            {errors.expenses[index]?.description?.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Amount ($)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        {...register(`expenses.${index}.amount`)}
                                        className="h-10 md:h-auto text-base md:text-sm"
                                        inputMode="decimal"
                                    />
                                    {errors.expenses?.[index]?.amount && (
                                        <p className="text-destructive text-sm mt-1">
                                            {errors.expenses[index]?.amount?.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Category
                                    </label>
                                    <Controller
                                        control={control}
                                        name={`expenses.${index}.category`}
                                        render={({ field }) => (
                                            <Select
                                                options={categories.map(category => ({ value: category, label: category }))}
                                                placeholder="Select a category"
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="h-10 md:h-auto text-base md:text-sm"
                                            />
                                        )}
                                    />
                                    {errors.expenses?.[index]?.category && (
                                        <p className="text-destructive text-sm mt-1">
                                            {errors.expenses[index]?.category?.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Date
                                    </label>
                                    <Input
                                        type="date"
                                        {...register(`expenses.${index}.date`)}
                                        className="h-10 md:h-auto text-base md:text-sm"
                                    />
                                    {errors.expenses?.[index]?.date && (
                                        <p className="text-destructive text-sm mt-1">
                                            {errors.expenses[index]?.date?.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {errors.expenses && fields.length === 0 && (
                        <p className="text-destructive text-sm">
                            At least one expense is required
                        </p>
                    )}

                    {fields.length === 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full py-8"
                            onClick={() => append({ amount: '', description: '', category: '', date: format(new Date(), 'yyyy-MM-dd') })}
                        >
                            Add Your First Expense
                        </Button>
                    )}
                </div>
            </div>

            {fields.length > 0 && (
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={analyzeBudgetImpact}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <>
                                <span className="animate-spin mr-2">⟳</span> Analyzing...
                            </>
                        ) : (
                            'Analyze Budget Impact'
                        )}
                    </Button>
                </div>
            )}

            {budgetStatus.length > 0 && (
                <div className="border rounded-md p-4 bg-muted/30">
                    <h3 className="font-medium mb-2">Budget Impact Analysis</h3>
                    <div className="space-y-3">
                        {budgetStatus.map((status, index) => (
                            <div key={index} className="p-3 bg-background rounded-md border">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{status.budget.category}</span>
                                    <span className={`text-sm font-semibold ${status.isOverBudget ? 'text-destructive' : 'text-success'}`}>
                                        {status.isOverBudget ? 'Over Budget' : 'Within Budget'}
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${status.percentage >= 100
                                                ? 'bg-destructive'
                                                : status.percentage >= 80
                                                    ? 'bg-warning'
                                                    : 'bg-success'
                                                }`}
                                            style={{ width: `${Math.min(status.percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs mt-1">
                                        <span>
                                            ${status.spent.toFixed(2)} of ${status.limit.toFixed(2)}
                                        </span>
                                        <span>{status.percentage.toFixed(0)}%</span>
                                    </div>
                                </div>
                                {status.isOverBudget && (
                                    <p className="text-sm text-destructive mt-2">
                                        This simulation would exceed your {status.budget.category} budget by ${(status.spent - status.limit).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" disabled={fields.length === 0}>
                    Save Simulation
                </Button>
            </div>
        </form>
    );
}