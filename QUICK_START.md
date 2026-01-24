# 🚀 Quick Start Guide - Phase 4 Complete!

## What's Been Implemented

✅ **Phase 4: Route Planning Feature** is now complete!
- Gemini AI integration for route generation
- Leaflet maps with realistic paths
- 3-day weather forecasts
- Route approval and database saving

---

## Setup Instructions

### 1. Get API Keys (Free!)

#### Gemini API Key
```bash
# Visit: https://makersuite.google.com/app/apikey
# Click "Get API key" → Create API key
# Copy the key
```

#### Weather API Key (Optional)
```bash
# Visit: https://openweathermap.org/api
# Sign up for free account
# Go to API keys tab
# Copy the default key (may take 2 hours to activate)
```

### 2. Configure Environment Variables

**Auth Server** (`auth-server/.env`):
```bash
cp auth-server/.env.example auth-server/.env
# Then edit auth-server/.env:

PORT=4000
MONGODB_URI=mongodb://localhost:27017/hiking-auth
JWT_SECRET=my-super-secret-key-123
JWT_REFRESH_SECRET=my-refresh-secret-key-456
CLIENT_URL=http://localhost:3000
```

**Next.js Client** (`client/.env.local`):
```bash
# Already created! Edit client/.env.local:

NEXT_PUBLIC_AUTH_URL=http://localhost:4000
MONGODB_URI=mongodb://localhost:27017/hiking-routes
GEMINI_API_KEY=your-gemini-api-key-here    # REQUIRED
WEATHER_API_KEY=your-weather-key-or-leave-empty  # Optional
JWT_SECRET=my-super-secret-key-123  # Must match auth server
```

### 3. Start MongoDB

**Option A: Docker (Easiest)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: Homebrew**
```bash
brew services start mongodb-community
```

### 4. Run the Servers

**Terminal 1 - Auth Server:**
```bash
cd auth-server
npm run dev
```

**Terminal 2 - Next.js Client:**
```bash
cd client
npm run dev
```

### 5. Test It Out!

1. **Go to:** http://localhost:3000
2. **Register** an account (any fake email works: `test@test.com`)
3. **Login** with your credentials
4. **Navigate to "Plan Route"**
5. **Try generating a route:**
   - Location: `Swiss Alps, Switzerland`
   - Type: Hiking
   - Duration: 2 days
   - Click "Generate Route with AI"

---

## 🧪 Testing Authentication

Run the test script:
```bash
cd auth-server
npm run test:auth
```

This will:
- Register test user
- Login and get JWT
- Decode the token
- Verify authentication

---

## What's Next?

- **Phase 5:** History page with route retrieval
- **Phase 6:** Polish and testing
- **Phase 7:** Deployment and documentation

---

## Troubleshooting

### "GEMINI_API_KEY not defined"
- Make sure `.env.local` exists in `/client`
- Restart the Next.js server after adding the key
- The key should start with `AI...`

### "Map not loading"
- Leaflet requires client-side rendering
- Check browser console for errors
- Make sure you're using the dynamic import (already configured)

### "Weather not showing"
- Weather is optional
- If API key is missing/invalid, route still works
- OpenWeatherMap keys can take up to 2 hours to activate

### "Can't connect to MongoDB"
- Make sure MongoDB is running: `docker ps` or `brew services list`
- Check connection string in `.env` files
- Default: `mongodb://localhost:27017`

---

## File Structure

```
client/
├── src/
│   ├── app/
│   │   └── planning/
│   │       ├── page.tsx          # Main planning page (UPDATED)
│   │       └── actions.ts        # Server Actions (NEW)
│   ├── components/
│   │   └── RouteMap.tsx         # Leaflet map component (NEW)
│   └── lib/
│       ├── gemini.ts            # Gemini AI integration (NEW)
│       └── weather.ts           # Weather API integration (NEW)
└── .env.local                   # Environment variables (NEW)
```
