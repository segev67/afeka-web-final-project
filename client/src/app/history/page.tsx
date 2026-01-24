/**
 * ===========================================
 * ROUTES HISTORY PAGE - COMPLETE IMPLEMENTATION
 * ===========================================
 * 
 * This is Page 2 of the project requirements:
 * "Retrieving the route from a database"
 * 
 * DEFENSE NOTES:
 * 
 * WHY SERVER COMPONENT?
 * - Direct database access on server
 * - No client-side JavaScript for data fetching
 * - Reduces bundle size
 * - Better for SEO
 * 
 * PROJECT REQUIREMENT:
 * "Ability to retrieve a route that was planned in the past
 *  with the addition of a weather forecast for the start of execution tomorrow"
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Route from '@/lib/models/Route';
import type { SavedRoute } from '@/types';

// ===========================================
// HELPER FUNCTION - GET USER FROM TOKEN
// ===========================================

/**
 * Extract User ID from JWT Cookie
 * 
 * DEFENSE EXPLANATION:
 * - Server Components can access cookies via next/headers
 * - We decode the JWT to get user ID
 * - This avoids prop drilling from client components
 */
async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return null;
  }

  try {
    // Decode JWT (same logic as proxy)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    return payload.userId || null;
  } catch {
    return null;
  }
}

// ===========================================
// HISTORY PAGE COMPONENT
// ===========================================

/**
 * History Page - Server Component
 * 
 * DEFENSE EXPLANATION:
 * - async component that fetches data directly
 * - No useState, useEffect - just direct database query
 * - Data fetching happens on server during render
 * 
 * @returns Rendered history page with routes
 */
export default async function HistoryPage() {
  // Get user ID from JWT token
  const userId = await getUserIdFromToken();

  if (!userId) {
    // This shouldn't happen (proxy should redirect), but just in case
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card text-center py-16">
          <p className="text-red-600">Please log in to view your routes.</p>
          <Link href="/login" className="btn btn-primary mt-4 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Connect to database and fetch routes
  await dbConnect();

  // Fetch user's routes, newest first
  // DEFENSE: .lean() returns plain JavaScript objects (no Mongoose document methods)
  // This is faster and avoids serialization issues with React Server Components
  const routes = await Route.find({ userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Routes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage your previously planned routes.
        </p>
      </div>

      {/* Routes List or Empty State */}
      {routes.length === 0 ? (
        /* Empty State */
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Routes Yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You haven&apos;t saved any routes yet. Start planning your first adventure!
          </p>
          <Link
            href="/planning"
            className="btn btn-primary inline-block"
          >
            Plan Your First Route
          </Link>
        </div>
      ) : (
        <>
          {/* Routes Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Found <span className="font-semibold">{routes.length}</span> saved route{routes.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Routes Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => {
              // Type assertion for lean() result
              const savedRoute = route as unknown as SavedRoute;
              
              return (
                <div key={savedRoute._id.toString()} className="card hover:shadow-lg transition-shadow">
                  {/* Route Header */}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {savedRoute.city}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {savedRoute.region && `${savedRoute.region}, `}{savedRoute.country}
                    </p>
                  </div>

                  {/* Route Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Trip Type:</span>
                      <span className="font-medium capitalize">
                        {savedRoute.tripType === 'bicycle' ? '🚴 Cycling' : '🥾 Hiking'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{savedRoute.durationDays} day{savedRoute.durationDays > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Distance:</span>
                      <span className="font-medium">{savedRoute.totalDistanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {new Date(savedRoute.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Route Summary */}
                  <div className="border-t pt-4 mb-4">
                    <p className="text-sm text-gray-600">
                      {savedRoute.routes.length} route segment{savedRoute.routes.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      href={`/history/${savedRoute._id}`}
                      className="flex-1 btn btn-primary text-center text-sm py-2"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Weather Updates
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              When you view a saved route, the weather forecast will be automatically updated
              to show tomorrow&apos;s conditions for your planned starting point.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
