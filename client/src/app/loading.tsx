/**
 * ===========================================
 * GLOBAL LOADING STATE
 * ===========================================
 * 
 * Loading UI shown during page transitions.
 * 
 * DEFENSE NOTES:
 * - loading.tsx is a special Next.js file
 * - Shown while page is loading/fetching data
 * - Wrapped in Suspense boundary automatically
 */

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
