import { NextResponse } from 'next/server';

/**
 * API route for handling logout
 * This is a server-side logout that clears the session cookie
 */
export async function POST() {
  // Create a response with success message
  const response = NextResponse.json({ success: true });
  
  // Clear the session cookies by setting them to expire
  response.cookies.set('next-auth.session-token', '', { 
    expires: new Date(0),
    path: '/' 
  });
  response.cookies.set('__Secure-next-auth.session-token', '', { 
    expires: new Date(0),
    path: '/' 
  });
  
  return response;
}