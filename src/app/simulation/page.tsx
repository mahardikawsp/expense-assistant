'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimulationForm } from '@/components/forms/simulation-form';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { BudgetImpactAnalysis } from '@/components/simulation/budget-impact-analysis';
import { Simulation } from '@/types';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function SimulationPage() {
    useSession();
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
    const { addToast } = useToast();

    // Fetch simulations
    const fetchSimulations = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/simulation');
            if (!response.ok) {
                throw new Error('Failed to fetch simulations');
            }
            const data = await response.json();
            setSimulations(data.data);
        } catch (error) {
            console.error('Error fetching simulations:', error);
            addToast({
                title: 'Error',
                message: 'Failed to load simulations',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSimulations();
    }, []);

    // Handle creating a new simulation
    const handleCreateSimulation = async (simulation: any) => {
        try {
            const response = await fetch('/api/simulation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(simulation),
            });

            if (!response.ok) {
                throw new Error('Failed to create simulation');
            }

            addToast({
                title: 'Success',
                message: 'Simulation created successfully',
                type: 'success',
            });

            setIsCreateModalOpen(false);
            fetchSimulations();
        } catch (error) {
            console.error('Error creating simulation:', error);
            addToast({
                title: 'Error',
                message: 'Failed to create simulation',
                type: 'error',
            });
        }
    };

    // Handle deleting a simulation
    const handleDeleteSimulation = async (id: string) => {
        try {
            const response = await fetch(`/api/simulation/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete simulation');
            }

            addToast({
                title: 'Success',
                message: 'Simulation deleted successfully',
                type: 'success',
            });

            fetchSimulations();
            if (selectedSimulation?.id === id) {
                setSelectedSimulation(null);
                setIsViewModalOpen(false);
            }
        } catch (error) {
            console.error('Error deleting simulation:', error);
            addToast({
                title: 'Error',
                message: 'Failed to delete simulation',
                type: 'error',
            });
        }
    };

    // Handle converting a simulation to actual expenses
    const handleConvertToExpenses = async (id: string) => {
        try {
            const response = await fetch(`/api/simulation/${id}/convert`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to convert simulation to expenses');
            }

            addToast({
                title: 'Success',
                message: 'Simulation converted to expenses successfully',
                type: 'success',
            });

            setIsViewModalOpen(false);
        } catch (error) {
            console.error('Error converting simulation to expenses:', error);
            addToast({
                title: 'Error',
                message: 'Failed to convert simulation to expenses',
                type: 'error',
            });
        }
    };

    // View simulation details
    const handleViewSimulation = (simulation: Simulation) => {
        setSelectedSimulation(simulation);
        setIsViewModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Expense Simulations</h1>
                    <Button onClick={() => setIsCreateModalOpen(true)}>Create Simulation</Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : simulations.length === 0 ? (
                    <Card className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">No simulations found</p>
                        <Button onClick={() => setIsCreateModalOpen(true)}>Create Your First Simulation</Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {simulations.map((simulation) => (
                            <Card key={simulation.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold">{simulation.name}</h3>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(simulation.createdAt), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {simulation.expenses.length} simulated expense{simulation.expenses.length !== 1 ? 's' : ''}
                                </p>
                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewSimulation(simulation)}
                                    >
                                        View Details
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteSimulation(simulation.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create Simulation Modal */}
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create Simulation"
                // size="lg"
                >
                    <ModalHeader>
                        <h2 className="text-xl font-semibold">Create Expense Simulation</h2>
                    </ModalHeader>
                    <ModalBody>
                        <SimulationForm onSubmit={handleCreateSimulation} />
                    </ModalBody>
                </Modal>

                {/* View Simulation Modal */}
                {selectedSimulation && (
                    <Modal
                        isOpen={isViewModalOpen}
                        onClose={() => setIsViewModalOpen(false)}
                        title="Simulation Details"
                    // size="lg"
                    >
                        <ModalHeader>
                            <h2 className="text-xl font-semibold">{selectedSimulation.name}</h2>
                            <p className="text-sm text-muted-foreground">
                                Created on {format(new Date(selectedSimulation.createdAt), 'MMMM d, yyyy')}
                            </p>
                        </ModalHeader>
                        <ModalBody>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2">Simulated Expenses</h3>
                                    {selectedSimulation.expenses.length === 0 ? (
                                        <p className="text-muted-foreground">No expenses in this simulation</p>
                                    ) : (
                                        <div className="border rounded-md divide-y">
                                            {selectedSimulation.expenses.map((expense) => (
                                                <div key={expense.id} className="p-3">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium">{expense.description}</span>
                                                        <span className="font-semibold">
                                                            ${parseFloat(expense.amount.toString()).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                                        <span>{expense.category}</span>
                                                        <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="font-medium mb-2">Budget Impact</h3>
                                    <BudgetImpactAnalysis simulationId={selectedSimulation.id} />
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <div className="flex justify-between w-full">
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDeleteSimulation(selectedSimulation.id)}
                                >
                                    Delete Simulation
                                </Button>
                                <div className="space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsViewModalOpen(false)}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        onClick={() => handleConvertToExpenses(selectedSimulation.id)}
                                        disabled={selectedSimulation.expenses.length === 0}
                                    >
                                        Convert to Expenses
                                    </Button>
                                </div>
                            </div>
                        </ModalFooter>
                    </Modal>
                )}
            </div>
        </DashboardLayout>
    );
}