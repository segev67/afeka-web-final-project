# 🥾 Afeka Hiking Trails 2026

> A full-stack web application for planning hiking and cycling routes using AI-powered route generation, interactive maps, and real-time weather forecasts.

**Course:** Web Development - Semester A 2026  
**Institution:** Afeka College of Engineering

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Defense Preparation](#defense-preparation)
- [Cloud Deployment](#cloud-deployment)
- [Known Issues](#known-issues)
- [Contributors](#contributors)

---

## Overview

Afeka Hiking Trails is a dual-server web application that allows users to:
- Plan hiking (trek) or cycling routes using AI-generated suggestions
- Visualize routes on interactive maps powered by Leaflet.js
- View real-time weather forecasts for planned routes
- Save and retrieve previously planned routes

The application demonstrates the use of modern web technologies including Next.js App Router, Express.js authentication server, MongoDB, and integration with LLM APIs.

---

## Features

### 🔐 Authentication
- Secure user registration and login
- Password encryption with bcrypt + salt
- JWT-based authentication
- Silent token refresh (once daily)

### 🗺️ Route Planning
- **AI-powered route generation** using LLM (Google Gemini 2.5 Flash)
  - Advanced prompt engineering with geospatial algorithms
  - Brownian Bridge simulation for natural path curves
  - Catmull-Rom Spline concepts for smooth trajectories
  - Anti-linearity constraints to prevent straight-line artifacts
- Support for two trip types:
  - **Bicycle:** 30-70 km continuous routes (city to city)
  - **Trek:** 5-10 km circular routes
- Interactive Leaflet maps with path visualization
  - **15-20 waypoints per route** for smooth curves
  - Routes follow natural, curved patterns
  - Note: Routes may not perfectly align with visible roads (LLM limitation)
- 3-day weather forecast for route locations
- Country-typical images representing the destination
  - Unsplash API integration for high-quality images (optional)
  - Lorem Picsum fallback for placeholder images

### 📚 Route History
- Save approved routes to database
- Retrieve and view past planned routes
- Updated weather forecasts for saved routes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                    React Components (Next.js)                   │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
         Login/Register              Protected API Calls
                    │                     (JWT Token)
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│    EXPRESS AUTH SERVER      │   │     NEXT.JS APP SERVER      │
│    (Identity Provider)      │   │     (Application Server)    │
│         Port: 4000          │   │         Port: 3000          │
├─────────────────────────────┤   ├─────────────────────────────┤
│ Endpoints:                  │   │ Pages:                      │
│ • POST /api/register        │   │ • / (Homepage)              │
│ • POST /api/login           │   │ • /planning                 │
│ • POST /api/refresh         │   │ • /history                  │
│ • GET  /api/verify          │   │                             │
├─────────────────────────────┤   │ Middleware:                 │
│ Security:                   │   │ • JWT Validation            │
│ • bcrypt + salt hashing     │   │                             │
│ • JWT generation            │   │ Integrations:               │
│ • httpOnly cookies          │   │ • LLM API (Route Gen)       │
└──────────────┬──────────────┘   │ • Weather API               │
               │                  │ • Image Generation          │
               ▼                  └──────────────┬──────────────┘
┌─────────────────────────────┐                  │
│      MongoDB Atlas          │◄─────────────────┘
│  ┌─────────┐ ┌─────────┐   │
│  │ Users   │ │ Routes  │   │
│  └─────────┘ └─────────┘   │
└─────────────────────────────┘
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14+ (App Router), React 18, Tailwind CSS |
| **Backend (Auth)** | Node.js, Express.js |
| **Backend (App)** | Next.js Server Components, Server Actions |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT, bcrypt |
| **Maps** | Leaflet.js, React-Leaflet |
| **AI Integration** | OpenAI API / Google Gemini |
| **Weather** | OpenWeatherMap API |
| **Deployment** | Vercel (Next.js), Railway/Render (Express) |

---

## Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- API Keys for:
  - OpenAI or Google Gemini
  - OpenWeatherMap

### Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/afeka-hiking-trails-2026.git
cd afeka-hiking-trails-2026
```

### Install Dependencies

**Auth Server:**
```bash
cd auth-server
npm install
```

**Next.js Client:**
```bash
cd client
npm install
```

---

## Configuration

### Auth Server Environment Variables
Create `auth-server/.env`:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/hiking-auth
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### Next.js Client Environment Variables
Create `client/.env.local`:
```env
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
MONGODB_URI=mongodb://localhost:27017/hiking-routes
GEMINI_API_KEY=your-gemini-api-key
WEATHER_API_KEY=your-openweathermap-api-key
JWT_SECRET=your-super-secret-jwt-key
UNSPLASH_ACCESS_KEY=your-unsplash-key-optional  # Optional for better images
```

**Get API Keys:**
- **Gemini:** https://makersuite.google.com/app/apikey (Free)
- **Weather:** https://openweathermap.org/api (Free tier available)
- **Unsplash (Optional):** https://unsplash.com/developers (For better images)

---

## Running the Application

### Prerequisites
Start MongoDB:
```bash
# Option 1: Docker (Recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option 2: Homebrew (macOS)
brew services start mongodb-community
```

### Development Mode

**Terminal 1 - Auth Server:**
```bash
cd auth-server
npm run dev
# Server runs on http://localhost:4000
```

**Terminal 2 - Next.js Client:**
```bash
cd client
npm run dev
# App runs on http://localhost:3000
```

Access the application at: `http://localhost:3000`

### Production Build
```bash
# Auth Server
cd auth-server
npm run build
npm start

# Next.js Client
cd client
npm run build
npm start
```

---

## Testing

### Manual Testing Flow

1. **Register a new user:**
   - Navigate to http://localhost:3000
   - Click "Sign Up"
   - Use any fake email (e.g., `test@test.com`)
   - Password: minimum 6 characters

2. **Test route planning:**
   - Go to "Plan Route"
   - Enter: Swiss Alps, Switzerland
   - Select: Hiking (Trek)
   - Duration: 2 days
   - Click "Generate Route with AI"
   - Wait ~10-20 seconds for Gemini to generate
   - Review the route on the map
   - Click "Approve & Save Route"

3. **Test route history:**
   - Go to "My Routes"
   - See your saved route
   - Click "View Details"
   - See the route with updated weather forecast
   - Test delete functionality

### Auth Testing Script

Test authentication endpoints:
```bash
cd auth-server
npm run test:auth
```

This will:
- Register test user
- Login and get JWT token
- Decode the token to show contents
- Verify token validity

### MongoDB Verification

Check saved data:
```bash
# Access MongoDB shell
docker exec -it mongodb mongosh

# View users
use hiking-auth
db.users.find({}, {username:1, email:1}).pretty()

# View routes
use hiking-routes
db.routes.find({}, {city:1, country:1, tripType:1, totalDistanceKm:1}).pretty()
```

---

## Project Structure

```
afeka-hiking-trails-2026/
├── auth-server/                 # Express Authentication Server
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   │   └── authController.ts
│   │   ├── middleware/          # Auth middleware
│   │   │   └── authMiddleware.ts
│   │   ├── models/              # Mongoose schemas
│   │   │   └── User.ts
│   │   ├── routes/              # API routes
│   │   │   └── authRoutes.ts
│   │   ├── utils/               # Helper functions
│   │   │   └── tokenUtils.ts
│   │   └── index.ts             # Server entry point
│   ├── test-auth.ts             # Auth testing script
│   ├── .env.example             # Environment template
│   ├── .gitignore
│   └── package.json
│
├── client/                      # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with Navbar
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── login/
│   │   │   │   └── page.tsx     # Login page
│   │   │   ├── register/
│   │   │   │   └── page.tsx     # Registration page
│   │   │   ├── planning/
│   │   │   │   ├── page.tsx     # Route planning page
│   │   │   │   └── actions.ts   # Server actions
│   │   │   ├── history/
│   │   │   │   ├── page.tsx     # Routes history list
│   │   │   │   ├── actions.ts   # History actions
│   │   │   │   ├── loading.tsx  # Loading state
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Route detail page
│   │   │   │       ├── RouteDetailClient.tsx
│   │   │   │       └── not-found.tsx
│   │   │   ├── error.tsx        # Error boundary
│   │   │   ├── loading.tsx      # Global loading
│   │   │   └── not-found.tsx    # 404 page
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Navigation bar
│   │   │   └── RouteMap.tsx     # Leaflet map
│   │   ├── lib/
│   │   │   ├── auth.ts          # Client auth utilities
│   │   │   ├── db.ts            # MongoDB connection
│   │   │   ├── gemini.ts        # Gemini AI integration
│   │   │   ├── weather.ts       # Weather API
│   │   │   └── models/
│   │   │       └── Route.ts     # Route schema
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript types
│   │   └── proxy.ts             # JWT validation proxy
│   ├── .env.example             # Environment template
│   ├── .env.local               # Local environment (gitignored)
│   └── package.json
│
├── PROJECT_TASKS.md             # Detailed task tracking
├── TODO.md                      # Quick checklist
├── QUICK_START.md               # Setup guide
├── AUTH_FLOW_EXPLAINED.md       # Authentication flow documentation
├── README.md                    # This file
└── .gitignore
```

---

## API Documentation

### Auth Server Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/register` | Register new user | `{ username, email, password }` |
| POST | `/api/login` | Login user | `{ email, password }` |
| POST | `/api/refresh` | Refresh JWT token | Cookie-based |
| GET | `/api/verify` | Verify token validity | Header: `Authorization: Bearer <token>` |

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

---

## Defense Preparation

### Critical Concepts to Understand

#### 1. Authentication & Security
- **Salt in password hashing:** What it is, why bcrypt generates it automatically
- **JWT structure:** Header.Payload.Signature explained
- **Silent refresh:** How httpOnly cookies enable token refresh
- **CORS:** Why we need it for cross-origin requests
- **Why two servers?:** Separation of concerns (auth vs app logic)

#### 2. Next.js App Router
- **Server vs Client Components:**
  - Server: Default, reduce bundle, secure DB access
  - Client: `"use client"` for hooks, events, browser APIs
- **Server Actions:** Functions with `"use server"`, replace API routes
- **Proxy (Middleware):** Runs on Edge, soft auth validation
- **Dynamic Imports:** `{ ssr: false }` for Leaflet (requires window object)
- **revalidatePath():** Clears Next.js cache, shows fresh data

#### 3. Database (MongoDB + Mongoose)
- **Why Mongoose?:** ODM for MongoDB, schema validation
- **Connection caching:** Prevents "too many connections" in serverless
- **Lean queries:** Returns plain objects (faster, serializable)
- **Indexes:** Speed up userId queries

#### 4. APIs & Integration
- **Gemini AI:** Route generation with structured prompts
- **responseMimeType:** Forces JSON output from LLM
- **Weather API:** OpenWeatherMap 5-day forecast
- **Error handling:** Non-blocking (route works even if weather fails)

### Common Defense Questions & Answers

**Q: "What happens if you remove this line?"**
- Example: `revalidatePath('/history')` → Cache doesn't update, new routes don't show
- Example: `{ ssr: false }` on Leaflet → Build fails ("window is not defined")
- Example: CORS middleware → Browser blocks all auth requests

**Q: "Why Server Components?"**
- Zero JavaScript to client (faster load)
- Database access on server (more secure)
- SEO benefits (pre-rendered HTML)

**Q: "How does the auth flow work?"**
- See `AUTH_FLOW_EXPLAINED.md` for detailed diagram
- Proxy validates tokens WITHOUT calling auth server (JWT is self-contained)

**Q: "What technology does this belong to?"**
- `bcrypt` → Node.js library for password hashing
- `jsonwebtoken` → Node.js JWT implementation
- `mongoose` → MongoDB ODM
- `@google/generative-ai` → Gemini AI SDK
- `leaflet` → Open-source mapping library

### File Organization for Defense

| File | Key Concepts |
|------|--------------|
| `auth-server/src/models/User.ts` | bcrypt, salt, pre-save hooks |
| `auth-server/src/utils/tokenUtils.ts` | JWT generation, verification |
| `client/src/proxy.ts` | Middleware, soft validation, Edge runtime |
| `client/src/app/planning/actions.ts` | Server Actions, revalidatePath |
| `client/src/lib/gemini.ts` | LLM prompt engineering, JSON parsing |
| `client/src/components/RouteMap.tsx` | Leaflet, dynamic import, SSR issues |

---

## Cloud Deployment

| Service | URL |
|---------|-----|
| **Next.js App** | `https://afeka-hiking-trails.vercel.app` |
| **Auth Server** | `https://afeka-hiking-auth.railway.app` |

*URLs will be updated upon deployment*

---

## Known Issues

> **Important:** This section documents known bugs and limitations for transparency during defense.

| Issue | Description | Status |
|-------|-------------|--------|
| *To be documented* | *Issues will be added as discovered* | - |

---

## Contributors

| Name | GitHub | Role |
|------|--------|------|
| *Your Name* | [@username](https://github.com/username) | Full Stack Developer |

---

## License

This project is developed for educational purposes as part of Afeka College's Web Development course.

---

## Acknowledgments

- Afeka College of Engineering
- Course Instructors
- [Leaflet.js](https://leafletjs.com/) for map functionality
- [OpenWeatherMap](https://openweathermap.org/) for weather data
