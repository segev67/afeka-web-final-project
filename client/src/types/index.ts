/**
 * ===========================================
 * TYPESCRIPT TYPE DEFINITIONS
 * ===========================================
 * 
 * Centralized type definitions for the application.
 * 
 * DEFENSE NOTES:
 * - TypeScript interfaces define the "shape" of data
 * - Helps catch errors at compile time
 * - Provides better IDE autocomplete
 */

// ===========================================
// USER TYPES
// ===========================================

export interface User {
  id: string;
  username: string;
  email: string;
}

// ===========================================
// ROUTE TYPES
// ===========================================

/**
 * Trip Type - Either bicycle or trek (walking)
 */
export type TripType = 'bicycle' | 'trek';

/**
 * Coordinate Point for Map
 */
export interface Coordinate {
  lat: number;
  lng: number;
  name?: string; // Optional name for the location
}

/**
 * Landmark Point - Named location with coordinates
 */
export interface LandmarkPoint {
  name: string; // e.g., "Geneva Central Station"
  description?: string; // Additional details about the landmark
  lat?: number; // Optional GPS for map display
  lng?: number; // Optional GPS for map display
}

/**
 * Route Segment - Directions from one landmark to another
 */
export interface RouteSegment {
  from: string; // Starting landmark name
  to: string; // Destination landmark name
  description: string; // Turn-by-turn directions (e.g., "Follow Route de Lausanne northeast...")
  distanceKm: number; // Distance for this segment
  landmarks?: string[]; // Points of interest along the way
}

/**
 * A single day's route with landmark-based segments
 */
export interface DayRoute {
  day: number;
  title: string; // e.g., "Geneva to Lausanne via Lake Geneva"
  segments: RouteSegment[]; // Turn-by-turn segments
  majorLandmarks: LandmarkPoint[]; // Key landmarks with coordinates for map display
  totalDistanceKm: number;
  description?: string; // Overall day description
}

/**
 * Weather data for a specific day/location
 */
export interface WeatherData {
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
 * Complete Route Plan
 */
export interface RoutePlan {
  id?: string;
  userId: string;
  username: string; // User's display name
  country: string;
  region?: string;
  city: string;
  tripType: TripType;
  durationDays: number;
  routes: DayRoute[];
  totalDistanceKm: number;
  weather?: WeatherData[];
  imageUrl?: string;
  createdAt?: Date;
  approved?: boolean;
}

/**
 * Route stored in database (with MongoDB _id)
 */
export interface SavedRoute extends RoutePlan {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// FORM TYPES
// ===========================================

/**
 * Route Planning Form Data
 */
export interface RoutePlanningFormData {
  location: string; // Country/Region/City
  tripType: TripType;
  durationDays: number;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// ===========================================
// LLM RESPONSE TYPES
// ===========================================

/**
 * Expected response format from LLM for route generation
 * Now using landmark-based segments instead of coordinate waypoints
 */
export interface LLMRouteResponse {
  country: string;
  region: string;
  city: string;
  routes: {
    day: number;
    title: string; // e.g., "Geneva to Lausanne via Lake Geneva"
    segments: {
      from: string; // Starting landmark name
      to: string; // Destination landmark name
      description: string; // Turn-by-turn narrative directions
      distanceKm: number;
      landmarks?: string[]; // Points of interest along the way
    }[];
    majorLandmarks: {
      name: string;
      description?: string;
      lat?: number; // Optional GPS for map display
      lng?: number; // Optional GPS for map display
    }[];
    totalDistanceKm: number;
    description?: string;
  }[];
  totalDistanceKm: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  recommendations: string[];
}
