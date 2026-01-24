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
 * Coordinate subdocument interface
 */
interface ICoordinate {
  lat: number;
  lng: number;
  name?: string;
}

/**
 * Day Route subdocument interface
 */
interface IDayRoute {
  day: number;
  startPoint: ICoordinate;
  endPoint: ICoordinate;
  waypoints: ICoordinate[];
  distanceKm: number;
  description: string;
  highlights?: string[];
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
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// MONGOOSE SCHEMAS
// ===========================================

/**
 * Coordinate Schema
 * 
 * DEFENSE: Subdocuments in Mongoose
 * - Defines nested structure within the main document
 * - lat/lng are required for map rendering
 */
const coordinateSchema = new Schema<ICoordinate>(
  {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // Don't create _id for subdocuments
);

/**
 * Day Route Schema
 * 
 * Represents a single day's route with start/end points and waypoints.
 */
const dayRouteSchema = new Schema<IDayRoute>(
  {
    day: {
      type: Number,
      required: [true, 'Day number is required'],
      min: 1,
    },
    startPoint: {
      type: coordinateSchema,
      required: [true, 'Start point is required'],
    },
    endPoint: {
      type: coordinateSchema,
      required: [true, 'End point is required'],
    },
    waypoints: {
      type: [coordinateSchema],
      default: [],
    },
    distanceKm: {
      type: Number,
      required: [true, 'Distance is required'],
      min: 0,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    highlights: {
      type: [String],
      default: [],
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
