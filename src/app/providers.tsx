'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, createContext, useCallback, useEffect, useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { generateCsrfToken } from '@/lib/security-utils';

// Create CSRF context
export const CsrfContext = createContext<{
    csrfToken: string;
    refreshCsrfToken: () => void;
}>({
    csrfToken: '',
    refreshCsrfToken: () => { },
});

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [csrfToken, setCsrfToken] = useState<string>('');

    // Generate a new CSRF token
    const refreshCsrfToken = useCallback(() => {
        const newToken = generateCsrfToken();
        setCsrfToken(newToken);
        // Store in sessionStorage for use in forms
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('csrfToken', newToken);
        }
    }, []);

    // Initialize CSRF token on mount
    useEffect(() => {
        refreshCsrfToken();
    }, [refreshCsrfToken]);

    return (
        <SessionProvider>
            <CsrfContext.Provider value={{ csrfToken, refreshCsrfToken }}>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </CsrfContext.Provider>
        </SessionProvider>
    );
}