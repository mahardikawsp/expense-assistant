'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { UserMenu } from '@/components/ui/user-menu';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">Expense Assistant</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/expenses"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Expenses
            </Link>
            <Link
              href="/income"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Income
            </Link>
            <Link
              href="/budget"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Budget
            </Link>
            <Link
              href="/simulation"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Simulation
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent md:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* User menu */}
            <UserMenu />
          </div>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container py-3">
              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  className="block py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/expenses"
                  className="block py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Expenses
                </Link>
                <Link
                  href="/income"
                  className="block py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Income
                </Link>
                <Link
                  href="/budget"
                  className="block py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Budget
                </Link>
                <Link
                  href="/simulation"
                  className="block py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Simulation
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className={cn("flex-1", className)}>
        {children}
      </main>

      <footer className="border-t border-border py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} Expense Assistant. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}