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
import ImageWithFallback from '@/components/ImageWithFallback';

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header with Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                My Adventures
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your saved routes are ready for your next journey
              </p>
            </div>
            <Link
              href="/planning"
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Plan New Route
            </Link>
          </div>

          {/* Quick Stats */}
          {routes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-primary">
                  {routes.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Saved Routes
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-primary">
                  {routes.reduce((sum, r) => sum + (r as any).totalDistanceKm, 0).toFixed(0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total km
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-primary">
                  {routes.reduce((sum, r) => sum + (r as any).durationDays, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Days
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-primary">
                  {new Set(routes.map(r => (r as any).country)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Countries
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Routes List or Empty State */}
        {routes.length === 0 ? (
          /* Empty State */
          <div className="card text-center py-20 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-dashed border-primary/30">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Start Your First Adventure!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              You haven&apos;t saved any routes yet. Let our AI plan the perfect hiking or cycling route for you.
            </p>
            <Link
              href="/planning"
              className="btn btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Plan Your First Route
            </Link>
          </div>
        ) : (
          <>
            {/* Routes Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes.map((route) => {
                // Type assertion for lean() result
                const savedRoute = route as unknown as SavedRoute;
                
                return (
                  <Link
                    key={savedRoute._id.toString()}
                    href={`/history/${savedRoute._id}`}
                    className="group block"
                  >
                    <div className="card hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col h-full overflow-hidden border-2 border-transparent hover:border-primary/30">
                      {/* Hero Image */}
                      {savedRoute.imageUrl && (
                        <div className="relative h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <ImageWithFallback
                            src={savedRoute.imageUrl}
                            alt={`${savedRoute.city}, ${savedRoute.country}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            country={savedRoute.country}
                            city={savedRoute.city}
                          />
                          <div className="absolute top-3 right-3">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white shadow-lg">
                              {savedRoute.tripType === 'bicycle' ? '🚴 Cycling' : '🥾 Hiking'}
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col">
                        {/* Route Header */}
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                            {savedRoute.city}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {savedRoute.region && `${savedRoute.region}, `}{savedRoute.country}
                          </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-2xl font-bold text-primary">
                              {savedRoute.durationDays}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {savedRoute.durationDays === 1 ? 'Day' : 'Days'}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-2xl font-bold text-primary">
                              {savedRoute.totalDistanceKm}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Kilometers
                            </div>
                          </div>
                        </div>

                        {/* Route Summary */}
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            {savedRoute.routes.length} segment{savedRoute.routes.length > 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(savedRoute.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Action Button */}
                        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-primary group-hover:text-primary-dark">
                            <span className="font-semibold text-sm">View Details & Weather</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                🌤️ Fresh Weather Forecasts
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Every time you open a saved route, we fetch the latest 3-day weather forecast for your starting point.
                Plan your adventure with up-to-date conditions!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
