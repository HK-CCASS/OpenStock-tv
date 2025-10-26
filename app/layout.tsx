import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {Toaster} from "@/components/ui/sonner";
import "./globals.css";

/**
 * Root layout configuration for the OpenStock application
 *
 * This file defines the top-level layout structure including:
 * - Font configuration (Geist Sans and Geist Mono)
 * - Application metadata (title, description)
 * - Global layout wrapper with dark theme
 * - Toast notification integration
 *
 * @fileoverview Root layout wrapper for Next.js App Router
 * @since 1.0.0
 */

/**
 * Geist Sans font configuration
 *
 * Configures the primary sans-serif font for the application
 * with CSS variable for consistent usage across components
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono font configuration
 *
 * Configures the monospace font for code display and data
 * with CSS variable for consistent usage across components
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Application metadata configuration
 *
 * Defines SEO and display metadata for the OpenStock application
 * including title and description for search engines and browsers
 */
export const metadata: Metadata = {
  title: "OpenStock",
  description: "OpenStock is an open-source alternative to expensive market platforms. Track real-time prices, set personalized alerts, and explore detailed company insights — built openly, for everyone, forever free.",
};

/**
 * Root layout component for the OpenStock application
 *
 * Provides the top-level layout structure with:
 * - HTML document structure with English language and dark theme
 * - Body with configured fonts and antialiasing
 * - Children rendering slot for nested layouts/pages
 * - Global toast notification system integration
 *
 * @param children - Nested layout or page components from Next.js App Router
 * @returns JSX element containing the complete HTML document structure
 *
 * @example
 * ```tsx
 * // This layout is automatically applied to all routes in the app
 * // Pages and nested layouts will render as children
 * ```
 *
 * @since 1.0.0
 */
export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                {children}
                <Toaster/>
            </body>
        </html>
    );
}
