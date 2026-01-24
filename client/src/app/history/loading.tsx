/**
 * ===========================================
 * LOADING STATE FOR HISTORY PAGE
 * ===========================================
 * 
 * This file provides a loading UI while the history page is loading.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS loading.tsx?
 * - Special Next.js file for loading states
 * - Automatically wraps page in Suspense boundary
 * - Shows this component while the page component is loading
 * 
 * WHY USE IT?
 * - History page fetches data from database
 * - Without loading state, user sees blank page
 * - Provides better UX with skeleton/loading indicators
 * 
 * WHAT HAPPENS IF REMOVED?
 * - Page will still work
 * - User might see blank page during data fetching
 * - Worse user experience
 */

export default function HistoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-5 w-72 bg-gray-200 dark:bg-gray-700 rounded mt-3 animate-pulse" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card">
            {/* Image Skeleton */}
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 animate-pulse" />
            
            {/* Title Skeleton */}
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            
            {/* Details Skeleton */}
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            
            {/* Button Skeleton */}
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mt-4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
