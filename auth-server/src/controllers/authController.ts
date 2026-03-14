/**
 * ===========================================
 * AUTHENTICATION CONTROLLER
 * ===========================================
 * 
 * This file contains the business logic for authentication operations.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS A CONTROLLER?
 * - Contains the actual logic for handling requests
 * - Receives cleaned/validated data from routes
 * - Interacts with models (database)
 * - Returns responses to client
 * 
 * SEPARATION OF CONCERNS:
 * - Routes: Define endpoints and validation
 * - Controllers: Business logic
 * - Models: Database operations
 * - Middleware: Request preprocessing
 */

import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
  getRefreshTokenCookieOptions,
} from '../utils/tokenUtils';

// ===========================================
// REGISTER CONTROLLER
// ===========================================

/**
 * Register New User
 * 
 * DEFENSE EXPLANATION:
 * 
 * REGISTRATION FLOW:
 * 1. Validate input (username, email, password)
 * 2. Check if email already exists
 * 3. Create new user (password auto-hashed by pre-save hook)
 * 4. Generate tokens
 * 5. Set refresh token in httpOnly cookie
 * 6. Return access token in response
 * 
 * SECURITY MEASURES:
 * - Password hashed with bcrypt + salt (in User model pre-save hook)
 * - Refresh token stored in httpOnly cookie (prevents XSS)
 * - Access token short-lived (15 min)
 * 
 * @route POST /auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  console.log('\n🔐 [REGISTER] Request received');
  
  try {
    const { username, email, password } = req.body;

    console.log('🔐 [REGISTER] Attempting registration...');
    console.log(`   Username: ${username}`);
    // SECURITY: Don't log email or password

    // Step 1: Validate required fields
    if (!username || !email || !password) {
      console.log('❌ [REGISTER] Validation failed: Missing required fields');
      res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password',
      });
      return;
    }

    // Step 2: Check if user already exists
    // DEFENSE: Using findOne to check for existing email
    // lowercase() in schema ensures case-insensitive matching
    console.log('🔍 [REGISTER] Checking if user exists...');
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      console.log(`⚠️  [REGISTER] User already exists (email hidden for security)`);
      res.status(409).json({ // 409 Conflict
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Step 3: Create new user
    // DEFENSE: Password is automatically hashed by the pre-save hook in User model
    // We NEVER store plain text passwords
    console.log('🔒 [REGISTER] Creating user with hashed password...');
    const user = await User.create({
      username,
      email,
      password, // This will be hashed automatically
    });
    console.log(`✅ [REGISTER] User created with ID: ${user._id}`);

    // Step 4: Generate tokens
    console.log('🎫 [REGISTER] Generating JWT tokens...');
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    console.log('✅ [REGISTER] Tokens generated');

    // Step 5: Set refresh token in httpOnly cookie
    // DEFENSE: httpOnly cookie prevents JavaScript access (XSS protection)
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    console.log('🍪 [REGISTER] Refresh token set in httpOnly cookie');

    // Step 6: Return success response with access token
    // DEFENSE: Never return the password, even though it's hashed
    const duration = Date.now() - startTime;
    console.log(`✅ [REGISTER] Registration successful for ${username} (${duration}ms)`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        accessToken,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [REGISTER] Registration error (${duration}ms):`, error);
    
    // Handle Mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
    });
  }
};

// ===========================================
// LOGIN CONTROLLER
// ===========================================

/**
 * Login User
 * 
 * DEFENSE EXPLANATION:
 * 
 * LOGIN FLOW:
 * 1. Validate input (email, password)
 * 2. Find user by email
 * 3. Compare password using bcrypt
 * 4. Generate tokens
 * 5. Set refresh token in httpOnly cookie
 * 6. Return access token
 * 
 * SECURITY NOTES:
 * - Generic error messages to prevent user enumeration
 * - Password comparison done with bcrypt.compare() (timing-safe)
 * 
 * @route POST /api/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const { email, password } = req.body;

    console.log('🔑 [LOGIN] Attempting login...');
    // SECURITY: Don't log email or password

    // Step 1: Validate required fields
    if (!email || !password) {
      console.log('❌ [LOGIN] Validation failed: Missing credentials');
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    // Step 2: Find user by email
    // DEFENSE: We use select('+password') if password was set to select: false
    // Since we didn't, password is included by default
    console.log('🔍 [LOGIN] Searching for user in database...');
    const user = await User.findOne({ email: email.toLowerCase() });

    // Step 3: Check if user exists and password matches
    // DEFENSE: We use the same error message for both cases
    // This prevents attackers from knowing if an email exists in our system
    if (!user) {
      console.log(`⚠️  [LOGIN] User not found (email hidden for security)`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password', // Generic message
      });
      return;
    }

    console.log(`✅ [LOGIN] User found: ${user.username}`);

    // Step 4: Compare password using bcrypt
    // DEFENSE: comparePassword() is a method on the User model
    // It uses bcrypt.compare() which is timing-safe (prevents timing attacks)
    console.log('🔒 [LOGIN] Verifying password...');
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`❌ [LOGIN] Invalid password (user hidden for security)`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password', // Same generic message
      });
      return;
    }

    console.log('✅ [LOGIN] Password verified');

    // Step 5: Generate tokens
    console.log('🎫 [LOGIN] Generating JWT tokens...');
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    console.log('✅ [LOGIN] Tokens generated');

    // Step 6: Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    console.log('🍪 [LOGIN] Refresh token set in httpOnly cookie');

    // Step 7: Return success response
    const duration = Date.now() - startTime;
    console.log(`✅ [LOGIN] Login successful for ${user.username} (${duration}ms)`);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        accessToken,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [LOGIN] Login error (${duration}ms):`, error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    });
  }
};

// ===========================================
// REFRESH TOKEN CONTROLLER
// ===========================================

/**
 * Refresh Access Token (Silent Refresh)
 * 
 * DEFENSE EXPLANATION:
 * 
 * THIS IS THE "SILENT REFRESH" REQUIRED BY THE PROJECT!
 * 
 * WHAT IS SILENT REFRESH?
 * - When access token expires, automatically get a new one
 * - Uses the refresh token stored in httpOnly cookie
 * - User doesn't have to log in again
 * - Happens "silently" in the background
 * 
 * HOW IT WORKS:
 * 1. Read refresh token from httpOnly cookie
 * 2. Verify refresh token is valid and not expired
 * 3. Generate new access token (and optionally new refresh token)
 * 4. Return new access token to client
 * 
 * SECURITY:
 * - Refresh token in httpOnly cookie = can't be stolen by XSS
 * - Uses different secret than access token
 * - Can implement refresh token rotation for extra security
 * 
 * @route POST /api/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    console.log('🔄 [REFRESH] Token refresh requested...');
    
    // Step 1: Get refresh token from cookie
    // DEFENSE: req.cookies is populated by cookie-parser middleware
    const token = req.cookies.refreshToken;

    if (!token) {
      console.log('❌ [REFRESH] No refresh token found in cookies');
      res.status(401).json({
        success: false,
        message: 'Refresh token not found',
        code: 'NO_REFRESH_TOKEN',
      });
      return;
    }

    // Step 2: Verify refresh token
    // DEFENSE: This checks signature validity and expiration
    console.log('🔍 [REFRESH] Verifying refresh token...');
    const decoded = verifyRefreshToken(token);
    console.log(`✅ [REFRESH] Token valid for user: ${decoded.username}`);

    // Step 3: Optionally verify user still exists in database
    // This catches cases where user was deleted but token still valid
    console.log('🔍 [REFRESH] Checking if user still exists...');
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log(`❌ [REFRESH] User not found: ${decoded.userId}`);
      res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    console.log(`✅ [REFRESH] User verified: ${user.username}`);

    // Step 4: Generate new tokens
    console.log('🎫 [REFRESH] Generating new tokens...');
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    
    // Optional: Rotate refresh token (generates new one)
    // This is more secure but can cause issues if multiple tabs are open
    const newRefreshToken = generateRefreshToken(tokenPayload);
    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());
    console.log('✅ [REFRESH] New tokens generated');
    console.log('🍪 [REFRESH] New refresh token set');

    // Step 5: Return new access token
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ [REFRESH] Silent refresh successful for ${user.username} (${duration}ms)`);
    }
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [REFRESH] Token refresh error (${duration}ms):`, error);
    
    // Clear invalid refresh token
    res.clearCookie('refreshToken');
    console.log('🗑️  [REFRESH] Invalid token cleared from cookies');
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
};

// ===========================================
// VERIFY TOKEN CONTROLLER
// ===========================================

/**
 * Verify Access Token
 * 
 * Simple endpoint to verify if an access token is valid.
 * Used by Next.js middleware to validate tokens.
 * 
 * DEFENSE: The protect middleware already does the verification
 * If this route is reached, the token is valid
 * 
 * @route GET /api/verify
 */
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  // If we reach here, the protect middleware has already verified the token
  // req.user contains the decoded token data
  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ [VERIFY] Token verified for user: ${req.user?.username}`);
  }
  
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user,
    },
  });
};

// ===========================================
// LOGOUT CONTROLLER
// ===========================================

/**
 * Logout User
 * 
 * DEFENSE EXPLANATION:
 * - Clears the refresh token cookie
 * - Client should also discard the access token
 * - Note: JWTs can't be truly "invalidated" server-side without a blacklist
 * 
 * @route POST /api/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  console.log('👋 [LOGOUT] User logging out...');
  
  // Clear the refresh token cookie (must match the settings used when setting it)
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/',
  });

  console.log('✅ [LOGOUT] Refresh token cleared');
  console.log('✅ [LOGOUT] Logout successful');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
