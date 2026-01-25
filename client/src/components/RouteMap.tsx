/**
 * ===========================================
 * LEAFLET MAP COMPONENT
 * ===========================================
 * 
 * Interactive map component using Leaflet.js
 * 
 * DEFENSE NOTES (CRITICAL FOR DEFENSE):
 * 
 * WHY "use client"?
 * - Leaflet requires the `window` object (browser-only)
 * - Server-side rendering (SSR) will fail with Leaflet
 * - Must be a Client Component
 * 
 * WHY DYNAMIC IMPORT?
 * - Even as Client Component, Next.js tries to pre-render
 * - We use dynamic import with { ssr: false } to skip SSR
 * - This is the CORRECT way to use Leaflet in Next.js
 * 
 * WHAT HAPPENS IF SSR IS NOT DISABLED?
 * - Build error: "window is not defined"
 * - Leaflet tries to access window.document during build
 * - App won't compile
 * 
 * PROJECT REQUIREMENT:
 * "For an example of the ability to display maps and routes
 *  see: https://leafletjs.com/examples/quick-start/"
 */

'use client';

import { useEffect, useRef } from 'react';
import type { DayRoute } from '@/types';

// ===========================================
 // COMPONENT PROPS
// ===========================================

interface RouteMapProps {
  routes: DayRoute[];
  height?: string;
}

// ===========================================
// MAP COMPONENT
// ===========================================

/**
 * RouteMap Component
 * 
 * Displays hiking/cycling routes on an interactive Leaflet map.
 * 
 * FEATURES:
 * - Multiple day routes with different colors
 * - Markers for start/end points
 * - Polylines following waypoints
 * - Popups with route information
 * 
 * @param routes - Array of day routes to display
 * @param height - Map container height (default: 500px)
 */
export default function RouteMap({ routes, height = '500px' }: RouteMapProps) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamic import of Leaflet
    // DEFENSE: This is the key - importing inside useEffect ensures client-side only
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      
      // Import Leaflet CSS
      // DEFENSE: CSS must also be imported dynamically
      await import('leaflet/dist/leaflet.css');

      // Fix marker icon issue in Next.js
      // DEFENSE: Leaflet's default marker icons don't work in Next.js without this fix
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // If map already exists, remove it
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      if (!routes || routes.length === 0) {
        console.log('❌ RouteMap: No routes provided');
        return;
      }

      console.log('🗺️  RouteMap: Rendering', routes.length, 'routes');
      console.log('First route waypoints count:', routes[0]?.waypoints?.length || 0);
      console.log('First route data:', JSON.stringify(routes[0], null, 2));

      // Initialize map centered on first route's start point
      const firstRoute = routes[0];
      const map = L.map(mapRef.current).setView(
        [firstRoute.startPoint.lat, firstRoute.startPoint.lng],
        10
      );

      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
      // DEFENSE: This is the free map tile provider
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Color palette for different days
      const colors = [
        '#2d5a27', // Day 1: Forest green
        '#8b5a2b', // Day 2: Earth brown
        '#3b82f6', // Day 3: Blue
        '#f59e0b', // Day 4: Amber
        '#ef4444', // Day 5: Red
      ];

      // All coordinates for fitting map bounds
      const allCoords: [number, number][] = [];

      // Draw each day's route
      routes.forEach((route, index) => {
        console.log(`📍 Drawing route ${index + 1}:`, {
          day: route.day,
          waypointsCount: route.waypoints?.length || 0,
          hasStart: !!route.startPoint,
          hasEnd: !!route.endPoint,
        });

        const color = colors[index % colors.length];

        // Create array of coordinates for the polyline
        // DEFENSE: Polyline needs [lat, lng] pairs
        const waypoints = route.waypoints || [];
        const routeCoords: [number, number][] = [
          [route.startPoint.lat, route.startPoint.lng],
          ...waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
          [route.endPoint.lat, route.endPoint.lng],
        ];

        console.log(`   Total coordinates for polyline: ${routeCoords.length}`);
        console.log(`   Sample coords:`, routeCoords.slice(0, 3));
        
        if (routeCoords.length < 2) {
          console.error(`❌ Not enough coordinates to draw route ${index + 1}`);
          return;
        }

        allCoords.push(...routeCoords);

        // Draw polyline
        // DEFENSE: Polyline creates the path on the map
        const polyline = L.polyline(routeCoords, {
          color,
          weight: 4,
          opacity: 0.7,
        }).addTo(map);
        
        console.log(`   ✅ Polyline added to map with color ${color}`);

        // Add popup to polyline
        polyline.bindPopup(`
          <div style="min-width: 200px;">
            <strong>Day ${route.day}</strong><br/>
            Distance: ${route.distanceKm} km<br/>
            ${route.description}
          </div>
        `);

        // Add start marker
        const startMarker = L.marker([route.startPoint.lat, route.startPoint.lng], {
          title: `Day ${route.day} - Start`,
        }).addTo(map);

        startMarker.bindPopup(`
          <div>
            <strong>Day ${route.day} - Start</strong><br/>
            ${route.startPoint.name || 'Starting point'}
          </div>
        `);

        // Add end marker
        const endMarker = L.marker([route.endPoint.lat, route.endPoint.lng], {
          title: `Day ${route.day} - End`,
        }).addTo(map);

        endMarker.bindPopup(`
          <div>
            <strong>Day ${route.day} - End</strong><br/>
            ${route.endPoint.name || 'Ending point'}
          </div>
        `);
      });

      // Fit map to show all routes
      // DEFENSE: This ensures all routes are visible
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routes]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '0.5rem' }}
      className="leaflet-container"
    />
  );
}
