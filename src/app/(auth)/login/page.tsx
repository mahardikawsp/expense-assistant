'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Form, FormError, FormField, FormLabel } from '@/components/forms/form';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CsrfContext } from '@/app/providers';
import { sanitizeInput, validateEmail } from '@/lib/security-utils';

// Login form schema with enhanced validation
const loginSchema = z.object({
    email: z
        .string()
        .min(1, { message: 'Email is required' })
        .email({ message: 'Please enter a valid email address' })
        .transform((email) => {
            // Sanitize email input
            const sanitized = validateEmail(email);
            return sanitized || email;
        }),
    password: z
        .string()
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(100, { message: 'Password is too long' }),
    csrfToken: z.string(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { csrfToken, refreshCsrfToken } = useContext(CsrfContext);

    // Initialize form with CSRF token
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            csrfToken: '',
        },
    });

    // Update CSRF token when it changes
    useEffect(() => {
        form.setValue('csrfToken', csrfToken);
    }, [csrfToken, form]);

    // Refresh CSRF token on mount
    useEffect(() => {
        refreshCsrfToken();
    }, [refreshCsrfToken]);

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // Verify CSRF token
            if (data.csrfToken !== csrfToken) {
                setError('Security validation failed. Please refresh the page and try again.');
                return;
            }

            // Sanitize inputs before submission
            const sanitizedEmail = sanitizeInput(data.email);

            const result = await signIn('credentials', {
                redirect: false,
                email: sanitizedEmail,
                password: data.password,
                csrfToken: data.csrfToken,
            });

            if (!result?.ok) {
                setError('Invalid email or password. Please try again.');
                // Refresh CSRF token after failed attempt
                refreshCsrfToken();
                return;
            }

            // Successful login - navigate to callback URL
            router.push(callbackUrl);
            router.refresh();
        } catch (_error) {
            setError('An unexpected error occurred. Please try again.');
            // Refresh CSRF token after error
            refreshCsrfToken();
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await signIn('google', {
                callbackUrl,
                csrfToken
            });
        } catch (_error) {
            setError('An error occurred with Google sign in. Please try again.');
            setIsLoading(false);
            // Refresh CSRF token after error
            refreshCsrfToken();
        }
    };

    return (
        <AuthLayout>
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 w-full">
                <div className="mb-6 text-center">
                    <h1 className="text-xl sm:text-2xl font-bold">Welcome back</h1>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">Sign in to your account</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                <Form form={form} onSubmit={onSubmit} className="space-y-4">
                    {/* Hidden CSRF token field */}
                    <input type="hidden" {...form.register('csrfToken')} />

                    <FormField>
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={isLoading}
                            {...form.register('email')}
                        />
                        <FormError>{form.formState.errors.email?.message}</FormError>
                    </FormField>

                    <FormField>
                        <div className="flex items-center justify-between">
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isLoading}
                            {...form.register('password')}
                        />
                        <FormError>{form.formState.errors.password?.message}</FormError>
                    </FormField>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                </Form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                            focusable="false"
                            data-prefix="fab"
                            data-icon="google"
                            role="img"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 488 512"
                        >
                            <path
                                fill="currentColor"
                                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                            ></path>
                        </svg>
                        Sign in with Google
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <p>
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-primary hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}