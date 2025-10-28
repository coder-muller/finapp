import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const publicRoutes = [
    "/",
    "/login",
    "/register",
]

const betterAuthRoutes = [
    "/api/auth",
    "/api/auth/callback",
]

export async function middleware(req: NextRequest) {
    const sessionCookie = getSessionCookie(req)

    const { pathname } = req.nextUrl
    const isPublicRoute = publicRoutes.includes(pathname)
    const isBetterAuthRoute = betterAuthRoutes.includes(pathname)
    const isLoginRoute = pathname === "/login"
    const isLoggedIn = !!sessionCookie

    // Better Auth routes
    if (isBetterAuthRoute) {
        return NextResponse.next()
    }

    // Redirect autenticated users to the profile page
    if (isLoggedIn && isLoginRoute) {
        return NextResponse.redirect(new URL("/profile", req.url))
    }

    // Public routes
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Redirect unautenticated users to the login page
    if (!isLoggedIn && !isPublicRoute && !isBetterAuthRoute) {
        return NextResponse.redirect(new URL("/login", req.url))
    }

    // Next response
    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}