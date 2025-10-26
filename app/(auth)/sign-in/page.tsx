'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import {signInWithEmail, signUpWithEmail} from "@/lib/actions/auth.actions";
import {toast} from "sonner";
import {signInEmail} from "better-auth/api";
import {useRouter} from "next/navigation";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import React from "react";

/**
 * Sign-in page component for OpenStock authentication
 *
 * Client-side component that provides user authentication functionality
 * using email and password. Integrates with Better Auth and React Hook Form
 * for form validation and submission handling.
 *
 * @fileoverview User authentication page with form validation
 * @since 1.0.0
 */

/**
 * Form data interface for sign-in form
 */
interface SignInFormData {
  email: string;
  password: string;
}

/**
 * Sign-in page component
 *
 * Handles user authentication through email/password login with form validation,
 * error handling, and user feedback via toast notifications.
 *
 * @returns JSX element containing the sign-in form
 *
 * @example
 * ```tsx
 * // Renders sign-in form with email and password fields
 * // Integrates with Better Auth for authentication
 * ```
 *
 * @since 1.0.0
 */
const SignIn = () => {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    /**
 * Handle form submission for user sign-in
 *
 * Processes the authentication request, handles success/error states,
 * and provides user feedback through toast notifications.
 *
 * @param data - Form data containing email and password
 * @returns Promise<void>
 *
 * @since 1.0.0
 */
    const onSubmit = async (data: SignInFormData) => {
        try {
            // Attempt to sign in user with provided credentials
            const result = await signInWithEmail(data);
            if (result.success) {
                // Redirect to main application on successful authentication
                router.push('/');
                return;
            }
            // Show error notification for failed authentication
            toast.error('Sign in failed', {
                description: result.error ?? 'Invalid email or password.',
            });
        } catch (e) {
            console.error(e);
            // Show generic error notification for unexpected errors
            toast.error('Sign in failed', {
                description: e instanceof Error ? e.message : 'Failed to sign in.'
            })
        }
    }

    return (
        <>
            {/* Page title */}
            <h1 className="form-title">Welcome back</h1>

            {/* Sign-in form with validation */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email input field with validation */}
                <InputField
                    name="email"
                    label="Email"
                    placeholder="opendevsociety@cc.cc"
                    register={register}
                    error={errors.email}
                    validation={{
                      required: 'Email is required',
                      pattern: {
                        value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/,
                        message: 'Please enter a valid email address'
                      }
                    }}
                />

                {/* Password input field with validation */}
                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Password is required', minLength: 8 }}
                />

                {/* Submit button with loading state */}
                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'Signing In' : 'Sign In'}
                </Button>

                {/* Link to sign-up page */}
                <FooterLink text="Don't have an account?" linkText="Create an account" href="/sign-up" />

                {/* Open Dev Society branding */}
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center"/>
            </form>
        </>
    );
};

/**
 * Default export for sign-in page component
 *
 * @since 1.0.0
 */
export default SignIn;
