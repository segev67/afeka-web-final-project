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
 * - Natural language descriptions make routes human-followable
 * - Real place names ensure routes are realistic
 * 
 * NEW APPROACH:
 * Instead of generating abstract coordinate waypoints, we ask Gemini to:
 * - Act as a local guide with real knowledge of the area
 * - Use actual street names, trail names, and landmarks
 * - Provide turn-by-turn narrative directions
 * - Include GPS for major landmarks only (for map display)
 * 
 * @param location - User's desired location
 * @param tripType - 'trek' or 'bicycle'
 * @param durationDays - Number of days for the trip
 * @returns Formatted prompt for Gemini
 */
function createRoutePrompt(
  location: string,
  tripType: TripType,
  durationDays: number,
  userNotes?: string
): string {
  const isBicycle = tripType === 'bicycle';
  const dailyDistanceMin = isBicycle ? 30 : 5;
  const dailyDistanceMax = isBicycle ? 70 : 10;
  const isLongTrip = durationDays >= 10;

  const compactNote = isLongTrip
    ? `
COMPACT OUTPUT (${durationDays} days): To avoid truncation, use SHORT format so the full JSON fits in one response:
- Use exactly 2-3 segments per day (not more).
- Use 3-4 major landmarks per day with lat/lng.
- One short sentence per segment "description" (e.g. "Walk north from X to Y along the river.").
- Omit or use one word for landmark "description" and route "description" if needed.
`
    : '';

  const userPreferences = userNotes
    ? `
USER'S SPECIAL PREFERENCES:
${userNotes}

Please incorporate these preferences into your route planning.
`
    : '';

  return `You are an EXPERT LOCAL ${isBicycle ? 'CYCLING' : 'HIKING'} GUIDE with intimate knowledge of ${location}.

Your task: Create EXACTLY ${durationDays} ${isBicycle ? 'days' : 'day(s)'} of realistic ${tripType} route(s) that a human can actually follow.
${compactNote}${userPreferences}
CRITICAL REQUIREMENTS:
1. MUST generate EXACTLY ${durationDays} routes (one per day) - NO MORE, NO LESS
2. Use REAL place names: actual street names, trail names, landmarks, cities
3. Routes must be FOLLOWABLE using your descriptions alone (no abstract GPS coordinates)
4. Write natural narrative directions: "Start at X, head north on Y road, after 5km you'll see Z..."
5. ${isBicycle ? 'LINEAR ROUTES: City to city, each day connects to the next. Use named roads/highways.' : 'CIRCULAR ROUTES: Start and end at same point. Use named trails and return to origin.'}
6. Distance per day: ${dailyDistanceMin}-${dailyDistanceMax} km
7. Include ${isLongTrip ? '3-4' : '5-7'} major landmarks per day with REAL names
8. Break each day into ${isLongTrip ? '2-3' : '3-5'} segments (from landmark A to landmark B)

IMPORTANT: The routes array MUST contain EXACTLY ${durationDays} items (day 1 through day ${durationDays}).

RESEARCH the location first - use real places that exist!

JSON RULES (critical for valid parsing):
- Return ONLY valid JSON. No markdown, no extra text.
- Inside string values: escape double-quotes as \\", and do NOT use literal newlines (use spaces or \\n).
- Keep each "description" to 1-2 short sentences to avoid truncation.

OUTPUT FORMAT (JSON only):
{
  "country": "Country name",
  "region": "Region name",
  "city": "Starting city",
  "routes": [
    {
      "day": 1,
      "title": "Descriptive route title (e.g., 'Geneva to Lausanne via Lake Geneva')",
      "segments": [
        {
          "from": "Starting landmark name",
          "to": "Destination landmark name",
          "description": "Natural narrative directions with street/trail names. Include what to look for, landmarks passed, and turns to make.",
          "distanceKm": 12,
          "landmarks": ["Notable place 1", "Notable place 2"]
        }
      ],
      "majorLandmarks": [
        {
          "name": "Landmark name",
          "description": "Brief description",
          "lat": 46.2044,
          "lng": 6.1432
        }
      ],
      "totalDistanceKm": ${dailyDistanceMin + (dailyDistanceMax - dailyDistanceMin) / 2},
      "description": "Overall day summary"
    }
  ],
  "totalDistanceKm": 0.0,
  "difficulty": "easy|moderate|hard",
  "recommendations": ["Practical tip 1", "Practical tip 2"]
}

EXAMPLES of good narrative directions:
- "From Geneva Central Station, follow Rue du Mont-Blanc north toward the lake. After 2km, you'll reach the Jet d'Eau fountain..."
- "Exit Coppet village center heading east on Route de Lausanne (N1). The path follows the lakeshore with views of the Alps..."
- "Take the marked trail from Chamonix town square. Follow red trail markers uphill through forest for 3km to Refuge de Plan Joran..."

CRITICAL: Return ONLY valid JSON. Use real places. Make routes followable by humans. Escape quotes in strings. No newlines inside strings.`;
}

/**
 * Normalize raw LLM text for JSON parsing: fix common issues that break JSON.parse.
 * Applied to both initial text and regex-extracted fallback.
 */
function normalizeJsonText(raw: string): string {
  return raw
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ');
}

/**
 * If the JSON string looks truncated, try to close it.
 * Handles truncation both outside and inside a string (e.g. mid-description).
 * Closes in reverse order of opening (e.g. } ] } ] }) so the result is valid JSON.
 * Returns the repaired string or null if repair is not applicable.
 */
function tryCloseTruncatedJson(str: string): string | null {
  let repaired = str.trim();
  // Count unescaped double-quotes to detect if we're inside a string
  const unescapedQuotes = (repaired.match(/(?<!\\)"/g) || []).length;
  const inString = unescapedQuotes % 2 !== 0;
  if (inString) {
    repaired += '"'; // close the truncated string
  }
  // Build closing sequence in reverse order of opening (track nesting)
  const stack: string[] = [];
  let inStr = false;
  let escape = false;
  let i = 0;
  while (i < repaired.length) {
    const c = repaired[i];
    if (escape) {
      escape = false;
      i++;
      continue;
    }
    if (c === '\\' && inStr) {
      escape = true;
      i++;
      continue;
    }
    if ((c === '"') && !escape) {
      inStr = !inStr;
      i++;
      continue;
    }
    if (!inStr) {
      if (c === '{') stack.push('}');
      else if (c === '[') stack.push(']');
      else if (c === '}' || c === ']') stack.pop();
    }
    i++;
  }
  if (stack.length > 0) {
    repaired += stack.reverse().join('');
  }
  if (!inString && stack.length === 0) return null;
  return repaired;
}

/**
 * Sanitize route data after parsing (especially after truncation recovery).
 * - Drops routes with fewer than 2 segments so validation passes.
 * - Renumbers days to 1, 2, 3...
 * - Fills missing totalDistanceKm from sum of per-route distances.
 * - Adds defaults for missing difficulty/recommendations.
 */
function sanitizeRecoveredRouteData(data: LLMRouteResponse): LLMRouteResponse {
  const routes = (data.routes || []).filter((r) => {
    if (!Array.isArray(r.segments) || r.segments.length < 2) return false;
    const withCoords = (r.majorLandmarks || []).filter(
      (m) => m?.lat != null && m?.lng != null
    );
    return withCoords.length >= 2;
  });
  if (routes.length === 0) {
    return data;
  }
  const renumbered = routes.map((r, i) => ({ ...r, day: i + 1 }));
  const totalDistanceKm =
    data.totalDistanceKm ??
    renumbered.reduce((sum, r) => sum + (Number(r.totalDistanceKm) || 0), 0);
  return {
    ...data,
    routes: renumbered,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    difficulty: data.difficulty || 'moderate',
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
  };
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
  durationDays: number,
  userNotes?: string
): Promise<LLMRouteResponse | null> {
  try {
    console.log(`🤖 Generating ${tripType} route for ${location} (${durationDays} days)...`);
    if (userNotes) {
      console.log(`   📝 User preferences: ${userNotes}`);
    }

    // Create prompt (include user notes if provided)
    const prompt = createRoutePrompt(location, tripType, durationDays, userNotes);

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

    // Normalize for parsing (fix unescaped newlines/tabs that break JSON)
    jsonText = normalizeJsonText(jsonText);

    // Parse JSON with error handling
    let routeData: LLMRouteResponse;
    try {
      routeData = JSON.parse(jsonText);
    } catch (parseError) {
      const len = text.length;
      console.error('❌ JSON parsing failed. Response length:', len);
      console.error('   First 400 chars:', text.substring(0, 400));
      console.error('   Last 200 chars:', text.substring(Math.max(0, len - 200)));

      // Try regex extraction from raw text, then normalize and parse
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let candidate = normalizeJsonText(jsonMatch[0]);
        try {
          routeData = JSON.parse(candidate);
          console.log('✅ Recovered JSON using regex + normalization');
        } catch {
          // If still invalid, try closing truncated JSON (missing trailing } ] } )
          candidate = tryCloseTruncatedJson(candidate);
          if (candidate) {
            try {
              routeData = JSON.parse(candidate);
              console.log('✅ Recovered JSON after closing truncated brackets');
            } catch {
              throw new Error('Failed to parse Gemini response as JSON. The AI may have returned malformed or truncated data.');
            }
          } else {
            throw new Error('Failed to parse Gemini response as JSON. The AI may have returned malformed data.');
          }
        }
      } else {
        throw new Error('No valid JSON found in Gemini response');
      }
    }

    // Sanitize after parse (drops incomplete routes from truncation, fills totalDistanceKm)
    routeData = sanitizeRecoveredRouteData(routeData);

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
 * Ensures the LLM response has all required fields for landmark-based routes.
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
    if (!route.title) {
      console.error(`Route ${route.day}: Missing title`);
      return false;
    }

    if (!route.segments || route.segments.length < 2) {
      console.error(`Route ${route.day}: Need at least 2 segments for a complete route (got ${route.segments?.length || 0})`);
      return false;
    }

    // Validate segments (be lenient - allow some segments to have minor issues)
    let validSegments = 0;
    for (const segment of route.segments) {
      if (!segment.from || !segment.to) {
        console.warn(`Route ${route.day}: Segment missing 'from' or 'to' landmark`);
        continue;
      }

      if (!segment.description || segment.description.length < 20) {
        console.warn(`Route ${route.day}: Segment has short description (got: "${segment.description}")`);
        // Don't fail validation, just warn
      }

      if (!segment.distanceKm || segment.distanceKm <= 0) {
        console.warn(`Route ${route.day}: Segment missing valid distance`);
        // Don't fail validation, estimate distance as 0 for now
        // The route will still be usable with waypoints
      }
      
      validSegments++;
    }
    
    // At least half the segments should be valid
    if (validSegments < route.segments.length / 2) {
      console.error(`Route ${route.day}: Too many invalid segments (${validSegments}/${route.segments.length} valid)`);
      return false;
    }

    if (!route.majorLandmarks || route.majorLandmarks.length < 2) {
      console.error(`Route ${route.day}: Need at least 2 major landmarks for map display (got ${route.majorLandmarks?.length || 0})`);
      return false;
    }

    // Validate major landmarks have coordinates
    for (const landmark of route.majorLandmarks) {
      if (!landmark.name) {
        console.error(`Route ${route.day}: Landmark missing name`);
        return false;
      }
      
      if (landmark.lat === undefined || landmark.lng === undefined) {
        console.error(`Route ${route.day}: Landmark "${landmark.name}" missing GPS coordinates for map display`);
        return false;
      }
    }
  }

  return true;
}
