import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "./email";
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail({
                to: user.email,
                verificationUrl: url,
                userName: user.name,
            });
        },
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        revokeSessionsOnPasswordReset: true,
        requireEmailVerification: true,
    },
    user: {
        deleteUser: {
            enabled: true,
        }
    },
    plugins: [
        nextCookies(),
        admin()
    ]
});