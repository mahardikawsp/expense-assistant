'use client';

import { signOut } from 'next-auth/react';
import React from 'react';

import { Button, ButtonProps } from '@/components/ui/button';

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
    redirectUrl?: string;
}

export function LogoutButton({
    children = 'Sign out',
    redirectUrl = '/',
    variant = 'ghost',
    size = 'sm',
    ...props
}: LogoutButtonProps) {
    const handleSignOut = async () => {
        try {
            await signOut({ callbackUrl: redirectUrl });
        } catch {

            // Error is handled by NextAuth
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleSignOut}
            {...props}
        >
            {children}
        </Button>
    );
}