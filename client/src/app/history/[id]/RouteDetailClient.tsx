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
}

// ===========================================
// COMPONENT
// ===========================================

export default function RouteDetailClient({ routes, routeId, userId }: RouteDetailClientProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <RouteMap routes={routes} height="600px" />
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
