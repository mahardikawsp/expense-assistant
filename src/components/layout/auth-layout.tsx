'use client';

import Link from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';

interface AuthLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b border-border">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/" className="flex items-center">
                        <span className="text-2xl font-bold text-primary">Expense Assistant</span>
                    </Link>
                </div>
            </header>

            <main className={cn("flex-1 flex items-center justify-center px-4 py-8", className)}>
                <div className="w-full">
                    {children}
                </div>
            </main>

            <footer className="border-t border-border py-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-muted-foreground text-sm">
                            © {new Date().getFullYear()} Expense Assistant. All rights reserved.
                        </p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Terms
                            </Link>
                            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Privacy
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}