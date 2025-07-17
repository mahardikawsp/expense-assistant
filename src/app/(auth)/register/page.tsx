'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Form, FormError, FormField, FormLabel } from '@/components/forms/form';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Registration form schema
const registerSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // In a real application, you would make an API call to create the user
            // For this implementation, we'll simulate a successful registration

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // After successful registration, sign in the user
            const result = await signIn('credentials', {
                redirect: false,
                email: data.email,
                password: data.password,
            });

            if (!result?.ok) {
                setError('Failed to sign in after registration. Please try logging in.');
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch (_error) {
            setError(`${_error} An unexpected error occurred. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await signIn('google', { callbackUrl: '/dashboard' });
        } catch (_error) {
            setError(`${_error} An error occurred with Google sign in. Please try again.`);
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 w-full">
                <div className="mb-6 text-center">
                    <h1 className="text-xl sm:text-2xl font-bold">Create an account</h1>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">Sign up to get started</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                <Form form={form} onSubmit={onSubmit} className="space-y-4">
                    <FormField>
                        <FormLabel htmlFor="name">Name</FormLabel>
                        <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            autoComplete="name"
                            disabled={isLoading}
                            {...form.register('name')}
                        />
                        <FormError>{form.formState.errors.name?.message}</FormError>
                    </FormField>

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
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...form.register('password')}
                        />
                        <FormError>{form.formState.errors.password?.message}</FormError>
                    </FormField>

                    <FormField>
                        <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...form.register('confirmPassword')}
                        />
                        <FormError>{form.formState.errors.confirmPassword?.message}</FormError>
                    </FormField>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Create account'}
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
                        Sign up with Google
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <p>
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}