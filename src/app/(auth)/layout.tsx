import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check if user is already authenticated
    const session = await auth();

    // If user is authenticated, redirect to dashboard
    if (session) {
        redirect('/dashboard');
    }

    return <>{children}</>;
}