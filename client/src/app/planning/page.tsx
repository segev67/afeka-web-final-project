/**
 * ===========================================
 * ROUTE PLANNING PAGE - COMPLETE IMPLEMENTATION
 * ===========================================
 * 
 * This is Page 1 of the project requirements.
 * 
 * FEATURES IMPLEMENTED:
 * - Form for user inputs (location, trip type, duration)
 * - Gemini AI route generation
 * - Leaflet map visualization
 * - 3-day weather forecast
 * - Route approval and saving to database
 * 
 * DEFENSE NOTES:
 * - Client Component (uses useState, forms, events)
 * - Calls Server Actions for route generation and saving
 * - Map loaded dynamically to avoid SSR issues
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { TripType, RoutePlan } from '@/types';
import { generateRoutePlan, saveRoute } from './actions';
import { getAccessToken, verifyToken } from '@/lib/auth';
import { getWeatherIconUrl, formatTemperature } from '@/lib/weather';
import { getImageAltText } from '@/lib/images';

// Dynamic import for RouteMap (no SSR)
// DEFENSE: This is critical - Leaflet doesn't work with SSR
// { ssr: false } tells Next.js not to render this component on the server
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-[500px] flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

// ===========================================
// PLANNING PAGE COMPONENT
// ===========================================

export default function PlanningPage() {
  // Form state
  const [location, setLocation] = useState('');
  const [tripType, setTripType] = useState<TripType>('trek');
  const [duration, setDuration] = useState(1);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Route data
  const [generatedRoute, setGeneratedRoute] = useState<RoutePlan | null>(null);

  /**
   * Handle Route Generation
   * 
   * FLOW:
   * 1. Get authenticated user
   * 2. Call Server Action to generate route
   * 3. Display route on map with weather
   */
  const handleGenerateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setGeneratedRoute(null);
    setIsGenerating(true);

    try {
      // Get authenticated user
      const user = await verifyToken();
      
      if (!user) {
        setError('Please log in to generate routes');
        return;
      }

      // Call Server Action
      const result = await generateRoutePlan(
        location,
        tripType,
        duration,
        user.id,
        user.username
      );

      if (result.success && result.data) {
        setGeneratedRoute(result.data);
        setSuccessMessage('Route generated successfully! Review and approve to save.');
      } else {
        setError(result.message || 'Failed to generate route');
      }

    } catch (err) {
      console.error('Generation error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle Route Approval/Saving
   * 
   * PROJECT REQUIREMENT:
   * "Every run of a product is received, checked, and approved by the user,
   *  and saved in a database"
   */
  const handleApproveRoute = async () => {
    if (!generatedRoute) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await saveRoute(generatedRoute);

      if (result.success) {
        setSuccessMessage('Route saved successfully! View it in your history.');
        // Clear generated route after saving
        setTimeout(() => {
          setGeneratedRoute(null);
          setLocation('');
        }, 2000);
      } else {
        setError(result.message || 'Failed to save route');
      }

    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save route. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Plan Your Route
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Enter your destination and preferences to generate a personalized route with AI.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ===========================================
            LEFT COLUMN: INPUT FORM
            =========================================== */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <h2 className="text-xl font-semibold mb-6">Route Details</h2>

            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleGenerateRoute} className="space-y-5">
              {/* Location Input */}
              <div>
                <label htmlFor="location" className="form-label">
                  Location (Country/Region/City)
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Swiss Alps, Switzerland"
                  required
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a specific location for better route suggestions
                </p>
              </div>

              {/* Trip Type Selection */}
              <div>
                <label className="form-label">Trip Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTripType('trek')}
                    disabled={isGenerating}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tripType === 'trek'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🥾</div>
                    <div className="font-medium">Hiking</div>
                    <div className="text-xs text-gray-500">5-10 km/day</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTripType('bicycle')}
                    disabled={isGenerating}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tripType === 'bicycle'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🚴</div>
                    <div className="font-medium">Cycling</div>
                    <div className="text-xs text-gray-500">30-70 km/day</div>
                  </button>
                </div>
              </div>

              {/* Duration Input */}
              <div>
                <label htmlFor="duration" className="form-label">
                  Duration (Days)
                </label>
                <input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
                  className="form-input"
                  min={1}
                  max={7}
                  required
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {tripType === 'trek' 
                    ? `Up to 3 circular routes will be generated`
                    : 'Continuous city-to-city route'}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full btn btn-primary py-3"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner mr-2" />
                    Generating Route...
                  </span>
                ) : (
                  '🤖 Generate Route with AI'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ===========================================
            RIGHT COLUMN: MAP & RESULTS
            =========================================== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Container */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Route Map</h2>
            {generatedRoute && generatedRoute.routes.length > 0 ? (
              <RouteMap routes={generatedRoute.routes} height="500px" />
            ) : (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-[500px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="text-lg font-medium">Map will appear here</p>
                  <p className="text-sm">Generate a route to see it on the map</p>
                </div>
              </div>
            )}
          </div>

          {/* Country Image */}
          {generatedRoute && generatedRoute.imageUrl && (
            <div className="card animate-fade-in">
              <h2 className="text-xl font-semibold mb-4">Destination Image</h2>
              <div className="relative w-full h-64 rounded-lg overflow-hidden">
                <img
                  src={generatedRoute.imageUrl}
                  alt={getImageAltText(generatedRoute.country, generatedRoute.city, generatedRoute.tripType)}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Typical landscape of {generatedRoute.city}, {generatedRoute.country}
              </p>
            </div>
          )}

          {/* Route Details */}
          {generatedRoute && (
            <div className="card animate-fade-in">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Route Details</h2>
                  <p className="text-gray-600 mt-1">
                    {generatedRoute.city}, {generatedRoute.country}
                  </p>
                </div>
                <button
                  onClick={handleApproveRoute}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? 'Saving...' : '✓ Approve & Save Route'}
                </button>
              </div>

              <div className="space-y-4">
                {generatedRoute.routes.map((route) => (
                  <div key={route.day} className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold">Day {route.day}</h3>
                    <p className="text-sm text-gray-600">{route.description}</p>
                    <p className="text-sm font-medium mt-1">
                      Distance: {route.distanceKm} km
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {route.startPoint.name || 'Start'} → {route.endPoint.name || 'End'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-lg font-semibold">
                  Total Distance: {generatedRoute.totalDistanceKm} km
                </p>
              </div>
            </div>
          )}

          {/* Weather Forecast */}
          {generatedRoute && generatedRoute.weather && generatedRoute.weather.length > 0 && (
            <div className="card animate-fade-in">
              <h2 className="text-xl font-semibold mb-4">3-Day Weather Forecast</h2>
              <div className="grid grid-cols-3 gap-4">
                {generatedRoute.weather.map((day, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                      Day {index + 1}
                    </div>
                    <img
                      src={getWeatherIconUrl(day.icon)}
                      alt={day.description}
                      className="w-16 h-16 mx-auto"
                    />
                    <div className="text-2xl font-bold my-2">
                      {formatTemperature(day.temperature)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {day.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      H: {formatTemperature(day.temperatureMax)} / L: {formatTemperature(day.temperatureMin)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
