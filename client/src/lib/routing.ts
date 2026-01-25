/**
 * ===========================================
 * ROUTING SERVICE - OSRM Integration
 * ===========================================
 * 
 * Uses OSRM (Open Source Routing Machine) to get realistic routes
 * that follow actual roads and trails.
 * 
 * WHY THIS APPROACH:
 * - LLM generates start/end points and route concepts
 * - OSRM calculates the actual path between points
 * - Result: Routes that follow real roads/trails, not straight lines
 * 
 * API: Public OSRM instance (free, no API key)
 * Docs: http://project-osrm.org/docs/v5.24.0/api/
 */

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export type RouteProfile = 'driving' | 'cycling' | 'foot';

/**
 * Get realistic route between two points using OSRM
 * 
 * @param start - Starting coordinate
 * @param end - Ending coordinate
 * @param profile - Route type ('foot' for hiking, 'cycling' for bikes)
 * @returns Array of waypoints that follow real roads/trails
 */
export async function getRealisticRoute(
  start: RoutePoint,
  end: RoutePoint,
  profile: RouteProfile = 'foot'
): Promise<RoutePoint[]> {
  try {
    console.log(`🗺️  getRealisticRoute called:`, { start, end, profile });
    
    // OSRM API expects coordinates as: longitude,latitude
    const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    
    // Use public OSRM server
    const baseUrl = profile === 'foot' 
      ? 'https://routing.openstreetmap.de/routed-foot/route/v1'
      : profile === 'cycling'
      ? 'https://routing.openstreetmap.de/routed-bike/route/v1'
      : 'https://router.project-osrm.org/route/v1';
    
    const url = `${baseUrl}/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;

    console.log(`🗺️  Fetching realistic route via OSRM (${profile})...`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AfekaHikingTrails/1.0',
      },
    });

    if (!response.ok) {
      console.error(`❌ OSRM API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Error body:`, errorText);
      return fallbackInterpolation(start, end);
    }

    const data = await response.json();
    console.log(`   OSRM response:`, { routes: data.routes?.length, code: data.code });
    
    if (!data.routes || data.routes.length === 0) {
      console.error('❌ No routes found from OSRM');
      console.error('   Response:', JSON.stringify(data, null, 2));
      return fallbackInterpolation(start, end);
    }

    // Extract coordinates from GeoJSON
    const routeCoords = data.routes[0].geometry.coordinates;
    
    // OSRM returns [lng, lat], convert to our format
    // Sample every Nth point to get ~10-15 waypoints
    const totalPoints = routeCoords.length;
    const targetPoints = 12;
    const step = Math.max(1, Math.floor(totalPoints / targetPoints));
    
    const waypoints: RoutePoint[] = routeCoords
      .filter((_: any, i: number) => i % step === 0 || i === totalPoints - 1)
      .map((coord: [number, number]) => ({
        lng: coord[0],
        lat: coord[1],
      }));

    console.log(`✅ Generated ${waypoints.length} waypoints from real ${profile} route`);
    return waypoints;

  } catch (error) {
    console.error('❌ Error fetching route from OSRM:', error);
    return fallbackInterpolation(start, end);
  }
}

/**
 * Fallback: Create curved interpolation between points
 * 
 * If routing service fails, we create a natural-looking curve
 * instead of a straight line.
 */
function fallbackInterpolation(start: RoutePoint, end: RoutePoint): RoutePoint[] {
  console.log('⚠️  Using curved interpolation fallback');
  
  const waypoints: RoutePoint[] = [];
  const numPoints = 12;
  
  const latDiff = end.lat - start.lat;
  const lngDiff = end.lng - start.lng;
  
  // Create perpendicular offset for curve
  const perpLat = -lngDiff * 0.12;
  const perpLng = latDiff * 0.12;
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    
    // Use sine curve for natural variation
    const curveOffset = Math.sin(t * Math.PI) * 0.4;
    
    waypoints.push({
      lat: start.lat + latDiff * t + perpLat * curveOffset,
      lng: start.lng + lngDiff * t + perpLng * curveOffset,
    });
  }
  
  return waypoints;
}

/**
 * Process all routes from LLM with realistic routing
 * 
 * Takes LLM-generated start/end points and gets real routes for each.
 * For circular routes (trek), generates a circular path.
 * 
 * @param routes - Routes from LLM with start/end points
 * @param tripType - Type of trip for route profile selection
 * @returns Routes with realistic waypoints
 */
export async function enhanceRoutesWithRealisticPaths(
  routes: Array<{
    day: number;
    startPoint: RoutePoint;
    endPoint: RoutePoint;
    distanceKm: number;
    description: string;
  }>,
  tripType: 'trek' | 'bicycle'
): Promise<Array<{
  day: number;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  waypoints: RoutePoint[];
  distanceKm: number;
  description: string;
}>> {
  
  const profile: RouteProfile = tripType === 'bicycle' ? 'cycling' : 'foot';
  
  // Process each route to get realistic waypoints
  const enhancedRoutes = await Promise.all(
    routes.map(async (route) => {
      // Check if this is a circular route (start = end)
      const isCircular = 
        Math.abs(route.startPoint.lat - route.endPoint.lat) < 0.001 &&
        Math.abs(route.startPoint.lng - route.endPoint.lng) < 0.001;

      let waypoints: RoutePoint[];

      if (isCircular) {
        // For circular routes (trek), generate a circular path
        console.log(`   Generating circular route for day ${route.day}`);
        waypoints = generateCircularRoute(route.startPoint, route.distanceKm);
      } else {
        // For linear routes (bicycle), use OSRM
        const allWaypoints = await getRealisticRoute(
          route.startPoint,
          route.endPoint,
          profile
        );
        
        // Keep ALL waypoints except first and last (they're start/end)
        // But only if we have more than 2 points
        waypoints = allWaypoints.length > 2 
          ? allWaypoints.slice(1, -1)
          : allWaypoints;
      }
      
      console.log(`   Day ${route.day}: ${waypoints.length} waypoints generated`);
      
      return {
        ...route,
        waypoints,
      };
    })
  );
  
  return enhancedRoutes;
}

/**
 * Generate a circular hiking route
 * 
 * Creates a loop that starts and ends at the same point.
 * Uses a circular pattern with some randomization for natural appearance.
 * 
 * @param center - Starting/ending point
 * @param distanceKm - Target distance in km
 * @returns Array of waypoints forming a circle
 */
function generateCircularRoute(center: RoutePoint, distanceKm: number): RoutePoint[] {
  const waypoints: RoutePoint[] = [];
  
  // Calculate radius based on distance
  // For a circular path, circumference = 2πr, so r = distance / (2π)
  // Increase the radius by 50% to make routes more visible
  const radiusKm = (distanceKm / (2 * Math.PI)) * 1.5;
  
  // Convert to degrees (rough: 1 degree ≈ 111 km at equator)
  const radiusDeg = radiusKm / 111;
  
  // Generate points in a circle with more variation
  const numPoints = 12;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    
    // Add more randomness to make it look more natural (±30%)
    const randomFactor = 0.7 + Math.random() * 0.6;
    const r = radiusDeg * randomFactor;
    
    // Add angular variation to create a more organic shape
    const angleVariation = (Math.random() - 0.5) * 0.5;
    const actualAngle = angle + angleVariation;
    
    waypoints.push({
      lat: center.lat + r * Math.sin(actualAngle),
      lng: center.lng + r * Math.cos(actualAngle) / Math.cos(center.lat * Math.PI / 180), // Adjust for latitude
    });
  }
  
  console.log(`   Generated circular route with ${waypoints.length} waypoints, radius: ${radiusKm.toFixed(2)} km`);
  
  return waypoints;
}
