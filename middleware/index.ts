import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from "better-auth/cookies";
import { checkAdminAccess, isAdminRoute } from '@/lib/utils/permissions';

export async function middleware(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);
    const pathname = request.nextUrl.pathname;

    // Cache redirect: redirect /cache to /admin/cache (with authentication check)
    if (pathname === '/cache') {
        // If not authenticated, redirect to sign-in first
        if (!sessionCookie) {
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(signInUrl);
        }

        // If authenticated, redirect to admin cache
        const url = request.nextUrl.clone();
        url.pathname = '/admin/cache';
        return NextResponse.redirect(url);
    }

    // Check cookie presence - prevents obviously unauthorized users
    if (!sessionCookie) {
        // Allow public routes
        if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') ||
            pathname.startsWith('/api/auth') || pathname.startsWith('/_next') ||
            pathname.startsWith('/assets') || pathname === '/favicon.ico') {
            return NextResponse.next();
        }

        // Redirect to sign-in for protected routes
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    // Check admin access for admin routes
    if (isAdminRoute(pathname)) {
        const { authorized, user, error } = await checkAdminAccess(request);

        if (!authorized) {
            // Log unauthorized access attempt
            console.warn(`Unauthorized admin access attempt to ${pathname}`, {
                error,
                userAgent: request.headers.get('user-agent'),
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                timestamp: new Date().toISOString(),
            });

            return NextResponse.json(
                { success: false, error: error || 'Unauthorized' },
                { status: 401 }
            );
        }

        // Add user info to request headers for API routes (for audit logging)
        if (pathname.startsWith('/api/admin')) {
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all request paths except for the ones starting with:
        // - api/auth (authentication routes)
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico (favicon file)
        // - public files (public folder)
        '/((?!api/auth|_next/static|_next/image|favicon.ico|assets|sign-in|sign-up).*)',
    ],
};