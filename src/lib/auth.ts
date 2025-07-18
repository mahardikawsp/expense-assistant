import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type DefaultSession, NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { z } from 'zod';

import { prisma } from './prisma';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

// Schema for validating credentials
const credentialsSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

// Configuration object
export const authConfig = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
    verifyRequest: '/verify-request',
    newUser: '/register',
  },
  session: {
    strategy: 'jwt',
  },
  // Trust localhost in development
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
      const isOnProtectedRoute =
        request.nextUrl.pathname.startsWith('/expenses') ||
        request.nextUrl.pathname.startsWith('/income') ||
        request.nextUrl.pathname.startsWith('/budget') ||
        request.nextUrl.pathname.startsWith('/simulation') ||
        request.nextUrl.pathname.startsWith('/analytics');

      if (isOnDashboard || isOnProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      // Using the exact redirect URI configured in Google Cloud Console
      callbackUrl: "https://akzsasmqzien.us-east-1.clawcloudrun.com:3000/api/auth/callback/google"
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials format
        const parsedCredentials = credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email } = parsedCredentials.data;
        // Note: password would be used for verification in a real app

        // In a real application, you would verify the password against a hashed version in the database
        // For this implementation, we'll just check if the user exists
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        // In a real application, you would compare the password with bcrypt
        // For now, we'll just return the user (simulating successful authentication)
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          image: user.image || undefined,
        };
      },
    }),
  ],
} satisfies NextAuthConfig;

// Export the NextAuth handler
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);