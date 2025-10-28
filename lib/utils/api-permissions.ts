import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess, AdminOperationType, ADMIN_RATE_LIMITS } from './permissions';

/**
 * Simple in-memory rate limiter (for production, use Redis or similar)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting decorator for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  operationType: AdminOperationType = 'default'
) {
  return async (request: NextRequest) => {
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const path = request.nextUrl.pathname;
    const key = `${clientId}:${path}`;

    const limit = ADMIN_RATE_LIMITS[operationType];
    const now = Date.now();

    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    // Check rate limit
    const current = rateLimitStore.get(key);
    if (current) {
      if (current.count >= limit.requests) {
        return NextResponse.json(
          {
            success: false,
            error: `Rate limit exceeded. Maximum ${limit.requests} requests per ${limit.windowMs / 1000} seconds.`,
          },
          { status: 429 }
        );
      }
      current.count++;
    } else {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + limit.windowMs,
      });
    }

    return handler(request);
  };
}

/**
 * Permission check decorator for API routes
 */
export function withPermissionCheck(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { authorized, user, error } = await checkAdminAccess(request);

    if (!authorized) {
      return NextResponse.json(
        {
          success: false,
          error: error || 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Continue to handler
    return handler(request);
  };
}

/**
 * Combine permission check and rate limiting
 */
export function withAdminSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: {
    operationType?: AdminOperationType;
  }
) {
  const { operationType = 'default' } = options || {};

  // Apply rate limiting first, then permission check
  const rateLimited = withRateLimit(handler, operationType);
  const withAuth = withPermissionCheck(rateLimited);

  return withAuth;
}

/**
 * Operation type mapping for common admin operations
 */
export const OPERATION_TYPES = {
  // Read operations
  GET_OVERVIEW: 'read' as AdminOperationType,
  GET_DATA: 'read' as AdminOperationType,
  GET_METRICS: 'read' as AdminOperationType,

  // Moderate operations
  UPDATE_ENTRY: 'default' as AdminOperationType,
  BATCH_DELETE: 'destructive' as AdminOperationType,
  CLEAR_CACHE: 'destructive' as AdminOperationType,
  EXPORT_DATA: 'default' as AdminOperationType,
} as const;

export type AdminOperation =
  typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];
