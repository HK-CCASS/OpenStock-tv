import Link from "next/link";
import React from "react";
import Image from "next/image";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/better-auth/auth";

/**
 * Authentication layout component for OpenStock
 *
 * This layout provides the visual structure for authentication pages
 * including sign-in and sign-up forms. It implements session protection
 * to redirect authenticated users away from auth pages.
 *
 * @fileoverview Layout wrapper for authentication routes
 * @since 1.0.0
 */

/**
 * Authentication layout component
 *
 * Server-side component that protects authentication routes by checking
 * for existing user sessions and redirecting authenticated users
 * to the main application.
 *
 * @param children - Authentication page components (sign-in, sign-up)
 * @returns JSX element with authentication layout structure
 *
 * @example
 * ```tsx
 * // This layout wraps sign-in and sign-up pages
 * // Users with active sessions are redirected to "/"
 * ```
 *
 * @since 1.0.0
 */
const Layout = async ({ children }: { children : React.ReactNode }) => {

    // Get current user session using Better Auth
    const session = await auth.api.getSession({headers: await headers()});

    // Redirect authenticated users away from auth pages
    if (session?.user) redirect('/')
    return (
        <main className="auth-layout">
            {/* Left section: Logo and authentication forms */}
            <section className="auth-left-section scrollbar-hide-default">
                <Link href="/" className="auth-logo flex items-center gap-2">
                    <Image src="/assets/images/logo.png" alt="Openstock" width={200} height={50}/>
                </Link>

                {/* Authentication form container */}
                <div className="pb-6 lg:pb-8 flex-1">
                    {children}
                </div>
            </section>

            {/* Right section: Testimonial and dashboard preview */}
            <section className="auth-right-section">
                {/* Founder testimonial */}
                <div className="z-10 relative lg:mt-4 lg:mb-16">
                    <blockquote className="auth-blockquote">
                        "For me, OpenStock isn't just another stock app. It's about giving people clarity and control in the market, without barriers or subscriptions."
                    </blockquote>
                    <div className="flex items-center justify-between">
                        <div>
                            <cite className="auth-testimonial-author">- Ravi Pratap Singh (@ravixalgorithm)</cite>
                            <p className="max-md:text-xs text-gray-500">Founder @opendevsociety</p>
                        </div>
                        {/* 5-star rating display */}
                        <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map((star) => (
                                <Image src="/assets/icons/star.svg" alt="star" key={star} width={20} height={20} className="w-4 h-4"/>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Dashboard preview image */}
                <div className="flex-1 relative">
                    <Image src="/assets/images/dashboard.png" alt="Dashboard Preview" width={1440} height={1150} className="auth-dashboard-preview absolute top-0" />
                </div>
            </section>

        </main>
    )
}
/**
 * Default export for authentication layout
 *
 * Exports the Layout component as the default export for use
 * in Next.js App Router route group configuration.
 *
 * @since 1.0.0
 */
export default Layout
