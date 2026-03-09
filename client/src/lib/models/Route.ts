/**
 * ===========================================
 * ROUTE MODEL - MONGOOSE SCHEMA
 * ===========================================
 * 
 * This file defines the Route schema for MongoDB.
 * Used to store approved hiking/cycling routes.
 * 
 * DEFENSE NOTES:
 * - This model is used by the Next.js server (NOT the auth server)
 * - Routes are saved when user clicks "Approve Route"
 * - Contains all route data including coordinates for map display
 */

import mongoose, { Document, Schema } from 'mongoose';

// ===========================================
// TYPESCRIPT INTERFACES
// ===========================================

/**
 * Landmark Point subdocument interface
 */
interface ILandmarkPoint {
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
}

/**
 * Route Segment subdocument interface
 */
interface IRouteSegment {
  from: string;
  to: string;
  description: string;
  distanceKm: number;
  landmarks?: string[];
}

/**
 * Day Route subdocument interface (landmark-based)
 */
interface IDayRoute {
  day: number;
  title: string;
  segments: IRouteSegment[];
  majorLandmarks: ILandmarkPoint[];
  totalDistanceKm: number;
  description?: string;
}

/**
 * Weather subdocument interface
 */
interface IWeather {
  date: string;
  temperature: number;
  temperatureMax: number;
  temperatureMin: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

/**
 * Main Route document interface
 */
export interface IRoute extends Document {
  userId: string;
  username: string;
  name?: string; // Optional: User-provided route name or auto-generated title
  country: string;
  region?: string;
  city: string;
  tripType: 'bicycle' | 'trek';
  durationDays: number;
  routes: IDayRoute[];
  totalDistanceKm: number;
  weather?: IWeather[];
  imageUrl?: string;
  difficulty?: 'easy' | 'moderate' | 'hard';
  recommendations?: string[];
  userNotes?: string; // Optional: User's custom notes/preferences for route planning
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// MONGOOSE SCHEMAS
// ===========================================

/**
 * Landmark Point Schema
 * 
 * DEFENSE: Stores named landmarks with optional GPS coordinates
 * - name is required (e.g., "Geneva Central Station")
 * - lat/lng are optional - only needed for map display
 */
const landmarkPointSchema = new Schema<ILandmarkPoint>(
  {
    name: {
      type: String,
      required: [true, 'Landmark name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    lat: {
      type: Number,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
    },
  },
  { _id: false }
);

/**
 * Route Segment Schema
 * 
 * Represents turn-by-turn directions from one landmark to another.
 */
const routeSegmentSchema = new Schema<IRouteSegment>(
  {
    from: {
      type: String,
      required: [true, 'Starting landmark is required'],
      trim: true,
    },
    to: {
      type: String,
      required: [true, 'Destination landmark is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Segment description is required'],
      trim: true,
    },
    distanceKm: {
      type: Number,
      required: [true, 'Segment distance is required'],
      min: 0,
    },
    landmarks: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

/**
 * Day Route Schema
 * 
 * Represents a single day's route with landmark-based segments.
 */
const dayRouteSchema = new Schema<IDayRoute>(
  {
    day: {
      type: Number,
      required: [true, 'Day number is required'],
      min: 1,
    },
    title: {
      type: String,
      required: [true, 'Route title is required'],
      trim: true,
    },
    segments: {
      type: [routeSegmentSchema],
      required: [true, 'Route segments are required'],
      validate: {
        validator: function (segments: IRouteSegment[]) {
          return segments.length >= 1;
        },
        message: 'At least one segment is required',
      },
    },
    majorLandmarks: {
      type: [landmarkPointSchema],
      required: [true, 'Major landmarks are required for map display'],
      validate: {
        validator: function (landmarks: ILandmarkPoint[]) {
          return landmarks.length >= 2;
        },
        message: 'At least two major landmarks required for map display',
      },
    },
    totalDistanceKm: {
      type: Number,
      required: [true, 'Total distance is required'],
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Weather Schema
 * 
 * Stores weather forecast data for the route.
 */
const weatherSchema = new Schema<IWeather>(
  {
    date: {
      type: String,
      required: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    temperatureMax: {
      type: Number,
      required: true,
    },
    temperatureMin: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    humidity: {
      type: Number,
      required: true,
    },
    windSpeed: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

/**
 * Main Route Schema
 * 
 * DEFENSE NOTES:
 * - userId links route to the user who created it
 * - tripType is enum-validated ('bicycle' or 'trek')
 * - routes array contains day-by-day route data
 * - timestamps: true adds createdAt and updatedAt automatically
 */
const routeSchema = new Schema<IRoute>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true, // Index for faster queries by user
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
    },
    name: {
      type: String,
      trim: true,
      // Optional: Auto-generated from first route title or user-provided
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    tripType: {
      type: String,
      required: [true, 'Trip type is required'],
      enum: {
        values: ['bicycle', 'trek'],
        message: 'Trip type must be either bicycle or trek',
      },
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 day'],
      max: [30, 'Duration cannot exceed 30 days'],
    },
    routes: {
      type: [dayRouteSchema],
      required: [true, 'Routes data is required'],
      validate: {
        validator: function (routes: IDayRoute[]) {
          return routes.length > 0;
        },
        message: 'At least one route is required',
      },
    },
    totalDistanceKm: {
      type: Number,
      required: [true, 'Total distance is required'],
      min: 0,
    },
    weather: {
      type: [weatherSchema],
      default: [],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'hard'],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    userNotes: {
      type: String,
      trim: true,
      // Optional: User's custom preferences/notes for AI route planning
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ===========================================
// INDEXES
// ===========================================

/**
 * Create compound index for efficient queries
 * 
 * DEFENSE: Indexes improve query performance
 * - Querying by userId and createdAt is common (user's route history)
 * - -1 means descending order (newest first)
 */
routeSchema.index({ userId: 1, createdAt: -1 });

// ===========================================
// MODEL EXPORT
// ===========================================

/**
 * Export Route model
 * 
 * DEFENSE EXPLANATION:
 * - mongoose.models.Route checks if model already exists
 * - This prevents "OverwriteModelError" in development with hot reloading
 * - In Next.js, modules may be re-imported, so we need this check
 */
const Route = mongoose.models.Route || mongoose.model<IRoute>('Route', routeSchema);

export default Route;
