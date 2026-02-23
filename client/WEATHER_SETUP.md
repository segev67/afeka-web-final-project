# Weather Integration Setup Guide

## Overview

This project uses **OpenWeatherMap API** to provide real-time 3-day weather forecasts for hiking and cycling routes. The weather system is fully implemented and ready to use - you just need to configure an API key.

## Why Weather Integration?

- **Project Requirement**: "Every product is accompanied by a real weather forecast for the upcoming three days on the routes"
- **User Value**: Helps hikers/cyclists plan their trips with accurate weather information
- **Non-blocking Design**: The app works without weather data, but the feature enhances user experience

---

## Getting Your Free API Key

### Step 1: Sign Up for OpenWeatherMap

1. Go to **[https://openweathermap.org/api](https://openweathermap.org/api)**
2. Click the **"Sign Up"** button in the top right corner
3. Fill out the registration form with your email and password
4. Verify your email address (check your inbox for confirmation email)

### Step 2: Access Your API Key

1. Log in to your OpenWeatherMap account
2. Navigate to **"API keys"** section in your account dashboard
3. You should see a default API key already generated
4. Copy the API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

**Note**: It may take a few minutes (up to 2 hours) for new API keys to become active. If you get authentication errors immediately after signing up, wait a bit and try again.

---

## Configuration

### Option 1: Using .env.local (Recommended)

1. Navigate to the `client` directory of the project
2. Open (or create) the `.env.local` file
3. Add your API key:

```bash
WEATHER_API_KEY=your-actual-api-key-here
```

4. **Restart the development server**:
   - Stop the server (Ctrl+C)
   - Run `npm run dev` again
   - The weather system will now be active

### Option 2: Using .env (Alternative)

If you prefer to use `.env` instead of `.env.local`:

1. Copy `.env.example` to `.env`
2. Update the `WEATHER_API_KEY` value
3. Restart the server

**Important**: Never commit your `.env.local` or `.env` file to version control. These files are already in `.gitignore`.

---

## Testing the Weather Integration

### Test 1: Generate a New Route

1. Go to the **Planning** page (`/planning`)
2. Enter a location (e.g., "Geneva, Switzerland")
3. Select trip type and duration
4. Click **"Generate Route with AI"**
5. Scroll down to see **"3-Day Weather Forecast"** section
6. You should see weather cards with icons, temperatures, and descriptions

**Success Indicators:**
- ✅ Weather cards display with icons
- ✅ Temperature values are shown (in Celsius)
- ✅ Weather descriptions appear (e.g., "clear sky", "light rain")
- ✅ High/Low temperatures are visible

### Test 2: View Saved Route History

1. Save a generated route by clicking **"Approve & Save Route"**
2. Go to **History** page (`/history`)
3. Click on any saved route
4. Look for **"Updated Weather"** section with "Live Data" badge
5. Weather should show forecast starting from tomorrow

**Success Indicators:**
- ✅ "Live Data" badge is visible
- ✅ Weather updates each time you view the route
- ✅ Forecast shows 3 days starting from tomorrow

### Test 3: Console Verification

Open browser DevTools (F12) and check the console:

**With Valid API Key:**
```
🌤️  Fetching weather for 46.2044, 6.1432...
✅ Weather fetched: 3 days
```

**Without API Key (Expected Fallback):**
```
⚠️  Weather API key not configured
```

**With Invalid API Key:**
```
❌ Error fetching weather: Weather API error: 401
```

---

## API Limits & Quotas

### Free Tier Limits

- **Calls per minute**: 60
- **Calls per day**: 1,000
- **Data update frequency**: Every 10 minutes
- **Cost**: Free forever

**For this project**: The free tier is more than sufficient. Each route generation makes 1 API call, and weather is cached for 1 hour.

### Upgrade Options (Optional)

If you need more calls:
- **Startup**: $40/month (600,000 calls/month)
- **Developer**: $125/month (2 million calls/month)

**For final project defense**: Free tier is perfect!

---

## How It Works (Technical Details)

### Architecture

```
Planning Page → Server Action → weather.ts → OpenWeatherMap API
                                          ↓
                                    3-day forecast data
                                          ↓
                                Display in UI (cards)
```

### What Gets Fetched?

- **Endpoint**: `https://api.openweathermap.org/data/2.5/forecast`
- **Product**: 5-day / 3-hour forecast
- **Location**: Route starting point coordinates (lat/lng)
- **Units**: Metric (Celsius)
- **Cache**: 1 hour (Next.js built-in caching)

### Data Extraction Logic

The API returns 40 forecast entries (5 days × 8 entries per day). We:

1. Group by date
2. Prefer midday forecasts (11:00-14:00) for consistency
3. Extract first 3 unique days
4. Format temperature, description, icon, humidity, wind speed

### Non-blocking Design

**Important**: The weather system is designed to be non-blocking:

- ✅ App works without `WEATHER_API_KEY`
- ✅ Routes can still be generated
- ✅ Weather section simply doesn't appear if key is missing
- ✅ No error messages shown to users
- ✅ Only console warnings for developers

This means **weather is optional**, but recommended for full feature set.

---

## Troubleshooting

### Issue 1: "Weather section is empty"

**Possible Causes:**
1. API key not configured
2. API key not active yet (wait 2 hours after signup)
3. Invalid API key

**Solution:**
1. Check `.env.local` has correct key
2. Restart dev server (`npm run dev`)
3. Check browser console for error messages
4. Verify API key is active in OpenWeatherMap dashboard

### Issue 2: "Weather API error: 401"

**Cause**: Invalid or inactive API key

**Solution:**
1. Double-check the API key (no extra spaces)
2. Wait 1-2 hours if just created
3. Generate a new API key in OpenWeatherMap dashboard

### Issue 3: "Weather API error: 429"

**Cause**: Rate limit exceeded (60 calls/minute)

**Solution:**
- Wait 1 minute before trying again
- This is rare in development
- Weather is cached for 1 hour to prevent this

### Issue 4: Weather shows old data

**Cause**: Next.js caching (revalidation every 1 hour)

**Solution:**
- This is intentional! Reduces API calls
- For testing, you can force refresh by modifying `weather.ts`:
  ```typescript
  next: { revalidate: 10 } // Refresh every 10 seconds
  ```
- Don't forget to change it back to 3600 for production

---

## File Locations

If you need to modify the weather system:

| File | Purpose |
|------|---------|
| `client/src/lib/weather.ts` | Main weather API logic |
| `client/src/app/planning/actions.ts` | Fetches weather during route generation |
| `client/src/app/planning/page.tsx` | Displays weather cards |
| `client/src/app/history/[id]/page.tsx` | Shows updated weather for saved routes |
| `client/.env.local` | Your API key configuration |
| `client/.env.example` | Template with placeholder |

---

## Defense Notes

When presenting your project, be prepared to explain:

1. **Why OpenWeatherMap?**
   - Free tier available
   - Reliable and well-documented API
   - 3-hour forecast intervals are perfect for route planning
   - Used by thousands of production apps

2. **Why non-blocking design?**
   - Better user experience (app doesn't crash without weather)
   - Allows testing without API key
   - Weather is "nice to have", not critical path
   - Follows graceful degradation principle

3. **How is weather fetched?**
   - Server-side only (API key never exposed to browser)
   - Cached for 1 hour to reduce API calls
   - Uses route starting point coordinates
   - Extracts 3 days starting tomorrow

4. **What happens without API key?**
   - Console warning: "⚠️ Weather API key not configured"
   - Returns empty array: `[]`
   - Weather section doesn't render
   - Routes still work perfectly

---

## Quick Reference

```bash
# Get API key
https://openweathermap.org/api → Sign Up → API Keys

# Add to .env.local
WEATHER_API_KEY=your-key-here

# Restart server
npm run dev

# Test
Generate route → Check for "3-Day Weather Forecast"

# Debug
Check console: F12 → Console → Look for weather logs
```

---

## Support

- **OpenWeatherMap Docs**: https://openweathermap.org/api
- **Free API Guide**: https://openweathermap.org/appid
- **FAQ**: https://openweathermap.org/faq

---

**Status**: Weather system is fully implemented and tested. Just add your API key and you're ready to go! ✅
