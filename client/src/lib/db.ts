/**
 * ===========================================
 * MONGODB CONNECTION UTILITY
 * ===========================================
 * 
 * This file handles the MongoDB connection for the Next.js application.
 * 
 * DEFENSE NOTES:
 * 
 * WHY THIS PATTERN?
 * - Next.js runs in a serverless environment
 * - Each request could create a new database connection
 * - We cache the connection to reuse it across requests
 * - Prevents "too many connections" errors
 * 
 * GLOBAL CACHING:
 * - We store the connection promise on the global object
 * - In development, hot reloading would create new connections
 * - The cached connection persists across hot reloads
 */

import mongoose, { Mongoose } from 'mongoose';

// MongoDB connection URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global type declaration for cached mongoose connection
 * 
 * DEFENSE EXPLANATION:
 * - TypeScript needs to know about our custom global property
 * - We extend the NodeJS Global interface
 */
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

// Initialize cached connection object
let cached = global.mongoose;

// Store on global for persistence across hot reloads
if (!cached) {
  cached = { conn: null, promise: null };
  global.mongoose = cached;
}

/**
 * Connect to MongoDB
 * 
 * DEFENSE EXPLANATION:
 * 
 * CONNECTION FLOW:
 * 1. Check if connection already exists (cached.conn)
 * 2. If not, check if connection is in progress (cached.promise)
 * 3. If neither, create new connection
 * 4. Return the connection
 * 
 * WHY CACHE THE PROMISE?
 * - Multiple concurrent requests might call dbConnect()
 * - Without caching, each would start a new connection
 * - By caching the promise, all wait for the same connection
 * 
 * @returns Promise resolving to mongoose connection
 */
async function dbConnect(): Promise<Mongoose> {
  // Validate MongoDB URI exists
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }

  // Return existing connection if available
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  // Create new connection if no promise exists
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable command buffering for better error handling
    };

    console.log('Creating new MongoDB connection...');
    
    /**
     * mongoose.connect() returns a promise
     * 
     * DEFENSE: We store this promise so concurrent calls
     * can await the same connection attempt
     */
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB connected successfully');
      return mongooseInstance;
    });
  }

  try {
    // Await the connection promise
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset promise on error so next call can retry
    cached.promise = null;
    throw error;
  }

  return cached.conn!;
}

export default dbConnect;
