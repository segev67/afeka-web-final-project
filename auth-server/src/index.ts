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
// CORS configuration with better handling for Vercel
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL,
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowedOrigins or is a Vercel preview deployment
    if (allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
// REQUEST LOGGING MIDDLEWARE
// ===========================================

// Log all incoming requests for debugging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`\n📥 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

// ===========================================
// DATABASE CONNECTION MIDDLEWARE (Production)
// ===========================================

// Connection state tracking
let isMongoConnected = false;

async function ensureMongoConnection() {
  if (isMongoConnected && mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    isMongoConnected = true;
    console.log('✅ MongoDB connected');
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

// For production (Vercel), ensure connection before each request
if (process.env.NODE_ENV === 'production') {
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureMongoConnection();
      next();
    } catch (error: any) {
      res.status(503).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
      });
    }
  });
}

// ===========================================
// ROUTES
// ===========================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'ok', 
    server: 'auth-server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// Export app for Vercel (default export required for Express preset)
export default app;
