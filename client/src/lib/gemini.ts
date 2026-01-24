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
 * HOW IT WORKS:
 * 1. We craft a detailed prompt with user requirements
 * 2. Gemini generates realistic route coordinates
 * 3. We parse the JSON response
 * 4. Validate and return route data
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
  
  // Distance constraints based on trip type
  const dailyDistanceMin = isBicycle ? 30 : 5;
  const dailyDistanceMax = isBicycle ? 70 : 10;
  
  // Route type description
  const routeType = isBicycle 
    ? 'continuous routes from city to city (multi-day journey)'
    : 'circular routes that start and end at the same point (1-3 separate day trips)';

  return `You are a hiking and cycling route expert. Generate realistic ${tripType} routes for ${location}.

REQUIREMENTS:
- Trip Type: ${tripType.toUpperCase()}
- Duration: ${durationDays} day${durationDays > 1 ? 's' : ''}
- Route Type: ${routeType}
- Daily Distance: ${dailyDistanceMin}-${dailyDistanceMax} km per day
- Routes must follow REAL paths/roads (not straight lines)

${isBicycle ? `
For BICYCLE routes:
- Create continuous multi-day journey
- Each day should connect: City A → City B → City C, etc.
- Routes should follow actual roads/bike paths
- End point of day N is start point of day N+1
` : `
For HIKING (TREK) routes:
- Create ${Math.min(durationDays, 3)} circular day trips
- Each route starts and ends at the same point
- Routes should follow actual hiking trails
- All routes can start from the same base location
`}

IMPORTANT - REALISTIC COORDINATES:
- Provide actual GPS coordinates (latitude, longitude)
- Include 5-8 waypoints per day for realistic path rendering
- Waypoints should follow actual roads/trails (not straight lines)
- Research real locations in ${location}

CRITICAL - JSON FORMAT:
- Return ONLY valid JSON
- Do NOT include any explanation or markdown
- Escape all quotes in strings properly
- No newlines inside string values

OUTPUT FORMAT (JSON only):
{
  "country": "Country name",
  "region": "Region/state name",
  "city": "Starting city name",
  "routes": [
    {
      "day": 1,
      "startPoint": { "lat": 0.0, "lng": 0.0, "name": "City/Location Name" },
      "endPoint": { "lat": 0.0, "lng": 0.0, "name": "City/Location Name" },
      "waypoints": [
        { "lat": 0.0, "lng": 0.0, "name": "Optional landmark" }
      ],
      "distanceKm": 0.0,
      "description": "Brief route description",
      "highlights": ["Point of interest 1", "Point of interest 2"]
    }
  ],
  "totalDistanceKm": 0.0,
  "difficulty": "easy|moderate|hard",
  "recommendations": ["Tip 1", "Tip 2"]
}

Generate the route now. Return ONLY the JSON, no explanation.`;
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
        temperature: 0.7, // Balance creativity and accuracy
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Increased for detailed routes
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

    if (!route.waypoints || route.waypoints.length === 0) {
      console.error(`Route ${route.day}: No waypoints provided`);
      return false;
    }
  }

  return true;
}
