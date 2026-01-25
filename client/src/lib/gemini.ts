/**
 * ===========================================
 * GEMINI AI INTEGRATION
 * ===========================================
 * 
 * This file handles route generation using Google Gemini AI.
 * 
 * DEFENSE NOTES:
 * 
 * WHY GEMINI?
 * - Free tier available
 * - Good at structured JSON generation
 * - Fast response times
 * - Supports long context
 * 
 * PROJECT REQUIREMENT:
 * "All information on the hiking routes is drawn from LLM models"
 * 
 * HOW IT WORKS (HYBRID APPROACH):
 * 1. Gemini generates route concepts (start/end points, descriptions)
 * 2. OSRM routing service calculates realistic waypoints between points
 * 3. Result: Routes that follow real roads/trails, not imaginary paths
 * 
 * This satisfies the requirement while ensuring realistic routes.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TripType, LLMRouteResponse } from '@/types';

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Initialize Gemini AI
 * 
 * DEFENSE EXPLANATION:
 * - API key stored in environment variable (server-side only)
 * - Never exposed to client
 * - This code runs on Next.js server (Server Actions or API routes)
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Use Gemini 1.5 Pro (stable model)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ===========================================
// PROMPT ENGINEERING
// ===========================================

/**
 * Create Route Generation Prompt
 * 
 * DEFENSE EXPLANATION:
 * Prompt engineering is critical for LLM success:
 * - Clear instructions reduce hallucination
 * - Structured JSON output makes parsing reliable
 * - Specific requirements ensure project compliance
 * 
 * @param location - User's desired location
 * @param tripType - 'trek' or 'bicycle'
 * @param durationDays - Number of days for the trip
 * @returns Formatted prompt for Gemini
 */
function createRoutePrompt(
  location: string,
  tripType: TripType,
  durationDays: number
): string {
  const isBicycle = tripType === 'bicycle';
  const dailyDistanceMin = isBicycle ? 30 : 5;
  const dailyDistanceMax = isBicycle ? 70 : 10;

  return `You are a GEOSPATIAL SIMULATION ENGINE. Generate ${durationDays} realistic ${tripType} route(s) for ${location}.

ALGORITHMIC RULES:
1. ANCHOR POINTS: Place 5-6 landmarks in NON-LINEAR pattern (not straight line)
2. BROWNIAN BRIDGE: Between anchors, add 2-3 waypoints with ±20° terrain deviation
3. ANTI-LINEARITY: NO three consecutive points in straight line (add lateral jitter)
4. ${isBicycle ? 'LINEAR: City to city, each day connects' : 'CIRCULAR: Start = End (loop), place anchors in polygon pattern'}
5. CATMULL-ROM SPLINE logic: Smooth curves, no sharp turns

OUTPUT (15 waypoints/day, coordinates only, no names in waypoints):
{
  "country": "Name",
  "region": "Region", 
  "city": "City",
  "routes": [
    {
      "day": 1,
      "startPoint": {"lat": 0.0, "lng": 0.0, "name": "Start"},
      "endPoint": {"lat": 0.0, "lng": 0.0, "name": "End"},
      "waypoints": [{"lat": 0.0, "lng": 0.0}],
      "distanceKm": ${dailyDistanceMin + (dailyDistanceMax - dailyDistanceMin) / 2},
      "description": "Brief route description",
      "highlights": ["POI1", "POI2"]
    }
  ],
  "totalDistanceKm": 0.0,
  "difficulty": "moderate",
  "recommendations": ["Tip"]
}

CRITICAL: Return ONLY valid JSON. 15 waypoints per route minimum.`;
}

// ===========================================
// ROUTE GENERATION
// ===========================================

/**
 * Generate Route using Gemini AI
 * 
 * DEFENSE EXPLANATION:
 * 
 * ERROR HANDLING:
 * - Try/catch for network errors
 * - JSON parsing validation
 * - Fallback responses
 * 
 * WHAT HAPPENS IF API FAILS?
 * - User sees error message
 * - Can retry the request
 * - No app crash
 * 
 * @param location - Destination location
 * @param tripType - Type of trip (trek/bicycle)
 * @param durationDays - Trip duration
 * @returns Generated route data or null
 */
export async function generateRoute(
  location: string,
  tripType: TripType,
  durationDays: number
): Promise<LLMRouteResponse | null> {
  try {
    console.log(`🤖 Generating ${tripType} route for ${location} (${durationDays} days)...`);

    // Create prompt
    const prompt = createRoutePrompt(location, tripType, durationDays);

    // Call Gemini API
    // DEFENSE: generationConfig controls output format and quality
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8, // Higher temperature for more creative/varied waypoints
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 16384, // Increased to handle 25+ waypoints per route
        responseMimeType: 'application/json', // CRITICAL: Force JSON response
      },
    });

    const response = result.response;
    const text = response.text();

    console.log('📝 Gemini response received, parsing JSON...');

    // Extract JSON from response
    // Sometimes Gemini wraps JSON in markdown code blocks or returns invalid JSON
    let jsonText = text.trim();
    
    // Remove markdown code block if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Try to fix common JSON issues
    // DEFENSE: LLMs sometimes generate invalid JSON with unescaped quotes
    jsonText = jsonText
      .replace(/\n/g, ' ') // Remove newlines in strings
      .replace(/\r/g, '') // Remove carriage returns
      .replace(/\t/g, ' '); // Replace tabs with spaces

    // Parse JSON with error handling
    let routeData: LLMRouteResponse;
    try {
      routeData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ JSON parsing failed, raw response:', text.substring(0, 500));
      
      // Try to extract just the JSON object using regex
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          routeData = JSON.parse(jsonMatch[0]);
          console.log('✅ Recovered JSON using regex extraction');
        } catch {
          throw new Error('Failed to parse Gemini response as JSON. The AI may have returned malformed data.');
        }
      } else {
        throw new Error('No valid JSON found in Gemini response');
      }
    }

    // Basic validation
    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('No routes in response');
    }

    console.log('✅ Route generated successfully!');
    console.log(`   - ${routeData.routes.length} day(s)`);
    console.log(`   - Total distance: ${routeData.totalDistanceKm} km`);

    return routeData;

  } catch (error) {
    console.error('❌ Error generating route:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }

    return null;
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate Route Data
 * 
 * Ensures the LLM response has all required fields.
 * 
 * @param data - Route data from LLM
 * @returns true if valid, false otherwise
 */
export function validateRouteData(data: Partial<LLMRouteResponse>): boolean {
  if (!data.country || !data.city) {
    console.error('Missing location data');
    return false;
  }

  if (!data.routes || data.routes.length === 0) {
    console.error('No routes provided');
    return false;
  }

  // Validate each route
  for (const route of data.routes) {
    if (!route.startPoint?.lat || !route.startPoint?.lng) {
      console.error(`Route ${route.day}: Missing start point coordinates`);
      return false;
    }

    if (!route.endPoint?.lat || !route.endPoint?.lng) {
      console.error(`Route ${route.day}: Missing end point coordinates`);
      return false;
    }

    if (!route.waypoints || route.waypoints.length < 12) {
      console.error(`Route ${route.day}: Need at least 12 waypoints for smooth curves (got ${route.waypoints?.length || 0})`);
      return false;
    }
  }

  return true;
}
