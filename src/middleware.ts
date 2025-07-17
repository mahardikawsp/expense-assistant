import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCspNonce } from './lib/security-utils';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Generate a nonce for CSP
  const nonce = generateCspNonce();

  // Create a response
  const response = NextResponse.next();

  // Add security headers
  // Content Security Policy with nonce for scripts
  // Allow 'unsafe-eval' in development mode for better debugging
  const scriptSrc = process.env.NODE_ENV === 'development'
    ? `'self' 'unsafe-eval' 'nonce-${nonce}' https://cdn.jsdelivr.net https://www.google-analytics.com`
    : `'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://www.google-analytics.com`;

  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src ${scriptSrc}; connect-src 'self' https://vitals.vercel-insights.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; frame-src 'self' https://accounts.google.com`
  );

  // Other security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Add CSRF protection
  response.headers.set('X-CSRF-Protection', '1');

  // HSTS (Strict-Transport-Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Cache control for static assets
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (path.startsWith('/api')) {
    // No caching for API routes
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  } else {
    // Default cache control
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/expenses/:path*',
    '/income/:path*',
    '/budget/:path*',
    '/simulation/:path*',
    '/analytics/:path*',
    '/api/:path*',
  ],
};