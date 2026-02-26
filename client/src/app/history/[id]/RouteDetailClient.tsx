/**
 * ===========================================
 * ROUTE DETAIL CLIENT COMPONENT
 * ===========================================
 * 
 * Client component for interactive map and delete functionality.
 * 
 * DEFENSE NOTES:
 * - Separated from server component for Leaflet map
 * - Handles client-side interactions (delete button)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { DayRoute } from '@/types';
import { deleteRoute } from '../actions';

// Dynamic import for RouteMap (no SSR)
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

// ===========================================
// COMPONENT PROPS
// ===========================================

interface RouteDetailClientProps {
  routes: DayRoute[];
  routeId: string;
  userId: string;
  tripType?: 'bicycle' | 'trek';
  updatedWeather?: Array<{
    date: string;
    temperature: number;
    temperatureMax: number;
    temperatureMin: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  }>;
}

// ===========================================
// COMPONENT
// ===========================================

export default function RouteDetailClient({ routes, routeId, userId, tripType, updatedWeather }: RouteDetailClientProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const toggleExpand = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (expandedDays.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const getWeatherIconUrl = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`;
  const formatTemperature = (temp: number) => `${Math.round(temp)}°C`;
  
  // Helper to format dates
  const getTomorrowDate = (daysAhead: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead + 1); // +1 for tomorrow
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  /**
   * Handle Route Deletion
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteRoute(routeId, userId);

      if (result.success) {
        // Redirect to history page after successful deletion
        router.push('/history');
      } else {
        alert(result.message || 'Failed to delete route');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting the route');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Daily Routes Card with Expandable Details */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Daily Routes</h2>
        <div className="space-y-4">
          {routes.map((route) => {
            const isExpanded = expandedDays.has(route.day);
            
            return (
              <div key={route.day} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Summary Header - Always Visible */}
                <button
                  onClick={() => toggleExpand(route.day)}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">
                      Day {route.day}: {route.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>📏 {route.totalDistanceKm} km</span>
                      <span>📍 {route.segments.length} segments</span>
                    </div>
                  </div>
                  <svg 
                    className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Detailed Content - Expandable */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/50">
                    {route.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
                        {route.description}
                      </p>
                    )}
                    
                    {/* Segments Summary */}
                    <div className="space-y-3">
                      {route.segments.map((segment, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-sm mb-1">
                                {segment.from} → {segment.to}
                              </p>
                              {segment.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  {segment.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {segment.distanceKm} km
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-sm font-semibold mt-4 text-gray-700 dark:text-gray-300">
                      📏 Day Total: {route.totalDistanceKm} km
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Updated Weather Forecast */}
      {updatedWeather && updatedWeather.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Weather Forecast</h2>
            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded font-medium">
              Live Data
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            3-day forecast starting tomorrow
          </p>
          <div className="grid gap-3">
            {updatedWeather.map((day, index) => (
              <div key={index} className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={getWeatherIconUrl(day.icon)}
                      alt={day.description}
                      className="w-16 h-16"
                    />
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">
                        {getTomorrowDate(index)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {day.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        💧 {day.humidity}% • 💨 {day.windSpeed} m/s
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatTemperature(day.temperature)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      H: {formatTemperature(day.temperatureMax)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      L: {formatTemperature(day.temperatureMin)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Card */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Route Map</h2>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn bg-red-50 text-red-600 hover:bg-red-100 text-sm"
          >
            🗑️ Delete Route
          </button>
        </div>
        <RouteMap routes={routes} tripType={tripType} height="600px" />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Delete Route?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this route? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
