# 📊 Afeka Hiking Trails 2026 - Presentation Slides

> **For Defense Presentation**

---

## Slide 1: Project Information

### 🏔️ Afeka Hiking Trails 2026

**Students:**
- Name: [Your Name]
- Name: [Partner Name] (if applicable)

**GitHub Repository:**
- Primary: `https://github.com/[username]/afeka-hiking-trails-2026`
- Partner: `https://github.com/[partner]/afeka-hiking-trails-2026` (if applicable)

**Cloud Deployment:**
- Application: `https://afeka-hiking-trails.vercel.app` (to be deployed)
- Auth Server: `https://afeka-hiking-auth.railway.app` (to be deployed)

**Course:** Web Development - Semester A 2026  
**Institution:** Afeka College of Engineering

---

## Slide 2: Known Bugs & Issues

> **CRITICAL:** Undisclosed bugs found during defense will significantly lower the grade.

### Known Limitations

| # | Issue | Severity | Workaround |
|---|-------|----------|------------|
| 1 | Weather API optional | Low | App works without weather key, just no forecast displayed |
| 2 | Gemini rate limits | Low | Free tier: 15 requests/min, sufficient for testing |
| 3 | Image generation not implemented | Medium | Future enhancement, not blocking core features |
| 4 | Map requires modern browser | Low | Works on Chrome, Firefox, Safari (Edge runtime) |

### Edge Cases Handled

✅ **Token expiration:** Automatic silent refresh  
✅ **Invalid routes:** 404 pages with helpful navigation  
✅ **DB connection:** Cached connections prevent overload  
✅ **LLM errors:** Graceful error messages, retry option  
✅ **Malformed JSON:** Multiple parsing strategies with fallbacks

### Testing Notes

- Tested on: macOS, Chrome/Safari
- MongoDB: Local Docker container
- All core features verified working
- Authentication flow tested end-to-end

---

## Slide 3: System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│                                                             │
│  • React Components (Next.js 16)                           │
│  • Tailwind CSS Styling                                    │
│  • Leaflet Maps (Client-Side Rendering)                   │
└─────────────────────────────────────────────────────────────┘
           │                                │
    Login/Register                   Protected Requests
           │                          (JWT Bearer Token)
           ▼                                ▼
┌──────────────────────┐        ┌──────────────────────────┐
│  EXPRESS AUTH SERVER │        │   NEXT.JS APP SERVER     │
│  (Port: 4000)        │        │   (Port: 3000)           │
├──────────────────────┤        ├──────────────────────────┤
│ • User Registration  │        │ • JWT Proxy Validation   │
│ • User Login         │        │ • Homepage               │
│ • bcrypt + Salt      │        │ • Route Planning Page    │
│ • JWT Generation     │        │ • Routes History Page    │
│ • httpOnly Cookies   │        │ • Server Actions         │
│ • Silent Refresh     │        │                          │
└──────────┬───────────┘        │ Integrations:            │
           │                    │ • Gemini AI (Routes)     │
           │                    │ • OpenWeatherMap         │
           │                    │ • Leaflet.js Maps        │
           ▼                    └───────────┬──────────────┘
┌──────────────────────┐                   │
│   MongoDB Atlas      │◄──────────────────┘
│                      │
│ • Users Collection   │  (hiking-auth database)
│ • Routes Collection  │  (hiking-routes database)
└──────────────────────┘
```

### Technology Breakdown

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, Next.js 16 | UI rendering, routing |
| **Styling** | Tailwind CSS | Responsive design |
| **Maps** | Leaflet.js | Route visualization |
| **Auth Server** | Express.js, Node.js | User authentication |
| **App Server** | Next.js Server Components | Application logic |
| **Database** | MongoDB + Mongoose | Data persistence |
| **Security** | bcrypt (salt), JWT | Password hashing, auth |
| **AI** | Google Gemini 2.5 Flash | Route generation |
| **Weather** | OpenWeatherMap API | Forecast data |

---

## Slide 4: Key Code Segments - Authentication

### Password Hashing with bcrypt + Salt

**File:** `auth-server/src/models/User.ts`

```typescript
// Pre-save hook - automatically hashes password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const SALT_ROUNDS = 10; // 2^10 = 1024 iterations
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});
```

**Defense Points:**
- **Salt:** Random data added before hashing
- **Why?** Prevents rainbow table attacks
- **bcrypt:** One-way hashing function
- **10 rounds:** Balance between security and performance

### JWT Token Generation

**File:** `auth-server/src/utils/tokenUtils.ts`

```typescript
export const generateAccessToken = (payload: TokenPayload): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') 
    as SignOptions['expiresIn'];
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
};
```

**Defense Points:**
- **JWT Structure:** Header.Payload.Signature
- **Payload:** Contains userId, username, email
- **Expiration:** 15 minutes for access, 7 days for refresh
- **Signature:** Prevents tampering

---

## Slide 5: Key Code Segments - Next.js

### Server vs Client Components

**Server Component** (`app/history/page.tsx`):
```typescript
// No "use client" = Server Component
export default async function HistoryPage() {
  await dbConnect();
  const routes = await Route.find({ userId }).lean();
  return <div>{/* Render routes */}</div>;
}
```

**Client Component** (`components/RouteMap.tsx`):
```typescript
'use client'; // Required for Leaflet

export default function RouteMap({ routes }: Props) {
  // Uses window object, needs browser
}
```

**Defense Points:**
- Server: Direct DB access, no client JS
- Client: Browser APIs, interactive features
- Map requires window object → must be client

### Server Actions

**File:** `app/planning/actions.ts`

```typescript
'use server'; // Marks functions as Server Actions

export async function saveRoute(routePlan: RoutePlan) {
  await dbConnect();
  const route = await Route.create(routePlan);
  revalidatePath('/history'); // Clear cache
  return { success: true, data: route };
}
```

**Defense Points:**
- **"use server":** Runs on server, not client
- **revalidatePath:** Updates cached data
- **Security:** API keys never exposed to browser

---

## Slide 6: Key Code Segments - Proxy & APIs

### JWT Validation Proxy

**File:** `src/proxy.ts`

```typescript
export function proxy(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return NextResponse.redirect('/login');
  
  const decoded = decodeToken(token);
  if (isTokenExpired(decoded.exp)) {
    return NextResponse.redirect('/login');
  }
  
  return NextResponse.next(); // Allow access
}
```

**Defense Points:**
- Runs on Edge (before page loads)
- "Soft" validation (no signature check)
- No auth server call (JWT is self-contained)

### Gemini AI Integration

**File:** `lib/gemini.ts`

```typescript
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: 'application/json', // Force JSON
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
});
```

**Defense Points:**
- **responseMimeType:** Ensures valid JSON output
- **Prompt engineering:** Detailed instructions for realistic routes
- **Error handling:** Fallbacks for malformed responses

---

## Slide 7: Project Highlights

### ✨ Features Implemented

#### Core Requirements (100% Complete)
- ✅ Dual-server architecture (Express + Next.js)
- ✅ Password encryption with bcrypt + salt
- ✅ JWT authentication with silent refresh
- ✅ Proxy-based route protection
- ✅ Homepage "Afeka Hiking Trails 2026"
- ✅ Route planning with AI (Gemini)
- ✅ Interactive Leaflet maps
- ✅ 3-day weather forecasts
- ✅ Route approval and database storage
- ✅ History page with route retrieval

#### Technical Excellence
- ✅ TypeScript throughout (type safety)
- ✅ Comprehensive code comments (defense-ready)
- ✅ Error boundaries and loading states
- ✅ Responsive design (mobile-friendly)
- ✅ Server Components for performance
- ✅ Server Actions (modern Next.js pattern)
- ✅ Connection caching (serverless optimization)
- ✅ Proper gitignore (secrets protected)

#### Code Quality
- ✅ 64 tasks completed across 7 phases
- ✅ Every file has defense-ready comments
- ✅ Separation of concerns (MVC pattern)
- ✅ DRY principle (reusable components)
- ✅ Defensive programming (error handling)

---

## Slide 8: Demo Screenshots

### Homepage
![Homepage](screenshots/homepage.png)

### Route Planning
![Route Planning](screenshots/planning.png)

### Generated Route with Map
![Route Map](screenshots/route-map.png)

### Route History
![History](screenshots/history.png)

### Route Detail with Weather
![Route Detail](screenshots/route-detail.png)

---

## Slide 9: Lessons Learned

### Technical Insights

1. **Authentication Architecture**
   - Learned JWT-based stateless authentication
   - Understood salt + hashing for password security
   - Implemented silent token refresh mechanism

2. **Next.js App Router**
   - Server vs Client Components trade-offs
   - Server Actions eliminate need for API routes
   - Edge runtime limitations (no Node.js modules)

3. **AI Integration**
   - Prompt engineering for structured outputs
   - Handling LLM inconsistencies
   - JSON parsing strategies

4. **Performance Optimization**
   - MongoDB connection caching
   - Lean queries for faster responses
   - Dynamic imports for heavy libraries

### Challenges Overcome

- ✅ Mongoose 9.x async hook syntax changes
- ✅ Leaflet SSR compatibility issues
- ✅ JWT serialization between client/server
- ✅ LLM JSON output validation

---

## Slide 10: Future Enhancements

### Potential Improvements

1. **Image Generation**
   - Add DALL-E or Stable Diffusion integration
   - Generate country-specific landscape images

2. **Advanced Features**
   - Route sharing between users
   - Route ratings and reviews
   - Offline map caching
   - GPX file export for GPS devices
   - Elevation profiles

3. **Performance**
   - Redis caching for frequent queries
   - CDN for static assets
   - Image optimization

4. **Social Features**
   - User profiles
   - Follow other hikers
   - Route recommendations based on history

5. **Mobile App**
   - React Native version
   - Offline-first architecture
   - GPS tracking during hike

---

## Notes for Presentation

### Demonstration Flow

1. **Introduction (1 min)**
   - Show architecture diagram
   - Explain dual-server requirement

2. **Authentication Demo (2 min)**
   - Register new user
   - Show JWT in browser DevTools
   - Explain bcrypt + salt

3. **Route Planning Demo (3 min)**
   - Enter location (Swiss Alps)
   - Generate route with Gemini AI
   - Show map with realistic paths
   - Explain waypoints (not straight lines)
   - Show weather forecast
   - Approve and save to MongoDB

4. **History Demo (2 min)**
   - View saved routes
   - Open route detail
   - Show updated weather forecast
   - Delete functionality

5. **Code Walkthrough (5 min)**
   - Show bcrypt pre-save hook
   - Explain Server Actions
   - Demonstrate proxy validation
   - Show Leaflet dynamic import

6. **Defense Questions (Remaining time)**
   - Be ready to explain ANY line of code
   - Know what happens if lines are removed
   - Understand technology choices

### Key Points to Emphasize

✅ **Separation of Concerns:** Auth server vs App server  
✅ **Security:** Salt + bcrypt, JWT, httpOnly cookies  
✅ **Modern Patterns:** Server Components, Server Actions  
✅ **Performance:** Connection caching, lean queries  
✅ **Error Handling:** Boundaries, validation, user feedback  
✅ **AI Integration:** Prompt engineering for realistic routes
