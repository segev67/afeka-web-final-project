/**
 * ===========================================
 * HISTORY PAGE SERVER ACTIONS
 * ===========================================
 * 
 * Server actions for managing route history.
 */

'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Route from '@/lib/models/Route';
import type { ApiResponse } from '@/types';

/**
 * Delete Route Action
 * 
 * DEFENSE EXPLANATION:
 * - Deletes a route from the database
 * - Checks userId to ensure user owns the route (authorization)
 * - Revalidates history page cache after deletion
 * 
 * @param routeId - MongoDB _id of route to delete
 * @param userId - User ID for authorization
 * @returns Success/failure response
 */
export async function deleteRoute(
  routeId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    console.log(`🗑️  Deleting route ${routeId} for user ${userId}...`);

    await dbConnect();

    // Delete only if route belongs to user (security check)
    // DEFENSE: This prevents users from deleting other users' routes
    const result = await Route.deleteOne({ _id: routeId, userId });

    if (result.deletedCount === 0) {
      return {
        success: false,
        message: 'Route not found or unauthorized',
      };
    }

    console.log('✅ Route deleted successfully');

    // Revalidate history page
    // DEFENSE: Clear Next.js cache so deleted route disappears immediately
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
