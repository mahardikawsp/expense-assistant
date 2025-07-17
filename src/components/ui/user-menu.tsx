'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

import { Button } from './button';

export function UserMenu() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get user initials for avatar
    const getInitials = () => {
        if (!session?.user?.name) return 'U';
        return session.user.name
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/' });
    };

    if (!session) {
        return (
            <div className="flex items-center gap-4">
                <Link href="/login">
                    <Button variant="outline" size="sm">Log in</Button>
                </Link>
                <Link href="/register">
                    <Button size="sm">Sign up</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
                {session.user.image ? (
                    <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <span className="text-xs font-medium">{getInitials()}</span>
                    </div>
                )}
                <span className="hidden md:inline text-sm font-medium">
                    {session.user.name || 'User'}
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-card shadow-lg border border-border z-10">
                    <div className="py-1">
                        <div className="px-4 py-2 border-b border-border">
                            <p className="text-sm font-medium">{session.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsOpen(false)}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsOpen(false)}
                        >
                            Profile
                        </Link>
                        <Link
                            href="/settings"
                            className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsOpen(false)}
                        >
                            Settings
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent hover:text-destructive border-t border-border"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}