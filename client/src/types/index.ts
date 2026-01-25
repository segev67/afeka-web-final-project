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
 * A single day's route
 */
export interface DayRoute {
  day: number;
  startPoint: Coordinate;
  endPoint: Coordinate;
  waypoints: Coordinate[]; // Points along the route
  distanceKm: number;
  description: string;
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
 */
export interface LLMRouteResponse {
  country: string;
  region: string;
  city: string;
  routes: {
    day: number;
    startPoint: {
      lat: number;
      lng: number;
      name: string;
    };
    endPoint: {
      lat: number;
      lng: number;
      name: string;
    };
    waypoints: Array<{
      lat: number;
      lng: number;
      name?: string;
    }>;
    distanceKm: number;
    description: string;
    highlights: string[];
  }[];
  totalDistanceKm: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  recommendations: string[];
}
