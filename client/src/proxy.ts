/**
 * ===========================================
 * NEXT.JS PROXY - JWT VALIDATION
 * ===========================================
 * 
 * This proxy (formerly middleware) runs on EVERY request to protected routes.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS NEXT.JS PROXY?
 * - Next.js 16+ renamed middleware to proxy
 * - Runs on the Edge (before the request reaches the page)
 * - Can redirect, rewrite, or modify headers
 * - Located at src/proxy.ts
 * - Uses matcher config to specify which routes it runs on
 * 
 * PROJECT REQUIREMENT:
 * "Access to every page is accompanied by middleware authorization with the token
 *  (soft - unnoticed by the user)"
 * 
 * "SOFT" AUTHORIZATION MEANS:
 * - We check if token exists and is valid
 * - If invalid, redirect to login
 * - User doesn't see error messages, just gets redirected
 * 
 * IMPORTANT LIMITATION:
 * - Edge runtime doesn't support Node.js modules like 'jsonwebtoken'
 * - We use manual JWT verification
 * - For simplicity, we do basic validation here and full validation on API calls
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================
// CONFIGURATION
// ===========================================

/**
 * Routes that require authentication
 * Users without valid token will be redirected to login
 */
const protectedRoutes = ['/planning', '/history'];

/**
 * Routes that should redirect authenticated users
 * (e.g., login page should redirect to home if already logged in)
 */
const authRoutes = ['/login', '/register'];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Decode JWT without verification (for Edge runtime)
 * 
 * DEFENSE EXPLANATION:
 * - Edge runtime can't use jsonwebtoken library
 * - We decode the token to check basic validity
 * - Full verification happens on the auth server
 * - This is "soft" validation as required by the project
 * 
 * WHAT WE CHECK:
 * - Token exists
 * - Token has three parts (header.payload.signature)
 * - Token is not expired (checking exp claim)
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
function decodeToken(token: string): { exp?: number; userId?: string } | null {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    // Base64Url decode
    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 * 
 * @param exp - Expiration timestamp (seconds since epoch)
 * @returns true if expired, false otherwise
 */
function isTokenExpired(exp?: number): boolean {
  if (!exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= exp * 1000;
}

// ===========================================
// MIDDLEWARE FUNCTION
// ===========================================

/**
 * Main Proxy Function
 * 
 * DEFENSE EXPLANATION:
 * 
 * EXECUTION FLOW:
 * 1. Check if route is protected
 * 2. Get access token from cookie
 * 3. Decode and validate token (soft validation)
 * 4. Redirect to login if invalid
 * 5. Continue to page if valid
 * 
 * "SOFT" VALIDATION:
 * - We don't verify the signature here (Edge limitation)
 * - We only check structure and expiration
 * - Full verification happens when making API calls
 * - This provides UX benefit without security risk
 * 
 * @param request - Incoming Next.js request
 * @returns NextResponse (continue, redirect, or rewrite)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get access token from cookie
  const accessToken = request.cookies.get('accessToken')?.value;

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an auth route (login/register)
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // ===========================================
  // PROTECTED ROUTE HANDLING
  // ===========================================

  if (isProtectedRoute) {
    // No token = redirect to login
    if (!accessToken) {
      console.log(`[Proxy] No token, redirecting to login from ${pathname}`);
      
      const loginUrl = new URL('/login', request.url);
      // Save the original URL to redirect back after login
      loginUrl.searchParams.set('callbackUrl', pathname);
      
      return NextResponse.redirect(loginUrl);
    }

    // Decode and check token
    const decoded = decodeToken(accessToken);

    if (!decoded || isTokenExpired(decoded.exp)) {
      console.log(`[Proxy] Token invalid/expired, redirecting to login`);
      
      // Clear the invalid token
      const response = NextResponse.redirect(
        new URL('/login', request.url)
      );
      response.cookies.delete('accessToken');
      
      return response;
    }

    // Token is valid (at least structurally), allow access
    console.log(`[Proxy] Token valid, allowing access to ${pathname}`);
  }

  // ===========================================
  // AUTH ROUTE HANDLING
  // ===========================================

  if (isAuthRoute) {
    // If user has valid token, redirect to home
    if (accessToken) {
      const decoded = decodeToken(accessToken);
      
      if (decoded && !isTokenExpired(decoded.exp)) {
        console.log(`[Proxy] Already authenticated, redirecting to home`);
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  // ===========================================
  // CONTINUE TO PAGE
  // ===========================================

  return NextResponse.next();
}

// ===========================================
// MATCHER CONFIGURATION
// ===========================================

/**
 * Configure which routes the middleware runs on
 * 
 * DEFENSE EXPLANATION:
 * - matcher specifies URL patterns to run middleware on
 * - We exclude static files, images, and API routes
 * - This improves performance (don't run middleware on every asset)
 * 
 * PATTERN EXPLANATION:
 * - '/((?!api|_next/static|_next/image|favicon.ico).*)' 
 * - Matches everything EXCEPT:
 *   - /api/* (API routes handle their own auth)
 *   - /_next/static/* (static files)
 *   - /_next/image/* (optimized images)
 *   - /favicon.ico
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
