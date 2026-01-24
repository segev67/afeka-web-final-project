/**
 * ===========================================
 * ROUTE DETAIL PAGE (DYNAMIC ROUTE)
 * ===========================================
 * 
 * Shows full details of a saved route with updated weather.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS [id] FOLDER?
 * - Dynamic route in Next.js App Router
 * - [id] is a route parameter (e.g., /history/abc123)
 * - Can access via params.id
 * 
 * PROJECT REQUIREMENT:
 * "Ability to retrieve a route that was planned in the past
 *  with the addition of a weather forecast for the start of execution tomorrow"
 * 
 * This page fetches:
 * 1. The saved route from database
 * 2. Updated weather forecast (fresh data)
 * 3. Displays route on map
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Route from '@/lib/models/Route';
import { fetchWeatherForRoute, getWeatherIconUrl, formatTemperature } from '@/lib/weather';
import type { SavedRoute } from '@/types';
import RouteDetailClient from './RouteDetailClient';

// ===========================================
// HELPER FUNCTION
// ===========================================

async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) return null;

  try {
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
// PAGE COMPONENT
// ===========================================

/**
 * Route Detail Page
 * 
 * DEFENSE EXPLANATION:
 * - Server Component that fetches route data
 * - params.id comes from the URL ([id] folder)
 * - Fetches fresh weather data on every load
 * 
 * @param params - Route parameters containing the route ID
 */
export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Get authenticated user
  const userId = await getUserIdFromToken();

  if (!userId) {
    redirect('/login');
  }

  // Connect to database
  await dbConnect();

  // Fetch the route
  // DEFENSE: We check userId to ensure user can only view their own routes
  const route = await Route.findOne({ _id: id, userId }).lean().exec();

  if (!route) {
    notFound(); // Returns 404 page
  }

  // Type assertion
  const savedRoute = route as unknown as SavedRoute;

  // Fetch updated weather
  // PROJECT REQUIREMENT: "weather forecast for the start of execution tomorrow"
  const startCoordinate = savedRoute.routes[0].startPoint;
  const updatedWeather = await fetchWeatherForRoute([startCoordinate]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/history"
        className="inline-flex items-center text-primary hover:underline mb-6"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to History
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {savedRoute.city}, {savedRoute.country}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {savedRoute.tripType === 'bicycle' ? '🚴 Cycling Route' : '🥾 Hiking Route'} • 
          {' '}{savedRoute.durationDays} day{savedRoute.durationDays > 1 ? 's' : ''} • 
          {' '}{savedRoute.totalDistanceKm} km total
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Created on {new Date(savedRoute.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Route Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Daily Routes */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Daily Routes</h2>
            <div className="space-y-4">
              {savedRoute.routes.map((route) => (
                <div key={route.day} className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold">Day {route.day}</h3>
                  <p className="text-sm text-gray-600 mt-1">{route.description}</p>
                  <p className="text-sm font-medium mt-2">
                    📏 {route.distanceKm} km
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {route.startPoint.name || 'Start'} → {route.endPoint.name || 'End'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Updated Weather Forecast */}
          {updatedWeather.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Updated Weather</h2>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Live Data
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                3-day forecast starting tomorrow
              </p>
              <div className="space-y-3">
                {updatedWeather.map((day, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={getWeatherIconUrl(day.icon)}
                        alt={day.description}
                        className="w-12 h-12"
                      />
                      <div>
                        <p className="text-sm font-medium">Day {index + 1}</p>
                        <p className="text-xs text-gray-500 capitalize">{day.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatTemperature(day.temperature)}</p>
                      <p className="text-xs text-gray-500">
                        {formatTemperature(day.temperatureMin)}-{formatTemperature(day.temperatureMax)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-2">
          {/* 
            Pass route data to client component for map rendering
            DEFENSE: Map needs client-side rendering (Leaflet)
          */}
          <RouteDetailClient routes={savedRoute.routes} routeId={savedRoute._id.toString()} userId={userId} />
        </div>
      </div>
    </div>
  );
}
