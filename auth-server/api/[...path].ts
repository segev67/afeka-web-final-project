/**
 * Vercel Serverless Function Entry Point
 * 
 * This catch-all route handles ALL paths (/*) and forwards them to the Express app.
 * Example: /auth/register → Express app → /auth/register handler
 */

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
    await mongoose.connect(process.env.MONGODB_URI as string);
    isConnected = true;
    console.log('✅ Connected to MongoDB (Vercel)');
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
