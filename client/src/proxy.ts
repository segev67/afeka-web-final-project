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
 * Refresh Access Token using Refresh Token
 * 
 * DEFENSE EXPLANATION:
 * - This implements "silent refresh" as required by the project
 * - When access token expires, we use refresh token to get a new one
 * - User never notices - happens automatically in the background
 * - Project requirement: "refresh silently (unnoticed by the user)"
 * 
 * @param refreshToken - The refresh token from cookies
 * @returns Object with new tokens or null if refresh failed
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; newRefreshToken?: string } | null> {
  try {
    const authServerUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:5001';
    
    console.log('[Proxy] 🔄 Access token expired, attempting silent refresh...');
    
    // Send refresh token as cookie (matching auth server expectations)
    const response = await fetch(`${authServerUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `refreshToken=${refreshToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.log('[Proxy] ❌ Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.accessToken) {
      console.log('[Proxy] ✅ Token refreshed successfully (silent)');
      
      // Check if server sent a new refresh token (token rotation)
      const setCookieHeader = response.headers.get('set-cookie');
      let newRefreshToken: string | undefined;
      
      if (setCookieHeader) {
        const refreshTokenMatch = setCookieHeader.match(/refreshToken=([^;]+)/);
        if (refreshTokenMatch) {
          newRefreshToken = refreshTokenMatch[1];
          console.log('[Proxy] 🔄 Refresh token rotated');
        }
      }
      
      return {
        accessToken: data.accessToken,
        newRefreshToken,
      };
    }

    return null;
  } catch (error) {
    console.error('[Proxy] ❌ Error refreshing token:', error);
    return null;
  }
}

/**
 * Main Proxy Function
 * 
 * DEFENSE EXPLANATION:
 * 
 * EXECUTION FLOW:
 * 1. Check if route is protected
 * 2. Get access token from cookie
 * 3. Decode and validate token (soft validation)
 * 4. If expired, attempt silent refresh with refresh token
 * 5. Redirect to login only if refresh fails
 * 6. Continue to page if valid
 * 
 * "SOFT" VALIDATION:
 * - We don't verify the signature here (Edge limitation)
 * - We only check structure and expiration
 * - Full verification happens when making API calls
 * - This provides UX benefit without security risk
 * 
 * SILENT REFRESH:
 * - Project requirement: token should "refresh silently (unnoticed by the user)"
 * - When access token expires, we automatically use refresh token
 * - User stays logged in without interruption
 * - Only redirect to login if refresh token is also invalid
 * 
 * @param request - Incoming Next.js request
 * @returns NextResponse (continue, redirect, or rewrite)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get tokens from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

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
    // No access token = check for refresh token
    if (!accessToken) {
      // Try to refresh if we have a refresh token
      if (refreshToken) {
        console.log(`[Proxy] No access token, attempting silent refresh...`);
        const refreshResult = await refreshAccessToken(refreshToken);
        
        if (refreshResult) {
          // Success! Set new access token and continue
          const response = NextResponse.next();
          response.cookies.set('accessToken', refreshResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 15, // 15 minutes
          });
          
          // Update refresh token if server rotated it
          if (refreshResult.newRefreshToken) {
            response.cookies.set('refreshToken', refreshResult.newRefreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 7 days
            });
          }
          
          console.log(`[Proxy] ✅ Silent refresh successful, allowing access to ${pathname}`);
          return response;
        }
      }
      
      // No refresh token or refresh failed - redirect to login
      console.log(`[Proxy] No valid tokens, redirecting to login from ${pathname}`);
      
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      
      const response = NextResponse.redirect(loginUrl);
      // Clear any stale cookies
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      
      return response;
    }

    // Decode and check access token
    const decoded = decodeToken(accessToken);

    if (!decoded || isTokenExpired(decoded.exp)) {
      console.log(`[Proxy] Access token expired or invalid`);
      
      // Try silent refresh with refresh token
      if (refreshToken) {
        console.log('[Proxy] Attempting silent token refresh...');
        const refreshResult = await refreshAccessToken(refreshToken);
        
        if (refreshResult) {
          // Success! Set new access token and continue
          const response = NextResponse.next();
          response.cookies.set('accessToken', refreshResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 15, // 15 minutes
          });
          
          // Update refresh token if server rotated it
          if (refreshResult.newRefreshToken) {
            response.cookies.set('refreshToken', refreshResult.newRefreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 7 days
            });
          }
          
          console.log(`[Proxy] ✅ Token refreshed silently, allowing access to ${pathname}`);
          return response;
        }
      }
      
      // Refresh failed - redirect to login
      console.log(`[Proxy] Token refresh failed, redirecting to login`);
      
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      
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
