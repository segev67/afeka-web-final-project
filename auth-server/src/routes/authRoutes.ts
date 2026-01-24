/**
 * ===========================================
 * AUTHENTICATION ROUTES
 * ===========================================
 * 
 * This file defines the API routes for authentication.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS A ROUTER?
 * - Express Router is a mini-application that handles specific route groups
 * - Keeps routes organized and modular
 * - Can apply middleware to specific route groups
 * 
 * ROUTE STRUCTURE:
 * - POST /api/register - Create new user account
 * - POST /api/login    - Authenticate user and get tokens
 * - POST /api/refresh  - Get new access token (silent refresh)
 * - GET  /api/verify   - Verify access token validity
 * - POST /api/logout   - Clear refresh token cookie
 */

import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  verifyToken,
  logout,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

// Create Express Router instance
const router = Router();

// ===========================================
// PUBLIC ROUTES (No authentication required)
// ===========================================

/**
 * @route   POST /api/register
 * @desc    Register a new user
 * @access  Public
 * 
 * Request Body:
 * {
 *   "username": "string",
 *   "email": "string",
 *   "password": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { "id", "username", "email" },
 *     "accessToken": "string"
 *   }
 * }
 */
router.post('/register', register);

/**
 * @route   POST /api/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 * 
 * Request Body:
 * {
 *   "email": "string",
 *   "password": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { "id", "username", "email" },
 *     "accessToken": "string"
 *   }
 * }
 * 
 * Note: Refresh token is set in httpOnly cookie
 */
router.post('/login', login);

/**
 * @route   POST /api/refresh
 * @desc    Refresh access token using refresh token cookie
 * @access  Public (but requires valid refresh token cookie)
 * 
 * DEFENSE: This is the "silent refresh" endpoint
 * - Reads refresh token from httpOnly cookie
 * - Returns new access token
 * - Client calls this when access token expires
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "accessToken": "string"
 *   }
 * }
 */
router.post('/refresh', refreshToken);

// ===========================================
// PROTECTED ROUTES (Authentication required)
// ===========================================

/**
 * @route   GET /api/verify
 * @desc    Verify if access token is valid
 * @access  Protected
 * 
 * DEFENSE: The 'protect' middleware runs before the controller
 * If the token is invalid, protect returns 401 before reaching verifyToken
 * 
 * Headers Required:
 * Authorization: Bearer <access_token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { "userId", "username", "email" }
 *   }
 * }
 */
router.get('/verify', protect, verifyToken);

/**
 * @route   POST /api/logout
 * @desc    Logout user (clear refresh token cookie)
 * @access  Public
 * 
 * Note: We don't require authentication for logout
 * Even if token is expired, user should be able to logout
 */
router.post('/logout', logout);

// ===========================================
// EXPORT ROUTER
// ===========================================

export default router;
