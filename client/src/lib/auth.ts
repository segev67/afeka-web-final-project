/**
 * ===========================================
 * AUTHENTICATION UTILITIES FOR CLIENT
 * ===========================================
 * 
 * This file contains client-side authentication utilities.
 * Used by components to interact with the auth server.
 * 
 * DEFENSE NOTES:
 * - These functions run in the browser (client-side)
 * - They communicate with the Express auth server
 * - Access tokens are stored in memory (not localStorage for security)
 */

import Cookies from 'js-cookie';

// ===========================================
// TYPES
// ===========================================

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
  };
}

export interface TokenResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
  };
}

// ===========================================
// CONSTANTS
// ===========================================

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5001';

// Cookie name for storing access token
// Note: We store access token in a regular cookie for simplicity
// In production, consider keeping it in memory only
const ACCESS_TOKEN_COOKIE = 'accessToken';

// ===========================================
// TOKEN MANAGEMENT
// ===========================================

/**
 * Store Access Token
 * 
 * DEFENSE EXPLANATION:
 * - We use js-cookie to store the access token
 * - This is accessible by JavaScript (not httpOnly)
 * - For better security, keep token in memory/React state
 * - We use cookies here for persistence across page refreshes
 * 
 * @param token - JWT access token
 */
export const setAccessToken = (token: string): void => {
  Cookies.set(ACCESS_TOKEN_COOKIE, token, {
    expires: 1 / 96, // 15 minutes (1 day / 96)
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
};

/**
 * Get Access Token from Cookie
 */
export const getAccessToken = (): string | undefined => {
  return Cookies.get(ACCESS_TOKEN_COOKIE);
};

/**
 * Remove Access Token
 */
export const removeAccessToken = (): void => {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
};

// ===========================================
// AUTH API FUNCTIONS
// ===========================================

/**
 * Register New User
 * 
 * @param username - User's display name
 * @param email - User's email
 * @param password - User's password
 * @returns AuthResponse with user data and access token
 */
export const register = async (
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${AUTH_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for refresh token
    body: JSON.stringify({ username, email, password }),
  });

  const data: AuthResponse = await response.json();

  if (data.success && data.data?.accessToken) {
    setAccessToken(data.data.accessToken);
  }

  return data;
};

/**
 * Login User
 * 
 * @param email - User's email
 * @param password - User's password
 * @returns AuthResponse with user data and access token
 */
export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for refresh token
    body: JSON.stringify({ email, password }),
  });

  const data: AuthResponse = await response.json();

  if (data.success && data.data?.accessToken) {
    setAccessToken(data.data.accessToken);
  }

  return data;
};

/**
 * Refresh Access Token (Silent Refresh)
 * 
 * DEFENSE EXPLANATION:
 * This is the client-side part of the silent refresh mechanism.
 * 
 * HOW IT WORKS:
 * 1. Client calls this function when access token is expired
 * 2. Request includes credentials (refresh token in httpOnly cookie)
 * 3. Auth server validates refresh token and returns new access token
 * 4. Client stores the new access token
 * 
 * WHEN TO CALL:
 * - When an API request returns 401 with TOKEN_EXPIRED code
 * - Automatically before token expires (proactive refresh)
 * 
 * @returns TokenResponse with new access token
 */
export const refreshAccessToken = async (): Promise<TokenResponse> => {
  try {
    const response = await fetch(`${AUTH_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // CRITICAL: Sends httpOnly cookie with refresh token
    });

    const data: TokenResponse = await response.json();

    if (data.success && data.data?.accessToken) {
      setAccessToken(data.data.accessToken);
    }

    return data;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return {
      success: false,
      message: 'Failed to refresh token',
    };
  }
};

/**
 * Logout User
 * 
 * Clears both client-side token and server-side refresh token cookie.
 */
export const logout = async (): Promise<void> => {
  // Clear client-side token
  removeAccessToken();

  // Call server to clear httpOnly refresh token cookie
  try {
    await fetch(`${AUTH_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};

/**
 * Verify Token with Auth Server
 * 
 * Useful for checking if user is still authenticated.
 * 
 * @returns User data if token is valid, null otherwise
 */
export const verifyToken = async (): Promise<User | null> => {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${AUTH_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success && data.data?.user) {
      // Map userId from JWT to id for consistency
      const user = data.data.user;
      return {
        id: user.userId || user.id, // JWT has userId, map to id
        username: user.username,
        email: user.email,
      };
    }

    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

/**
 * Make Authenticated Request
 * 
 * Helper function that adds auth header and handles token refresh.
 * 
 * DEFENSE EXPLANATION:
 * This implements automatic token refresh on 401 errors.
 * 
 * FLOW:
 * 1. Make request with current access token
 * 2. If 401 (token expired), try to refresh token
 * 3. If refresh succeeds, retry original request
 * 4. If refresh fails, user needs to login again
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Response from fetch
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAccessToken();

  // Add authorization header
  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : '',
  };

  // Make initial request
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    const refreshResult = await refreshAccessToken();

    if (refreshResult.success) {
      // Retry with new token
      const newToken = getAccessToken();
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    }
  }

  return response;
};
