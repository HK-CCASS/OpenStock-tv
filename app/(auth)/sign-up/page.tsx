'use client';

import {useForm} from "react-hook-form";
import {Button} from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import {INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS} from "@/lib/constants";
import {CountrySelectField} from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import {signUpWithEmail} from "@/lib/actions/auth.actions";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import React from "react";

/**
 * Sign-up page component for OpenStock user registration
 *
 * Client-side component that provides user registration functionality
 * with personalization options for investment preferences. Integrates with
 * Better Auth and React Hook Form for comprehensive form validation.
 *
 * @fileoverview User registration page with investment preference collection
 * @since 1.0.0
 */

/**
 * Form data interface for sign-up form including personalization fields
 */
interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  country: string;
  investmentGoals: string;
  riskTolerance: string;
  preferredIndustry: string;
}

/**
 * Sign-up page component
 *
 * Handles user registration with personalization options including
 * country, investment goals, risk tolerance, and preferred industry.
 * Provides comprehensive form validation and user feedback.
 *
 * @returns JSX element containing the registration form
 *
 * @example
 * ```tsx
 * // Renders comprehensive registration form with personalization
 * // Collects user preferences for personalized experience
 * ```
 *
 * @since 1.0.0
 */
const SignUp = () => {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'IN',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    }, );

    /**
 * Handle form submission for user registration
 *
 * Processes the registration request with personalization data,
 * handles success/error states, and provides user feedback
 * through toast notifications.
 *
 * @param data - Form data including user info and investment preferences
 * @returns Promise<void>
 *
 * @since 1.0.0
 */
    const onSubmit = async (data: SignUpFormData) => {
        try {
            // Attempt to register user with provided credentials and preferences
            const result = await signUpWithEmail(data);
            if (result.success) {
                // Redirect to main application on successful registration
                router.push('/');
                return;
            }
            // Show error notification for failed registration
            toast.error('Sign up failed', {
                description: result.error ?? 'We could not create your account.',
            });
        } catch (e) {
            console.error(e);
            // Show generic error notification for unexpected errors
            toast.error('Sign up failed', {
                description: e instanceof Error ? e.message : 'Failed to create an account.'
            })
        }
    }

    return (
        <>
            {/* Page title emphasizing personalization */}
            <h1 className="form-title">Sign Up & Personalize</h1>

            {/* Registration form with personalization options */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Full name input field */}
                <InputField
                    name="fullName"
                    label="Full Name"
                    placeholder="Enter full name"
                    register={register}
                    error={errors.fullName}
                    validation={{ required: 'Full name is required', minLength: 2 }}
                />

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
                    placeholder="Enter a strong password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Password is required', minLength: 8 }}
                />

                {/* Country selection for personalization */}
                <CountrySelectField
                    name="country"
                    label="Country"
                    control={control}
                    error={errors.country}
                    required
                />

                {/* Investment goals selection */}
                <SelectField
                    name="investmentGoals"
                    label="Investment Goals"
                    placeholder="Select your investment goal"
                    options={INVESTMENT_GOALS}
                    control={control}
                    error={errors.investmentGoals}
                    required
                />

                {/* Risk tolerance selection */}
                <SelectField
                    name="riskTolerance"
                    label="Risk Tolerance"
                    placeholder="Select your risk level"
                    options={RISK_TOLERANCE_OPTIONS}
                    control={control}
                    error={errors.riskTolerance}
                    required
                />

                {/* Preferred industry selection */}
                <SelectField
                    name="preferredIndustry"
                    label="Preferred Industry"
                    placeholder="Select your preferred industry"
                    options={PREFERRED_INDUSTRIES}
                    control={control}
                    error={errors.preferredIndustry}
                    required
                />

                {/* Submit button with loading state */}
                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'Creating Account' : 'Start Your Investing Journey'}
                </Button>

                {/* Link to sign-in page */}
                <FooterLink text="Already have an account?" linkText="Sign in" href="/sign-in" />

                {/* Open Dev Society branding */}
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center"/>
            </form>
        </>
    )
}

/**
 * Default export for sign-up page component
 *
 * @since 1.0.0
 */
export default SignUp;
