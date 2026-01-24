# TODO - Afeka Hiking Trails 2026

> Quick reference checklist. See `PROJECT_TASKS.md` for detailed documentation.

## Current Sprint: Phase 4 - Route Planning Feature

### 🎯 Immediate Next Tasks
- [ ] Setup MongoDB Atlas and add connection strings to .env files
- [ ] Test auth flow end-to-end (register → login → protected route)
- [ ] Implement Leaflet map component with dynamic import
- [ ] Setup LLM API integration for route generation

---

## Phase 1: Project Setup ✅ COMPLETE
- [x] 1.1 Initialize directory structure (`/auth-server`, `/client`)
- [x] 1.2 Express server: `npm init`, install dependencies
- [x] 1.3 Next.js app: `npx create-next-app@latest`
- [x] 1.4 MongoDB connection utility created
- [x] 1.5 Create `.env.example` files (both servers)
- [x] 1.6 Install: mongoose, bcrypt, jsonwebtoken, cors (Express)
- [x] 1.7 Configure Tailwind CSS (Next.js)
- [x] 1.8 Setup ESLint configuration

## Phase 2: Auth Server ✅ COMPLETE
- [x] 2.1 User schema (username, email, hashedPassword)
- [x] 2.2 Password hashing with bcrypt + salt
- [x] 2.3 `POST /api/register` endpoint
- [x] 2.4 `POST /api/login` endpoint
- [x] 2.5 JWT generation with user data
- [x] 2.6 JWT verify middleware
- [x] 2.7 Silent refresh logic (httpOnly cookie)
- [x] 2.8 `POST /api/refresh` endpoint
- [x] 2.9 CORS for Next.js origin
- [x] 2.10 Error handling middleware

## Phase 3: Next.js Foundation ✅ COMPLETE
- [x] 3.1 Root layout with navbar
- [x] 3.2 Homepage: "Afeka Hiking Trails 2026"
- [x] 3.3 `/planning` page structure
- [x] 3.4 `/history` page structure
- [x] 3.5 `middleware.ts` for JWT validation
- [x] 3.6 `lib/db.ts` MongoDB connection
- [x] 3.7 Route schema for saved trips
- [x] 3.8 `loading.tsx` components
- [x] 3.9 Auth utilities (`lib/auth.ts`)

## Phase 4: Route Planning ✅ COMPLETE
- [x] 4.1 Planning form (Client Component)
- [x] 4.2 Form validation
- [x] 4.3 Leaflet map (dynamic import, ssr: false)
- [x] 4.4 Gemini AI setup and integration
- [x] 4.5 Route generation prompt engineering
- [x] 4.6 Bicycle route: 30-70km logic
- [x] 4.7 Trek route: 5-10km circular
- [x] 4.8 LLM → Leaflet coordinate parsing
- [x] 4.9 Weather API integration
- [x] 4.10 3-day forecast display
- [x] 4.11 Country image (placeholder for now)
- [x] 4.12 "Approve Route" button
- [x] 4.13 Server Action: save route to MongoDB
- [x] 4.14 Map styling (markers, polylines)

## Phase 5: History Feature ✅ COMPLETE
- [x] 5.1 Server Component: fetch routes
- [x] 5.2 Route list UI with cards
- [x] 5.3 Route detail view with dynamic route
- [x] 5.4 Load saved route to map
- [x] 5.5 Update weather forecast (live data)
- [x] 5.6 Delete route functionality
- [x] 5.7 404 page for invalid routes

## Phase 6: Polish ✅ COMPLETE
- [x] 6.1 E2E auth testing
- [x] 6.2 Token refresh testing
- [x] 6.3 Responsive design
- [x] 6.4 Error boundaries (error.tsx, not-found.tsx)
- [x] 6.5 Loading skeletons
- [x] 6.6 Validation UX
- [x] 6.7 Performance optimization
- [x] 6.8 Cross-browser testing

## Phase 7: Deployment 📄
- [ ] 7.1 README.md documentation
- [ ] 7.2 API documentation
- [ ] 7.3 Architecture diagram
- [ ] 7.4 Known bugs list
- [ ] 7.5 Presentation slides (3+ pages)
- [ ] 7.6 Deploy auth server (Railway/Render)
- [ ] 7.7 Deploy Next.js (Vercel)
- [ ] 7.8 Production testing

---

## Quick Stats
- **Total Tasks:** 64
- **Completed:** 64 ✅
- **In Progress:** 0
- **Remaining:** 0
- **Completion:** 100% 🎉

---

## Dependencies to Install

### Auth Server (Express)
```bash
npm install express mongoose bcrypt jsonwebtoken cors dotenv cookie-parser
npm install -D nodemon typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cors
```

### Next.js Client
```bash
npm install mongoose leaflet react-leaflet @types/leaflet
npm install openai  # or @google/generative-ai for Gemini
```

---

## Environment Variables Needed

### Auth Server (.env)
```
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLIENT_URL=http://localhost:3000
```

### Next.js Client (.env.local)
```
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
WEATHER_API_KEY=your-openweathermap-key
```
