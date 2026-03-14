/**
 * ===========================================
 * AUTH SERVER ACTIONS
 * ===========================================
 * 
 * Server Actions for authentication.
 * These run on the server and can set httpOnly cookies securely.
 * 
 * DEFENSE NOTES:
 * - Server Actions can set httpOnly cookies (more secure than client-side)
 * - Proper sameSite settings for cross-domain (Vercel)
 * - Matches proxy middleware cookie settings
 */

'use server';

import { cookies } from 'next/headers';

// ===========================================
// TYPES
// ===========================================

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      username: string;
      email: string;
    };
    accessToken: string;
  };
}

// ===========================================
// CONSTANTS
// ===========================================

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:4000';

// Parse JWT expiration string to seconds (same as proxy.ts)
function parseJwtExpiration(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 15; // Default 15 minutes
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return 60 * 15;
  }
}

const ACCESS_TOKEN_MAX_AGE = parseJwtExpiration(process.env.JWT_EXPIRES_IN || '15m');

// ===========================================
// AUTH ACTIONS
// ===========================================

/**
 * Register User (Server Action)
 * 
 * @param username - User's display name
 * @param email - User's email
 * @param password - User's password
 */
export async function registerAction(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, email, password }),
    });

    const data: AuthResponse = await response.json();

    // Set accessToken in httpOnly cookie (more secure)
    if (data.success && data.data?.accessToken) {
      const cookieStore = await cookies();
      cookieStore.set('accessToken', data.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });

      // Check if auth server set refreshToken cookie and forward it
      // (The auth server should have already set it via Set-Cookie header)
    }

    return data;
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      message: 'Registration failed. Please try again.',
    };
  }
}

/**
 * Login User (Server Action)
 * 
 * @param email - User's email
 * @param password - User's password
 */
export async function loginAction(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse = await response.json();

    // Set accessToken in httpOnly cookie (more secure)
    if (data.success && data.data?.accessToken) {
      const cookieStore = await cookies();
      cookieStore.set('accessToken', data.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Login failed. Please try again.',
    };
  }
}

/**
 * Logout User (Server Action)
 */
export async function logoutAction(): Promise<void> {
  try {
    // Call auth server to clear refresh token
    await fetch(`${AUTH_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    // Clear accessToken cookie
    const cookieStore = await cookies();
    cookieStore.delete('accessToken');
  } catch (error) {
    console.error('Logout error:', error);
  }
}
