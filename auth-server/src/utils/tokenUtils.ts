/**
 * ===========================================
 * JWT TOKEN UTILITIES
 * ===========================================
 * 
 * This file contains utility functions for JWT token generation and verification.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS JWT (JSON Web Token)?
 * - A compact, URL-safe way to represent claims between parties
 * - Consists of three parts: Header.Payload.Signature
 * - Self-contained: contains all user info needed for auth
 * 
 * JWT STRUCTURE:
 * 1. Header: Algorithm and token type ({"alg": "HS256", "typ": "JWT"})
 * 2. Payload: Claims/data (user info, expiration, etc.)
 * 3. Signature: Verification that token hasn't been tampered with
 * 
 * WHY TWO TOKENS (ACCESS + REFRESH)?
 * - Access Token: Short-lived (15 min), used for API requests
 * - Refresh Token: Long-lived (7 days), used to get new access tokens
 * - This is the "silent refresh" mechanism required by the project
 */

import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

// ===========================================
// TYPESCRIPT INTERFACES
// ===========================================

/**
 * Token Payload Interface
 * 
 * DEFENSE: The payload contains user identification
 * The project requires "names of the submitter" to be in the token
 */
export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

/**
 * Decoded Token Interface
 * Extends JwtPayload to include our custom fields
 */
export interface DecodedToken extends JwtPayload, TokenPayload {}

// ===========================================
// TOKEN GENERATION FUNCTIONS
// ===========================================

/**
 * Generate Access Token
 * 
 * DEFENSE EXPLANATION:
 * - Access tokens are short-lived (15 minutes by default)
 * - Used for authenticating API requests
 * - Contains user info so server doesn't need to query DB for every request
 * - Signed with JWT_SECRET to prevent tampering
 * 
 * WHAT HAPPENS IF JWT_SECRET IS EXPOSED?
 * - Attackers can create valid tokens for any user
 * - Complete authentication bypass
 * - Always keep secrets in environment variables, never in code
 * 
 * @param payload - User data to include in token
 * @returns Signed JWT access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  // DEFENSE: expiresIn accepts strings like '15m', '1h', '7d' or numbers (seconds)
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];

  // jwt.sign() creates and signs the token
  // DEFENSE: The signature ensures the token cannot be modified without detection
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generate Refresh Token
 * 
 * DEFENSE EXPLANATION:
 * - Refresh tokens are long-lived (7 days by default)
 * - Used ONLY to get new access tokens (silent refresh)
 * - Stored in httpOnly cookie (not accessible by JavaScript)
 * - Uses a DIFFERENT secret than access tokens for security
 * 
 * WHY DIFFERENT SECRET?
 * - If access token secret is compromised, refresh tokens remain secure
 * - Defense in depth strategy
 * 
 * @param payload - User data to include in token
 * @returns Signed JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  // DEFENSE: Refresh tokens are long-lived (7 days default)
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
};

// ===========================================
// TOKEN VERIFICATION FUNCTIONS
// ===========================================

/**
 * Verify Access Token
 * 
 * DEFENSE EXPLANATION:
 * - jwt.verify() checks both signature validity AND expiration
 * - If token is expired or tampered, throws an error
 * - Returns the decoded payload if valid
 * 
 * WHAT HAPPENS IF VERIFICATION IS SKIPPED?
 * - Anyone could create fake tokens
 * - No authentication = unauthorized access
 * 
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyAccessToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  // jwt.verify() throws if token is invalid
  // DEFENSE: This is the core of our authentication - verifying the user's identity
  return jwt.verify(token, secret) as DecodedToken;
};

/**
 * Verify Refresh Token
 * 
 * Same as verifyAccessToken but uses the refresh secret.
 * Only used when the user needs a new access token.
 * 
 * @param token - JWT refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_REFRESH_SECRET;
  
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as DecodedToken;
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Extract Token from Authorization Header
 * 
 * DEFENSE EXPLANATION:
 * - Authorization header format: "Bearer <token>"
 * - We need to extract just the token part
 * - Returns null if header is missing or malformed
 * 
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  // Check if header starts with "Bearer "
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Cookie Options for Refresh Token
 * 
 * DEFENSE EXPLANATION:
 * - httpOnly: true - Cookie cannot be accessed by JavaScript (prevents XSS attacks)
 * - secure: true in production - Only sent over HTTPS
 * - sameSite: 'strict' - Prevents CSRF attacks
 * - maxAge: Cookie expiration time
 * 
 * WHY httpOnly?
 * - Even if XSS vulnerability exists, attacker cannot steal the refresh token
 * - This is a critical security measure
 */
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true, // CRITICAL: Prevents JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // Prevents CSRF attacks
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/', // Cookie sent with all requests (needed for silent refresh)
});
