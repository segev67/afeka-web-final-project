/**
 * ===========================================
 * WEATHER API INTEGRATION
 * ===========================================
 * 
 * Integration with OpenWeatherMap API for weather forecasts.
 * 
 * DEFENSE NOTES:
 * 
 * PROJECT REQUIREMENT:
 * "Every product is accompanied by a real weather forecast
 *  for the upcoming three days on the routes"
 * 
 * API USED:
 * - OpenWeatherMap (free tier available)
 * - 5-day/3-hour forecast endpoint
 * - Get API key: https://openweathermap.org/api
 */

import type { WeatherData, Coordinate } from '@/types';

// ===========================================
// CONFIGURATION
// ===========================================

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// ===========================================
// WEATHER FETCHING
// ===========================================

/**
 * Fetch 3-Day Weather Forecast
 * 
 * DEFENSE EXPLANATION:
 * 
 * WHY 3 DAYS?
 * - Project requirement: "real weather forecast for the upcoming three days"
 * - Assumption: route starts tomorrow
 * 
 * API DETAILS:
 * - OpenWeatherMap free tier: 5-day/3-hour forecast
 * - We extract next 3 days from the forecast
 * - Returns temperature, conditions, wind, humidity
 * 
 * ERROR HANDLING:
 * - If API fails, return empty array (non-blocking)
 * - User can still see route, just without weather
 * 
 * @param location - Coordinate to get weather for
 * @returns Array of 3 days of weather data
 */
export async function fetchWeatherForecast(
  location: Coordinate
): Promise<WeatherData[]> {
  if (!WEATHER_API_KEY) {
    console.warn('⚠️  Weather API key not configured');
    return [];
  }

  try {
    console.log(`🌤️  Fetching weather for ${location.lat}, ${location.lng}...`);

    // Call OpenWeatherMap 5-day forecast API
    const url = `${WEATHER_BASE_URL}/forecast?lat=${location.lat}&lon=${location.lng}&appid=${WEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract 3-day forecast
    // DEFENSE: We group forecasts by day and take one per day
    const forecast = extractThreeDayForecast(data);

    console.log(`✅ Weather fetched: ${forecast.length} days`);

    return forecast;

  } catch (error) {
    console.error('❌ Error fetching weather:', error);
    return []; // Non-blocking: return empty if fails
  }
}

/**
 * Extract 3-Day Forecast from API Response
 * 
 * DEFENSE EXPLANATION:
 * - OpenWeatherMap returns 40 forecasts (5 days × 8 times/day)
 * - We need 1 forecast per day for 3 days
 * - We take the midday (12:00) forecast for each day
 * 
 * @param apiData - Raw API response from OpenWeatherMap
 * @returns Formatted 3-day forecast
 */
function extractThreeDayForecast(apiData: any): WeatherData[] {
  const forecasts: WeatherData[] = [];
  const seenDates = new Set<string>();

  // Process each forecast entry
  for (const item of apiData.list) {
    if (forecasts.length >= 3) break; // Only need 3 days

    // Extract date (YYYY-MM-DD)
    const date = item.dt_txt.split(' ')[0];
    
    // Only take one forecast per day (prefer midday forecasts)
    if (!seenDates.has(date)) {
      const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);
      
      // Prefer midday forecasts (11:00-14:00)
      if (hour >= 11 && hour <= 14) {
        seenDates.add(date);

        forecasts.push({
          date,
          temperature: Math.round(item.main.temp),
          temperatureMax: Math.round(item.main.temp_max),
          temperatureMin: Math.round(item.main.temp_min),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
        });
      }
    }
  }

  // If we couldn't get midday forecasts, just take first 3 unique days
  if (forecasts.length < 3) {
    forecasts.length = 0;
    seenDates.clear();

    for (const item of apiData.list) {
      if (forecasts.length >= 3) break;

      const date = item.dt_txt.split(' ')[0];
      
      if (!seenDates.has(date)) {
        seenDates.add(date);

        forecasts.push({
          date,
          temperature: Math.round(item.main.temp),
          temperatureMax: Math.round(item.main.temp_max),
          temperatureMin: Math.round(item.main.temp_min),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
        });
      }
    }
  }

  return forecasts;
}

/**
 * Get Weather Icon URL
 * 
 * OpenWeatherMap provides weather icons.
 * 
 * @param iconCode - Icon code from API (e.g., "10d")
 * @returns Full URL to icon image
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Format Temperature
 * 
 * @param temp - Temperature in Celsius
 * @returns Formatted string with degree symbol
 */
export function formatTemperature(temp: number): string {
  return `${temp}°C`;
}

/**
 * Fetch Weather for Multiple Locations
 * 
 * Used when route has multiple points across different regions.
 * For now, we just use the start point.
 * 
 * @param locations - Array of coordinates
 * @returns Weather data for first location
 */
export async function fetchWeatherForRoute(
  locations: Coordinate[]
): Promise<WeatherData[]> {
  if (locations.length === 0) {
    return [];
  }

  // For simplicity, use weather from the starting point
  // In a more advanced version, you could average multiple locations
  return fetchWeatherForecast(locations[0]);
}
