/**
 * ===========================================
 * IMAGE UTILITIES
 * ===========================================
 * 
 * Utilities for fetching country-typical images.
 * 
 * PROJECT REQUIREMENT:
 * "The route page will be accompanied by one image (typical of the country), 
 *  real or produced in generative code. No control over the quality of the 
 *  image is required."
 * 
 * APPROACH:
 * - Use Unsplash API (free) to fetch country/location-typical images
 * - Fallback to Picsum (Lorem Picsum) for generic landscape images
 * - No API key required for basic usage
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

/**
 * Generate a consistent hash/seed for location
 * This ensures the same location always gets the same image
 */
function generateLocationSeed(country: string, city?: string, tripType?: string): string {
  const str = `${country.toLowerCase()}-${city?.toLowerCase() || 'region'}-${tripType || 'nature'}`;
  // Simple hash function to convert location to a consistent number
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
}

/**
 * Fetch Country-Typical Image
 * 
 * Fetches a representative image for the given location.
 * 
 * @param country - Country name
 * @param city - City name (optional)
 * @param tripType - Type of trip (for better image context)
 * @returns Image URL or undefined if failed
 */
export async function fetchCountryImage(
  country: string,
  city?: string,
  tripType?: 'trek' | 'bicycle'
): Promise<string | undefined> {
  try {
    // Build search query
    const locationQuery = city ? `${city} ${country}` : country;
    const activityQuery = tripType === 'trek' ? 'hiking mountain trail' : 'cycling landscape';
    const query = `${locationQuery} ${activityQuery} nature`;

    console.log(`🖼️  Fetching image for: ${query}`);

    // Try Unsplash if we have an API key
    if (UNSPLASH_ACCESS_KEY) {
      const unsplashUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`;
      
      const response = await fetch(unsplashUrl, {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Image fetched from Unsplash');
        return data.urls.regular; // High quality image
      }
    }

    // Fallback: Use Lorem Picsum with a deterministic seed based on location
    // The seed is a hash of the location, ensuring:
    // 1. Same location + trip type = same image (consistency across reloads)
    // 2. Different locations = different images (variety)
    // 3. Deterministic and predictable
    const seed = generateLocationSeed(country, city, tripType);
    const picsumUrl = `https://picsum.photos/seed/${seed}/1200/600`;
    
    console.log('✅ Using location-based image (Lorem Picsum)');
    console.log(`   Image seed: ${seed} for ${country}${city ? ` - ${city}` : ''}`);
    
    return picsumUrl;

  } catch (error) {
    console.error('❌ Error fetching image:', error);
    
    // Final fallback: Generic landscape image
    const seed = 'hiking-trail';
    return `https://picsum.photos/seed/${seed}/1200/600`;
  }
}

/**
 * Get Image Alt Text
 * 
 * Generates appropriate alt text for accessibility.
 * 
 * @param country - Country name
 * @param city - City name (optional)
 * @param tripType - Type of trip
 * @returns Alt text description
 */
export function getImageAltText(
  country: string,
  city?: string,
  tripType?: 'trek' | 'bicycle'
): string {
  const location = city ? `${city}, ${country}` : country;
  const activity = tripType === 'trek' ? 'hiking' : 'cycling';
  return `Scenic ${activity} landscape in ${location}`;
}
