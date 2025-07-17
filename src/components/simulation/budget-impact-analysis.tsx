'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

interface BudgetStatus {
    budget: {
        id: string;
        category: string;
        limit: number;
        period: string;
    };
    spent: number;
    limit: number;
    remaining: number;
    percentage: number;
    isOverBudget: boolean;
    isActive: boolean;
    periodStart: string;
    periodEnd: string;
}

interface BudgetImpactAnalysisProps {
    simulationId: string;
}

export function BudgetImpactAnalysis({ simulationId }: BudgetImpactAnalysisProps) {
    const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const { addToast } = useToast();

    // Check if we're on a mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch budget impact data
    useEffect(() => {
        const fetchBudgetImpact = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch the simulation with its expenses
                const response = await fetch(`/api/simulation/${simulationId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch simulation');
                }

                const { data: simulation } = await response.json();

                if (!simulation.expenses || simulation.expenses.length === 0) {
                    setBudgetStatus([]);
                    setIsLoading(false);
                    return;
                }

                // Analyze budget impact using the simulation expenses
                const analyzeResponse = await fetch('/api/simulation/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expenses: simulation.expenses }),
                });

                if (!analyzeResponse.ok) {
                    throw new Error('Failed to analyze budget impact');
                }

                const { budgetStatus: impact } = await analyzeResponse.json();
                setBudgetStatus(impact);
            } catch (err) {
                console.error('Error analyzing budget impact:', err);
                setError('Failed to analyze budget impact');
                addToast({
                    title: 'Error',
                    message: 'Failed to analyze budget impact',
                    type: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (simulationId) {
            fetchBudgetImpact();
        }
    }, [simulationId, addToast]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    if (budgetStatus.length === 0) {
        return (
            <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                    No active budgets found for the expense categories in this simulation.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-md p-3 sm:p-4 bg-muted/30">
            <div className="space-y-3">
                {budgetStatus.map((status, index) => (
                    <div key={index} className="p-3 bg-background rounded-md border">
                        <div className={`${isMobile ? 'flex flex-col gap-1' : 'flex justify-between items-center'}`}>
                            <span className="font-medium text-sm sm:text-base">{status.budget.category}</span>
                            <span className={`text-sm font-semibold ${status.isOverBudget ? 'text-destructive' : 'text-success'}`}>
                                {status.isOverBudget ? 'Over Budget' : 'Within Budget'}
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="w-full bg-muted rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full ${status.percentage >= 100
                                        ? 'bg-destructive'
                                        : status.percentage >= 80
                                            ? 'bg-warning'
                                            : 'bg-success'
                                        }`}
                                    style={{ width: `${Math.min(status.percentage, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs mt-2">
                                <span className="font-medium">
                                    ${status.spent.toFixed(2)} of ${status.limit.toFixed(2)}
                                </span>
                                <span className="font-medium">{status.percentage.toFixed(0)}%</span>
                            </div>
                        </div>
                        {status.isOverBudget && (
                            <div className="mt-3 p-2 bg-destructive/10 rounded-md border border-destructive/20">
                                <p className="text-sm text-destructive">
                                    This simulation would exceed your {status.budget.category} budget by ${(status.spent - status.limit).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}