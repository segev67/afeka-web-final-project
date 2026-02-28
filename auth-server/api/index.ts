/**
 * Vercel Serverless Function Entry Point
 * 
 * This catch-all route handles ALL paths (/*) and forwards them to the Express app.
 * Example: /auth/register → Express app → /auth/register handler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { app } from '../src/index';

// Cache the database connection for serverless
let isConnected = false;

async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('📦 Using cached database connection');
    return;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB (Vercel)');
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Vercel serverless handler
async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`📥 ${req.method} ${req.url}`);
    await connectToDatabase();
    
    // Pass the request to Express app
    return new Promise<void>((resolve, reject) => {
      // Express app is a request handler function
      app(req as any, res as any, (err?: any) => {
        if (err) {
          console.error('❌ Express error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error: any) {
    console.error('❌ Handler error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default handler;
