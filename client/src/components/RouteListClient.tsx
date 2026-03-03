/**
 * ===========================================
 * ROUTE LIST CLIENT COMPONENT
 * ===========================================
 * 
 * Client component for filtering and sorting routes
 * 
 * DEFENSE NOTES:
 * - Client component because it uses useState for filters
 * - Receives routes as props from server component
 * - All filtering/sorting happens client-side for instant UI updates
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { SavedRoute } from '@/types';
import ImageWithFallback from '@/components/ImageWithFallback';

interface RouteListClientProps {
  routes: SavedRoute[];
}

export default function RouteListClient({ routes }: RouteListClientProps) {
  // Filter & Sort State
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'longest' | 'shortest' | 'duration'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'trek' | 'bicycle'>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique countries for filter
  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(routes.map(r => r.country))].sort();
    return uniqueCountries;
  }, [routes]);

  // Apply filters and sorting
  const filteredAndSortedRoutes = useMemo(() => {
    let filtered = [...routes];

    // Filter by trip type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.tripType === filterType);
    }

    // Filter by country
    if (filterCountry !== 'all') {
      filtered = filtered.filter(r => r.country === filterCountry);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'longest':
          return b.totalDistanceKm - a.totalDistanceKm;
        case 'shortest':
          return a.totalDistanceKm - b.totalDistanceKm;
        case 'duration':
          return b.durationDays - a.durationDays;
        default:
          return 0;
      }
    });

    return filtered;
  }, [routes, sortBy, filterType, filterCountry]);

  const activeFiltersCount = [
    filterType !== 'all',
    filterCountry !== 'all',
    sortBy !== 'newest'
  ].filter(Boolean).length;

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters - Desktop */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="card sticky top-24 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort By
            </h3>
            <div className="space-y-2 mt-3">
              {[
                { value: 'newest', label: 'Newest First', icon: '📅' },
                { value: 'oldest', label: 'Oldest First', icon: '📆' },
                { value: 'longest', label: 'Longest', icon: '📏' },
                { value: 'shortest', label: 'Shortest', icon: '📐' },
                { value: 'duration', label: 'Most Days', icon: '⏱️' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    sortBy === option.value
                      ? 'bg-primary text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h3>
            <div className="space-y-4 mt-3">
              {/* Trip Type */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Trip Type
                </label>
                <div className="space-y-2 mt-2">
                  {[
                    { value: 'all', label: 'All Types', icon: '🌍' },
                    { value: 'trek', label: 'Hiking', icon: '🥾' },
                    { value: 'bicycle', label: 'Cycling', icon: '🚴' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilterType(option.value as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        filterType === option.value
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="mr-2">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Filter */}
              {countries.length > 1 && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Country
                  </label>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800"
                  >
                    <option value="all">All Countries</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Reset Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setSortBy('newest');
                setFilterType('all');
                setFilterCountry('all');
              }}
              className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All ({activeFiltersCount})
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredAndSortedRoutes.length} {filteredAndSortedRoutes.length === 1 ? 'route' : 'routes'}
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>

        {/* Mobile Filter Panel */}
        {showFilters && (
          <div className="lg:hidden mb-4 card space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Sort & Filter</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="form-input text-sm w-full"
              >
                <option value="newest">📅 Newest First</option>
                <option value="oldest">📆 Oldest First</option>
                <option value="longest">📏 Longest</option>
                <option value="shortest">📐 Shortest</option>
                <option value="duration">⏱️ Most Days</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="form-input text-sm w-full"
              >
                <option value="all">🌍 All Types</option>
                <option value="trek">🥾 Hiking</option>
                <option value="bicycle">🚴 Cycling</option>
              </select>

              {countries.length > 1 && (
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="form-input text-sm w-full"
                >
                  <option value="all">All Countries</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              )}

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setSortBy('newest');
                    setFilterType('all');
                    setFilterCountry('all');
                  }}
                  className="w-full btn btn-secondary text-sm"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}

      {/* Routes Grid */}
      {filteredAndSortedRoutes.length === 0 ? (
        <div className="card text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No routes match your filters
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your filters to see more routes
          </p>
          <button
            onClick={() => {
              setSortBy('newest');
              setFilterType('all');
              setFilterCountry('all');
            }}
            className="btn btn-primary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedRoutes.map((savedRoute) => (
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
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
