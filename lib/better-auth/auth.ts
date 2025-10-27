import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import {connectToDatabase} from "@/database/mongoose";
import {nextCookies} from "better-auth/next-js";


let authInstance: ReturnType<typeof betterAuth> | null = null;
let authPromise: Promise<ReturnType<typeof betterAuth>> | null = null;


export const getAuth = async () => {
    if(authInstance) {
        return authInstance;
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection;

    if (!db) {
        throw new Error("MongoDB connection not found!");
    }

    authInstance = betterAuth({
        database: mongodbAdapter(db as any),
       secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
        },
        plugins: [nextCookies()],

    });

    return authInstance;
}

/**
 * Lazy-loaded auth instance
 * Removed top-level await to fix Docker build issues
 * Auth is now initialized on first access at runtime
 */
const getAuthInstance = async () => {
    if (!authPromise) {
        authPromise = getAuth();
    }
    return authPromise;
}

// Export auth object with lazy initialization
// This prevents database connection during build time
export const auth = {
    get api() {
        return {
            getSession: async (...args: any[]) => {
                const instance = await getAuthInstance();
                return instance.api.getSession(...args);
            },
            signIn: async (...args: any[]) => {
                const instance = await getAuthInstance();
                return instance.api.signIn(...args);
            },
            signInEmail: async (...args: any[]) => {
                const instance = await getAuthInstance();
                return instance.api.signInEmail(...args);
            },
            signOut: async (...args: any[]) => {
                const instance = await getAuthInstance();
                return instance.api.signOut(...args);
            },
            signUp: async (...args: any[]) => {
                const instance = await getAuthInstance();
                return instance.api.signUp(...args);
            },
            signUpEmail: async (...args: any[]) => {
                const instance = await getAuthInstance();
                return instance.api.signUpEmail(...args);
            },
        }
    }
};