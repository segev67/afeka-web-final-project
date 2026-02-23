/**
 * ===========================================
 * LEAFLET MAP COMPONENT WITH ROUTING
 * ===========================================
 * 
 * Interactive map component using Leaflet.js with realistic routing
 * 
 * DEFENSE NOTES (CRITICAL FOR DEFENSE):
 * 
 * WHY "use client"?
 * - Leaflet requires the `window` object (browser-only)
 * - Server-side rendering (SSR) will fail with Leaflet
 * - Must be a Client Component
 * 
 * WHY CSS IN LAYOUT?
 * - Leaflet CSS is imported in app/layout.tsx (global styles)
 * - Leaflet Routing Machine CSS also imported there
 * - Cannot dynamically import CSS files in TypeScript (build error)
 * - CSS must be loaded before component mounts
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
 * PROJECT REQUIREMENT (CRITICAL):
 * "Note that the routes should NOT come out as a straight line from 
 *  point to point but actually a REALISTIC ROUTE on paths/roads"
 * 
 * SOLUTION: Leaflet Routing Machine
 * - Uses OSRM (Open Source Routing Machine) by default
 * - Generates realistic routes following actual roads/trails
 * - Free and open-source routing service
 * - See: https://leafletjs.com/plugins.html
 */

'use client';

import { useEffect, useRef } from 'react';
import type { DayRoute } from '@/types';

// ===========================================
 // COMPONENT PROPS
// ===========================================

interface RouteMapProps {
  routes: DayRoute[];
  tripType?: 'bicycle' | 'trek'; // Optional trip type for routing profile
  height?: string;
}

// ===========================================
// MAP COMPONENT
// ===========================================

/**
 * RouteMap Component
 * 
 * Displays hiking/cycling routes on an interactive Leaflet map using landmarks.
 * 
 * NEW APPROACH WITH REALISTIC ROUTING:
 * - Shows numbered markers at major landmarks (waypoints)
 * - Uses Leaflet Routing Machine for realistic routes on roads/trails
 * - Routes follow actual paths, not straight lines (CRITICAL REQUIREMENT)
 * - Popups display landmark names and descriptions
 * - Color-coded by day
 * 
 * ROUTING ENGINE:
 * - Uses OSRM (Open Source Routing Machine)
 * - Free public routing service
 * - Generates routes following actual roads and trails
 * - Supports foot/bike routing profiles
 * 
 * @param routes - Array of day routes to display
 * @param height - Map container height (default: 500px)
 */
export default function RouteMap({ routes, tripType, height = '500px' }: RouteMapProps) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamic import of Leaflet
    // DEFENSE: This is the key - importing inside useEffect ensures client-side only
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      
      // Import Leaflet Routing Machine
      // DEFENSE: Must be imported dynamically like Leaflet to avoid SSR issues
      await import('leaflet-routing-machine');

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

      console.log('🗺️  RouteMap: Rendering', routes.length, 'routes with landmarks');

      // Find first landmark with coordinates for initial map center
      let initialLat = 46.2044; // Default: Geneva
      let initialLng = 6.1432;
      
      for (const route of routes) {
        if (route.majorLandmarks && route.majorLandmarks.length > 0) {
          const firstLandmark = route.majorLandmarks[0];
          if (firstLandmark.lat && firstLandmark.lng) {
            initialLat = firstLandmark.lat;
            initialLng = firstLandmark.lng;
            break;
          }
        }
      }

      // Initialize map
      const map = L.map(mapRef.current).setView([initialLat, initialLng], 10);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
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
      routes.forEach((route, routeIndex) => {
        console.log(`📍 Drawing route ${routeIndex + 1} (Day ${route.day}):`, {
          title: route.title,
          landmarksCount: route.majorLandmarks?.length || 0,
        });

        const color = colors[routeIndex % colors.length];
        const landmarks = route.majorLandmarks || [];

        // Filter landmarks that have valid coordinates
        const validLandmarks = landmarks.filter(l => 
          l.lat !== undefined && 
          l.lng !== undefined &&
          !isNaN(l.lat) && 
          !isNaN(l.lng)
        );

        if (validLandmarks.length === 0) {
          console.warn(`⚠️  Route ${routeIndex + 1}: No landmarks with valid coordinates`);
          return;
        }

        console.log(`   Found ${validLandmarks.length} valid landmarks`);

        // Create numbered markers for each landmark
        validLandmarks.forEach((landmark, landmarkIndex) => {
          const lat = landmark.lat!;
          const lng = landmark.lng!;
          
          allCoords.push([lat, lng]);

          // Create custom numbered icon
          const numberIcon = L.divIcon({
            className: 'custom-number-icon',
            html: `
              <div style="
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              ">
                ${landmarkIndex + 1}
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          // Add marker
          const marker = L.marker([lat, lng], {
            icon: numberIcon,
            title: landmark.name,
          }).addTo(map);

          // Add popup with landmark info
          marker.bindPopup(`
            <div style="min-width: 200px;">
              <strong style="color: ${color};">Day ${route.day} - Stop ${landmarkIndex + 1}</strong><br/>
              <strong>${landmark.name}</strong><br/>
              ${landmark.description ? `<em>${landmark.description}</em><br/>` : ''}
              <small>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</small>
            </div>
          `);

          console.log(`   ✅ Marker ${landmarkIndex + 1}: ${landmark.name}`);
        });

        // CRITICAL REQUIREMENT: Use realistic routing instead of straight lines
        // Draw realistic routes between landmarks using Leaflet Routing Machine
        if (validLandmarks.length >= 2) {
          const waypoints = validLandmarks.map(l => L.latLng(l.lat!, l.lng!));

          // DEFENSE EXPLANATION:
          // - L.Routing.control creates a routing control
          // - waypoints: array of coordinates to route through
          // - router: uses OSRM (Open Source Routing Machine) for realistic routes
          // - createMarker: returns false to use our custom numbered markers instead
          // - lineOptions: customizes the route line appearance
          // - show: false hides the turn-by-turn directions panel
          // - addWaypoints: false prevents adding new waypoints by clicking
          // - routeWhileDragging: false improves performance
          // - fitSelectedRoutes: false to let us control map bounds manually
          
          const routingControl = (L as any).Routing.control({
            waypoints,
            router: (L as any).Routing.osrmv1({
              serviceUrl: 'https://router.project-osrm.org/route/v1',
              // Use 'foot' profile for hiking, 'bike' for cycling
              // OSRM profiles: 'car', 'bike', 'foot'
              profile: tripType?.toLowerCase() === 'bicycle' ? 'bike' : 'foot',
            }),
            // Don't show default markers (we have our custom numbered ones)
            createMarker: function() { return false; },
            // Style the route line
            lineOptions: {
              styles: [{ 
                color, 
                weight: 4, 
                opacity: 0.7 
              }]
            },
            // Hide the turn-by-turn directions panel
            show: false,
            // Disable adding waypoints by clicking
            addWaypoints: false,
            // Disable route dragging for performance
            routeWhileDragging: false,
            // Don't auto-fit bounds (we'll do it manually)
            fitSelectedRoutes: false,
            // Collapse the instruction panel
            collapsible: false,
          }).addTo(map);

          // Add a popup to the route line showing route info
          routingControl.on('routesfound', function(e: any) {
            const routes = e.routes;
            if (routes && routes.length > 0) {
              const summary = routes[0].summary;
              const totalDistance = (summary.totalDistance / 1000).toFixed(2); // Convert to km
              const totalTime = Math.round(summary.totalTime / 60); // Convert to minutes
              
              console.log(`   ✅ Realistic route calculated: ${totalDistance} km, ~${totalTime} min`);
              
              // Get the line and add popup
              const line = routingControl.getContainer()?.querySelector('.leaflet-routing-container');
              if (routes[0].coordinates && routes[0].coordinates.length > 0) {
                const midPoint = routes[0].coordinates[Math.floor(routes[0].coordinates.length / 2)];
                const midMarker = L.marker([midPoint.lat, midPoint.lng], {
                  opacity: 0, // Invisible marker just for popup
                }).addTo(map);
                
                midMarker.bindPopup(`
                  <div style="min-width: 200px;">
                    <strong style="color: ${color};">Day ${route.day}</strong><br/>
                    <strong>${route.title}</strong><br/>
                    Distance: ${totalDistance} km<br/>
                    Estimated Time: ${totalTime} min<br/>
                    ${route.description ? `<em>${route.description}</em>` : ''}
                  </div>
                `);
              }
            }
          });

          console.log(`   ✅ Realistic route connecting ${validLandmarks.length} landmarks (using OSRM)`);
        }
      });

      // Fit map to show all landmarks
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
        console.log(`✅ Map fitted to ${allCoords.length} landmark coordinates`);
      } else {
        console.warn('⚠️  No coordinates available for map bounds');
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
  }, [routes, tripType]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '0.5rem' }}
      className="leaflet-container"
    />
  );
}
