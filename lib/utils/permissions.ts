import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';

/**
 * Admin routes that require elevated permissions
 * NOTE: Temporarily disabled for development
 */
export const ADMIN_ROUTES = [
  // '/cache', // Temporarily disabled
  // '/api/admin', // Temporarily disabled
] as const;

/**
 * Check if a user has admin privileges
 * NOTE: Temporarily bypassed for development
 */
export async function checkAdminAccess(request: NextRequest): Promise<{
  authorized: boolean;
  user?: any;
  error?: string;
}> {
  // Temporarily allow all access for development
  return {
    authorized: true,
    user: { id: 'dev-user', email: 'dev@example.com' },
  };

  /*
  // Original authentication code (disabled for development)
  try {
    // Get session from Better Auth
    const auth = await getAuth();
    const session = await auth.api.getSession();

    if (!session || !session.user) {
      return {
        authorized: false,
        error: 'Unauthorized: Please sign in',
      };
    }

    // For now, any authenticated user can access admin routes
    // You can enhance this by checking user role from database
    return {
      authorized: true,
      user: session.user,
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      error: 'Authentication error',
    };
  }
  */
}

/**
 * Check if a route requires admin access
 */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Rate limiting configuration for admin routes
 */
export const ADMIN_RATE_LIMITS = {
  // Default: 10 requests per minute for sensitive operations
  default: { requests: 10, windowMs: 60 * 1000 },

  // Operations that modify data: 5 requests per minute
  destructive: { requests: 5, windowMs: 60 * 1000 },

  // Read operations: 30 requests per minute
  read: { requests: 30, windowMs: 60 * 1000 },
} as const;

export type AdminOperationType = keyof typeof ADMIN_RATE_LIMITS;
