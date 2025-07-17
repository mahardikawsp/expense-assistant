import { auth } from './auth';

/**
 * Get the current user's session on the server side
 * @returns The user's session or null if not authenticated
 */
export async function getSession() {
  return await auth();
}

/**
 * Check if the current user is authenticated on the server side
 * @returns True if the user is authenticated, false otherwise
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

/**
 * Get the current user's information on the server side
 * @returns The user object or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}