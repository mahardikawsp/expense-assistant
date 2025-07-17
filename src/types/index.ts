/**
 * Core data types for the Expense Assistant application
 */

// Auth types
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }

  interface Session {
    user: {
      id: string;
    } & User;
  }
}

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  description?: string;
  date: Date;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  period: 'monthly' | 'weekly' | 'daily';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'budget_exceeded' | 'budget_warning';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Simulation {
  id: string;
  userId: string;
  name: string;
  expenses: SimulatedExpense[];
  createdAt: Date;
}

export interface SimulatedExpense {
  id: string;
  simulationId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
}