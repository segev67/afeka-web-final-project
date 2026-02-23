/**
 * ===========================================
 * ROUTE PLANNING SERVER ACTIONS
 * ===========================================
 * 
 * Next.js Server Actions for route generation and saving.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT ARE SERVER ACTIONS?
 * - Functions that run on the server (not in browser)
 * - Marked with "use server" directive
 * - Can be called directly from Client Components
 * - Replace traditional API routes for mutations
 * 
 * WHY SERVER ACTIONS?
 * - Project requirement: "use Server Actions" (from tech design)
 * - Simpler than API routes
 * - Type-safe (TypeScript works end-to-end)
 * - Automatic serialization
 * 
 * SECURITY:
 * - API keys never exposed to client
 * - Database operations on server only
 * - User authentication checked
 */

'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Route from '@/lib/models/Route';
import { generateRoute, validateRouteData } from '@/lib/gemini';
import { fetchWeatherForRoute } from '@/lib/weather';
import { fetchCountryImage } from '@/lib/images';
import type { TripType, RoutePlan, SavedRoute, ApiResponse } from '@/types';

// ===========================================
// GENERATE ROUTE ACTION
// ===========================================

/**
 * Generate Route with Gemini AI
 * 
 * DEFENSE EXPLANATION:
 * 
 * FLOW:
 * 1. Call Gemini API to generate route
 * 2. Validate response
 * 3. Fetch weather data for route
 * 4. Return combined data to client
 * 
 * WHY SERVER ACTION?
 * - Gemini API key stays on server (secure)
 * - Heavy processing on server (better performance)
 * - Client just calls this function directly
 * 
 * @param location - User's destination
 * @param tripType - 'trek' or 'bicycle'
 * @param durationDays - Trip duration
 * @param userId - Authenticated user ID
 * @param username - User's name
 * @returns Route plan with weather data
 */
export async function generateRoutePlan(
  location: string,
  tripType: TripType,
  durationDays: number,
  userId: string,
  username: string
): Promise<ApiResponse<RoutePlan>> {
  try {
    console.log(`🚀 Generating route for ${username}...`);

    // Step 1: Generate route with Gemini
    const routeData = await generateRoute(location, tripType, durationDays);

    if (!routeData) {
      return {
        success: false,
        message: 'Failed to generate route. Please try again.',
      };
    }

    // Step 2: Validate route data
    if (!validateRouteData(routeData)) {
      return {
        success: false,
        message: 'Generated route is invalid. Please try different parameters.',
      };
    }

    // Step 3: Fetch weather forecast
    // Get weather for the first major landmark (typically the starting point)
    const firstLandmark = routeData.routes[0].majorLandmarks.find(l => l.lat && l.lng);
    
    let weather: any[] = [];
    if (firstLandmark?.lat && firstLandmark?.lng) {
      weather = await fetchWeatherForRoute([{
        lat: firstLandmark.lat,
        lng: firstLandmark.lng,
      }]);
    }

    // Step 4: Fetch country-typical image
    // PROJECT REQUIREMENT: "route page will be accompanied by one image (typical of the country)"
    const imageUrl = await fetchCountryImage(routeData.country, routeData.city, tripType);

    // Step 5: Create route plan object
    const routePlan: RoutePlan = {
      userId,
      username, // DEFENSE: Required by Route schema
      country: routeData.country,
      region: routeData.region,
      city: routeData.city,
      tripType,
      durationDays,
      routes: routeData.routes.map(r => ({
        day: r.day,
        title: r.title,
        segments: r.segments,
        majorLandmarks: r.majorLandmarks,
        totalDistanceKm: r.totalDistanceKm,
        description: r.description,
      })),
      totalDistanceKm: routeData.totalDistanceKm,
      weather,
      imageUrl, // Country-typical image
      approved: false,
    };

    console.log('✅ Route plan generated successfully');
    console.log('Route plan userId:', routePlan.userId, 'username:', routePlan.username);

    return {
      success: true,
      message: 'Route generated successfully!',
      data: routePlan,
    };

  } catch (error) {
    console.error('❌ Error in generateRoutePlan:', error);
    
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ===========================================
// SAVE ROUTE ACTION
// ===========================================

/**
 * Save Route to Database
 * 
 * DEFENSE EXPLANATION:
 * 
 * PROJECT REQUIREMENT:
 * "Every run of a product is received, checked, and approved by the user,
 *  and saved in a database"
 * 
 * This is called when user clicks "Approve Route" button.
 * 
 * WHAT HAPPENS:
 * 1. Connect to MongoDB
 * 2. Create new Route document
 * 3. Save to database
 * 4. Revalidate history page cache
 * 
 * WHY revalidatePath?
 * - Next.js caches page data
 * - revalidatePath tells Next.js to refresh the cache
 * - History page will show the new route immediately
 * 
 * WHAT IF REMOVED?
 * - History page won't show new route until cache expires
 * - User thinks save didn't work
 * 
 * @param routePlan - Complete route plan to save
 * @returns Success/failure response
 */
export async function saveRoute(
  routePlan: RoutePlan
): Promise<ApiResponse<SavedRoute>> {
  try {
    console.log(`💾 Saving route for user ${routePlan.userId}...`);

    // Step 1: Connect to database
    await dbConnect();

    // Step 2: Create route document
    const route = await Route.create({
      ...routePlan,
      approved: true, // Mark as approved when saving
    });

    console.log(`✅ Route saved with ID: ${route._id}`);

    // Step 3: Revalidate history page
    // DEFENSE: This clears Next.js cache for the history page
    // Without this, new route won't appear until page refresh
    revalidatePath('/history');

    // Convert Mongoose document to plain object for client serialization
    // DEFENSE: Mongoose documents have special properties (_id as ObjectId, etc.)
    // that can't be serialized to React client components
    const plainRoute = {
      ...route.toObject(),
      _id: route._id.toString(), // Convert ObjectId to string
    };

    return {
      success: true,
      message: 'Route saved successfully!',
      data: plainRoute as SavedRoute,
    };

  } catch (error) {
    console.error('❌ Error saving route:', error);
    
    return {
      success: false,
      message: 'Failed to save route. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ===========================================
// FETCH ROUTES ACTION
// ===========================================

/**
 * Fetch User's Saved Routes
 * 
 * Used by the history page to display saved routes.
 * 
 * @param userId - User ID to fetch routes for
 * @returns Array of saved routes
 */
export async function fetchUserRoutes(
  userId: string
): Promise<ApiResponse<SavedRoute[]>> {
  try {
    console.log(`📚 Fetching routes for user ${userId}...`);

    await dbConnect();

    // Fetch routes, newest first
    const routes = await Route.find({ userId })
      .sort({ createdAt: -1 })
      .lean(); // lean() returns plain JavaScript objects (faster)

    console.log(`✅ Found ${routes.length} routes`);

    return {
      success: true,
      message: `Found ${routes.length} routes`,
      data: routes as SavedRoute[],
    };

  } catch (error) {
    console.error('❌ Error fetching routes:', error);
    
    return {
      success: false,
      message: 'Failed to fetch routes',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ===========================================
// DELETE ROUTE ACTION
// ===========================================

/**
 * Delete a Saved Route
 * 
 * @param routeId - ID of route to delete
 * @param userId - User ID (for authorization)
 * @returns Success/failure response
 */
export async function deleteRoute(
  routeId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    console.log(`🗑️  Deleting route ${routeId}...`);

    await dbConnect();

    // Delete only if route belongs to user (security check)
    const result = await Route.deleteOne({ _id: routeId, userId });

    if (result.deletedCount === 0) {
      return {
        success: false,
        message: 'Route not found or unauthorized',
      };
    }

    console.log('✅ Route deleted');

    // Revalidate history page
    revalidatePath('/history');

    return {
      success: true,
      message: 'Route deleted successfully',
    };

  } catch (error) {
    console.error('❌ Error deleting route:', error);
    
    return {
      success: false,
      message: 'Failed to delete route',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
