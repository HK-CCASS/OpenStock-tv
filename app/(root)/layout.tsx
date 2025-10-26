import Header from "@/components/Header";
import {auth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Footer from "@/components/Footer";

/**
 * Root layout for authenticated application routes
 *
 * This layout wraps all authenticated pages in the application,
 * providing header navigation, footer, and authentication protection.
 * It extracts user session data and passes it to child components.
 *
 * @fileoverview Main layout wrapper for authenticated routes
 * @since 1.0.0
 */

/**
 * Authenticated layout component
 *
 * Server-side component that protects application routes by checking
 * for valid user sessions and redirects unauthenticated users
 * to the sign-in page.
 *
 * @param children - Page components that require authentication
 * @returns JSX element with authenticated application layout
 *
 * @example
 * ```tsx
 * // This layout wraps all authenticated pages
 * // Users without sessions are redirected to "/sign-in"
 * ```
 *
 * @since 1.0.0
 */
const Layout = async ({ children }: { children : React.ReactNode }) => {
    // Get current user session using Better Auth
    const session = await auth.api.getSession({ headers: await headers() });

    // Redirect unauthenticated users to sign-in page
    if(!session?.user) redirect('/sign-in');

    // Extract and format user data for component consumption
    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    }

    return (
        <main className="min-h-screen text-gray-400">
            {/* Global header with user context */}
            <Header user={user} />

            {/* Main content container with responsive padding */}
            <div className="container py-10">
                {children}
            </div>

            {/* Global footer */}
            <Footer />
        </main>
    )
}

/**
 * Default export for authenticated layout
 *
 * Exports the Layout component as the default export for use
 * in Next.js App Router route group configuration.
 *
 * @since 1.0.0
 */
export default Layout