/**
 * ===========================================
 * AUTHENTICATION MIDDLEWARE
 * ===========================================
 * 
 * This middleware verifies JWT tokens on protected routes.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS MIDDLEWARE?
 * - Functions that run BETWEEN receiving a request and sending a response
 * - Can modify req/res objects, end the request, or call next()
 * - In Express, middleware runs in order they are defined
 * 
 * MIDDLEWARE FLOW:
 * Request → CORS → JSON Parser → Auth Middleware → Route Handler → Response
 * 
 * WHY USE MIDDLEWARE FOR AUTH?
 * - Centralizes authentication logic
 * - Can protect multiple routes without repeating code
 * - Clean separation of concerns
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, DecodedToken } from '../utils/tokenUtils';

// ===========================================
// EXTEND EXPRESS REQUEST TYPE
// ===========================================

/**
 * Extend Express Request to include user property
 * 
 * DEFENSE: TypeScript module augmentation
 * - Adds 'user' property to Request type
 * - Required for type safety when accessing req.user in route handlers
 */
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

// ===========================================
// AUTHENTICATION MIDDLEWARE
// ===========================================

/**
 * Protect Middleware - Verifies JWT Token
 * 
 * DEFENSE EXPLANATION:
 * 
 * HOW IT WORKS:
 * 1. Extract token from Authorization header (format: "Bearer <token>")
 * 2. Verify token signature and expiration using JWT_SECRET
 * 3. If valid, attach decoded user data to req.user
 * 4. If invalid, return 401 Unauthorized
 * 
 * WHAT HAPPENS IF THIS MIDDLEWARE IS REMOVED?
 * - Protected routes become public
 * - Anyone can access user-specific data
 * - Complete security breach
 * 
 * USAGE:
 * router.get('/protected', protect, (req, res) => {
 *   // Only authenticated users reach here
 *   // Access user data via req.user
 * });
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Step 1: Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    // Step 2: Check if token exists
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Step 3: Verify token
    // DEFENSE: This is where the actual authentication happens
    // jwt.verify() checks:
    //   - Is the signature valid? (was it signed with our secret?)
    //   - Is the token expired?
    //   - Is the token structure valid?
    const decoded = verifyAccessToken(token);

    // Step 4: Attach user data to request
    // Now route handlers can access user info via req.user
    req.user = decoded;

    // Step 5: Continue to next middleware/route handler
    next();
  } catch (error) {
    // Token verification failed
    // DEFENSE: Different error messages help with debugging but don't expose sensitive info
    
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        // Token was valid but has expired
        // Client should use refresh token to get new access token
        res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      
      if (error.name === 'JsonWebTokenError') {
        // Token is malformed or signature is invalid
        res.status(401).json({
          success: false,
          message: 'Invalid token.',
          code: 'INVALID_TOKEN',
        });
        return;
      }
    }

    // Generic error
    res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * Optional Auth Middleware
 * 
 * Similar to protect, but doesn't reject unauthenticated requests.
 * Useful for routes that behave differently for logged-in users.
 * 
 * Example: Homepage shows different content for logged-in users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
    
    // Continue regardless of auth status
    next();
  } catch {
    // Token invalid, but we don't reject - just continue without user
    next();
  }
};
