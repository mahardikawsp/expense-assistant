'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

// Toast types
export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info';

// Toast interface
export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    title?: string;
    duration?: number;
}

// Context interface
interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

// Create context
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Toast provider props
interface ToastProviderProps {
    children: React.ReactNode;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const id = generateId();
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        // Auto-remove toast after duration
        if (toast.duration !== Infinity) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration || 5000);
        }
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const contextValue: ToastContextValue = {
        toasts,
        addToast,
        removeToast,
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            {isMounted &&
                createPortal(<ToastContainer />, document.body)}
        </ToastContext.Provider>
    );
}

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast component
interface ToastComponentProps {
    toast: Toast;
    onClose: () => void;
}

function ToastComponent({ toast, onClose }: ToastComponentProps) {
    const getTypeStyles = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-success/10 border-success text-success';
            case 'error':
                return 'bg-destructive/10 border-destructive text-destructive';
            case 'warning':
                return 'bg-warning/10 border-warning text-warning';
            case 'info':
                return 'bg-info/10 border-info text-info';
            default:
                return 'bg-background border-border text-foreground';
        }
    };

    return (
        <div
            className={cn(
                'pointer-events-auto relative flex w-full max-w items-center rounded-lg border p-4 shadow-lg',
                getTypeStyles()
            )}
        >
            <div className="flex-1 pr-8">
                {toast.title && <h4 className="font-medium">{toast.title}</h4>}
                <p className="text-sm">{toast.message}</p>
            </div>
            <button
                onClick={onClose}
                className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted"
                aria-label="Close toast"
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
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
}

// Toast container
function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 md:max-w-[420px]">
            {toasts.map((toast) => (
                <ToastComponent
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}