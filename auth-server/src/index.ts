/**
 * ===========================================
 * EXPRESS AUTHENTICATION SERVER - ENTRY POINT
 * ===========================================
 * 
 * This is the main entry point for the Express authentication server.
 * 
 * ARCHITECTURE ROLE:
 * - This server handles ALL authentication logic (registration, login, token refresh)
 * - Issues JWT tokens that are validated by the Next.js middleware
 * - Passwords are hashed with bcrypt + salt for security
 * 
 * DEFENSE NOTES:
 * - Why separate auth server? Separation of concerns - auth logic isolated from app logic
 * - Express is used because it's lightweight and ideal for API servers
 * - CORS is configured to only allow requests from the Next.js client
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes';

// Load environment variables from .env file
// DEFENSE: dotenv.config() reads .env file and adds variables to process.env
// Only load .env in development - Vercel provides env vars directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Create Express application instance
const app: Application = express();

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * DEFENSE EXPLANATION:
 * - Without CORS, browsers block requests from different origins (domains)
 * - We allow requests ONLY from our Next.js client (CLIENT_URL)
 * - credentials: true allows cookies to be sent cross-origin (needed for httpOnly refresh tokens)
 * 
 * WHAT HAPPENS IF REMOVED:
 * - Browser will block all requests from the Next.js app
 * - Login/register won't work from the frontend
 */
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * JSON Body Parser
 * 
 * DEFENSE EXPLANATION:
 * - Parses incoming JSON request bodies
 * - Makes req.body available with parsed JSON data
 * 
 * WHAT HAPPENS IF REMOVED:
 * - req.body will be undefined
 * - Cannot read login credentials or registration data from requests
 */
app.use(express.json());

/**
 * URL-Encoded Body Parser
 * 
 * DEFENSE EXPLANATION:
 * - Parses URL-encoded form data (like HTML form submissions)
 * - extended: true allows nested objects
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Cookie Parser
 * 
 * DEFENSE EXPLANATION:
 * - Parses cookies from request headers
 * - Makes req.cookies available
 * - Required for reading the httpOnly refresh token cookie
 * 
 * WHAT HAPPENS IF REMOVED:
 * - Cannot read refresh tokens from cookies
 * - Silent token refresh won't work
 */
app.use(cookieParser());

// ===========================================
// ROUTES
// ===========================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', server: 'auth-server' });
});

// Mount authentication routes at /auth prefix
// All auth endpoints: /auth/register, /auth/login, /auth/refresh, /auth/verify, /auth/logout
app.use('/auth', authRoutes);

// ===========================================
// ERROR HANDLING MIDDLEWARE
// ===========================================

/**
 * Global Error Handler
 * 
 * DEFENSE EXPLANATION:
 * - Catches all errors thrown in route handlers
 * - Must have 4 parameters (err, req, res, next) to be recognized as error handler
 * - Provides consistent error response format
 * 
 * WHAT HAPPENS IF REMOVED:
 * - Unhandled errors would crash the server
 * - Error responses would be inconsistent
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 Handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ===========================================
// DATABASE CONNECTION & SERVER START
// ===========================================

const PORT = process.env.PORT || 4000;

/**
 * MongoDB Connection
 * 
 * DEFENSE EXPLANATION:
 * - mongoose.connect() establishes connection to MongoDB
 * - We use MongoDB Atlas (cloud) for the database
 * - For local development only
 * - For Vercel, connection is handled in api/index.ts
 * 
 * WHAT HAPPENS IF REMOVED:
 * - No database connection = cannot save/retrieve users
 * - All auth operations would fail
 */

// For local development only
if (process.env.NODE_ENV !== 'production') {
  mongoose
    .connect(process.env.MONGODB_URI as string)
    .then(() => {
      console.log('\n' + '='.repeat(50));
      console.log('✅ Connected to MongoDB');
      console.log('   Database:', process.env.MONGODB_URI?.split('@')[1]?.split('?')[0] || 'localhost');
      console.log('='.repeat(50));
      
      // Start server only after DB connection is established
      app.listen(PORT, () => {
        console.log('\n' + '🚀'.repeat(25));
        console.log(`🚀 Auth Server Running`);
        console.log('='.repeat(50));
        console.log(`   Port:        ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Health:      http://localhost:${PORT}/health`);
        console.log(`   API Base:    http://localhost:${PORT}/auth`);
        console.log('='.repeat(50));
        console.log('📡 Endpoints:');
        console.log('   POST /auth/register  - Register new user');
        console.log('   POST /auth/login     - Login user');
        console.log('   POST /auth/refresh   - Refresh access token');
        console.log('   GET  /auth/verify    - Verify token');
        console.log('   POST /auth/logout    - Logout user');
        console.log('='.repeat(50));
        console.log('🔒 Security Features:');
        console.log('   ✅ bcrypt password hashing with salt');
        console.log('   ✅ JWT authentication');
        console.log('   ✅ httpOnly cookies for refresh tokens');
        console.log('   ✅ CORS protection');
        console.log('='.repeat(50) + '\n');
        console.log('👂 Waiting for requests...\n');
      });
    })
    .catch((error) => {
      console.error('\n❌ MongoDB connection failed:', error.message);
      process.exit(1);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Rejection:', reason.message);
});

// Export app for Vercel serverless (api/index.ts)
export { app };
