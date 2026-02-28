# Project Requirements Checklist

## ✅ Core Architecture

### 1. Express Server
- ✅ **User authentication**: Login/Register with bcrypt salt encryption
- ✅ **JWT tokens**: Contains userId, username, email
- ✅ **Token in JWT**: Contains "username" (name of submitter) ✓
- ✅ **Silent refresh**: Token lasts 24 hours (matches "once a day")
- ✅ **Refresh token**: 7-day refresh token for extended sessions

**Files**: 
- `auth-server/src/controllers/authController.ts`
- `auth-server/src/utils/tokenUtils.ts`
- `auth-server/.env` (JWT_EXPIRES_IN=24h)

### 2. Next.js Server
- ✅ **Middleware authorization**: `client/src/proxy.ts` checks tokens
- ✅ **Soft authorization**: Transparent to user, no error messages shown
- ✅ **Homepage title**: "Afeka Hiking Trails 2026" ✓
- ✅ **Two main pages**: Planning + History (plus Login/Register)

**Files**: 
- `client/src/proxy.ts`
- `client/src/app/page.tsx`
- `client/src/app/planning/page.tsx`
- `client/src/app/history/page.tsx`

---

## ✅ Page Requirements

### Page 1: Route Planning
- ✅ **Menu for creating routes**: Form with inputs
- ✅ **Maps with Leaflet**: Using Leaflet.js
- ✅ **LLM-generated routes**: Using Google Gemini AI
- ✅ **User inputs only**:
  - ✅ Country/Region/City
  - ✅ Trip type (Trek/Bicycle)
  - ✅ Trip duration (days)

**File**: `client/src/app/planning/page.tsx`

### Page 2: Routes History
- ✅ **Retrieve from database**: MongoDB queries
- ✅ **Display saved routes**: Cards with route details
- ✅ **Click to view details**: Dynamic route `/history/[id]`

**Files**: 
- `client/src/app/history/page.tsx`
- `client/src/app/history/[id]/page.tsx`

---

## ✅ Output Specifications

### Route Planning Logic

#### Bicycle Routes:
- ✅ **Distance**: 30-70 km per day ✓
- ✅ **Continuous days**: City to city (linear routes)
- ✅ **Daily distance shown**: Each day shows km

**Prompt in**: `client/src/lib/gemini.ts` (lines 79-80)

#### Trek Routes:
- ✅ **Distance**: 5-10 km per day ✓
- ✅ **Circular routes**: Start and end at same point
- ✅ **Daily distance shown**: Each day shows km

**Prompt in**: `client/src/lib/gemini.ts` (lines 79-80)

### Important Logic Notes:

#### 1. Realistic Routes (Not Straight Lines)
- ✅ **Leaflet Routing Machine**: Uses OSRM for realistic paths
- ✅ **Follows roads/trails**: Routes on actual paths
- ✅ **OSRM profiles**: 'bike' for cycling, 'foot' for hiking

**File**: `client/src/components/RouteMap.tsx` (lines 251-289)
**Documentation**: `ROUTING_IMPLEMENTATION.md`

#### 2. Real Weather Forecast
- ✅ **3-day forecast**: Using OpenWeatherMap API
- ✅ **Starts tomorrow**: Forecast for next 3 days
- ✅ **NOT shown during approval**: Only after saving
- ✅ **Shown in history**: Fresh weather when viewing saved routes

**Files**: 
- `client/src/lib/weather.ts`
- `client/src/app/history/[id]/page.tsx` (fetches weather)
**Documentation**: `WEATHER_REQUIREMENT_COMPLIANCE.md`

#### 3. Country-Typical Image
- ✅ **AI-generated**: Using Pollinations.ai
- ✅ **Generative code**: Meets requirement ✓
- ✅ **Fallback**: Lorem Picsum if AI fails
- ✅ **No quality control**: As per requirement

**Files**: 
- `client/src/lib/images.ts`
- `client/src/components/ImageWithFallback.tsx`
**Documentation**: `IMAGE_LOADING_FIX.md`

#### 4. Route Approval & Database
- ✅ **Approved without weather**: Weather not shown during approval
- ✅ **Saved to database**: MongoDB via Mongoose
- ✅ **User can save**: "Approve & Save Route" button

**Files**: 
- `client/src/app/planning/page.tsx` (approval UI)
- `client/src/app/planning/actions.ts` (save to DB)
- `client/src/lib/models/Route.ts` (Mongoose schema)

---

## ✅ Routes History Functionality

- ✅ **Retrieve past routes**: Query database by userId
- ✅ **Updated weather**: Fresh 3-day forecast fetched
- ✅ **"For execution tomorrow"**: Forecast starts tomorrow

**File**: `client/src/app/history/[id]/page.tsx` (lines 115-120)

---

## 📋 Additional Requirements

### Defense & Examination Preparation

You should be able to explain:

1. **Technology used**: Next.js, Express, MongoDB, Leaflet, Gemini AI
2. **Why each line exists**: Purpose and consequences of removal
3. **Next.js optimization**:
   - Server Components for data fetching
   - Client Components for interactivity
   - Server Actions for mutations
   - Dynamic imports for Leaflet (SSR issues)

### Submission Guidelines

#### Need to prepare:

1. ✅ **README.md**: Installation, explanations, cloud address
2. ⚠️ **Presentation Slide** (TO DO):
   - Page 1: Names, GitHub link, Cloud link
   - Page 2: Known bugs/problems
   - Page 3: Architecture diagram + code samples

3. ✅ **GitHub**: Code uploaded
4. ⚠️ **Cloud Deployment** (TO DO): Deploy to Vercel/Railway/etc.

---

## 🎯 What Still Needs Attention

### 1. Known Bugs to Document

For the presentation slide, document any known issues:
- AI image loading may be slow (fallback exists)
- OSRM routing may fail for remote locations (waypoints still visible)
- Gemini may occasionally generate wrong day count (prompt optimized)

### 2. Presentation Slide

Create a presentation with:
- **Slide 1**: Your names, GitHub URL, Cloud URL
- **Slide 2**: Known bugs/limitations (list above)
- **Slide 3**: Architecture diagram showing:
  - Express server (Auth)
  - Next.js server (App)
  - MongoDB database
  - External APIs (Gemini, OSRM, Weather, Images)

### 3. Cloud Deployment

Deploy to:
- **Next.js client**: Vercel (free tier)
- **Express auth-server**: Railway.app or Render (free tier)
- **MongoDB**: Already on MongoDB Atlas

Update `.env` files with production URLs.

### 4. README.md

Should include:
- Project description
- Installation steps
- Environment variables setup
- How to run locally
- Cloud deployment URL
- Technologies used
- Project structure

---

## ✅ Requirements Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Express Server | ✅ | Auth with JWT |
| JWT with username | ✅ | TokenPayload includes username |
| Silent refresh once a day | ✅ | 24-hour tokens |
| Next.js Server | ✅ | App with middleware |
| Homepage title "Afeka 2026" | ✅ | Correct title |
| Route Planning page | ✅ | With LLM & maps |
| Routes History page | ✅ | From database |
| User inputs only | ✅ | Location, type, days |
| Bicycle: 30-70 km | ✅ | In Gemini prompt |
| Trek: 5-10 km | ✅ | In Gemini prompt |
| Realistic routes | ✅ | OSRM routing |
| 3-day weather | ✅ | OpenWeatherMap |
| Country image | ✅ | AI-generated |
| Approve without weather | ✅ | Weather only in history |
| Save to database | ✅ | MongoDB |
| Retrieve with weather | ✅ | Fresh forecast |

---

## 🎓 For Defense

Be ready to explain:
1. How JWT authentication works
2. How Next.js middleware/proxy works
3. How Leaflet Routing Machine creates realistic routes
4. How Gemini AI generates route data
5. Why Server Components vs Client Components
6. How weather API integration works
7. How image fallback mechanism works

---

**Status**: ✅ All core requirements met! 
**Next Steps**: Prepare presentation slide + deploy to cloud
