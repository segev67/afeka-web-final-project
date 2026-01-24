# Technical Design Document: Afeka Hiking Trails 2026

Based on Syllabus [7-16] and Next.js Course Slides [17-33].

## 1. System Architecture: The Dual-Server Model
The project explicitly requires a separation of concerns between Identity (Auth) and Application Logic.

### Server A: Identity Provider (Node.js + Express)
*   **Role:** Handles user registration, login, and token issuance.
*   **Core Requirements:**
    *   **Encryption:** Passwords must be hashed using a "Salt" [1].
    *   **JWT (JSON Web Token):** Must issue a token containing user details [1].
    *   **Silent Refresh:** Implement a mechanism to refresh the token once a day without user intervention (likely via an `httpOnly` cookie or a refresh endpoint) [1].
*   **Database Connection:** This server connects to the `Users` collection in MongoDB/SQL [12].

### Server B: Application (Next.js App Router)
*   **Role:** The main UI, hiking logic, AI generation, and map rendering.
*   **Middleware:** Must use Next.js Middleware to verify the JWT from Server A before rendering protected pages [1].
*   **Database Connection:** This server connects to the `Routes` collection to save approved trips [3].

---

## 2. Technology Stack Recommendation

### Database
*   **Recommendation:** **MongoDB** with **Mongoose**.
*   **Reasoning:** The syllabus explicitly lists "MonogoDB, Mongoose" in Week 8 [12]. While the slides mention Prisma/Supabase for Server Actions [33], Mongoose is the primary DB technology listed in the course curriculum.
*   **Usage:**
    *   `UserSchema`: Username, Salted Password, Email.
    *   `RouteSchema`: JSON object of the map coordinates, city, distance, and image URL.

### Frontend Framework: Next.js (App Router)
You must use the **App Router** (`app` directory) to meet the "Optimal utilization of Next.js" requirement [4].

*   **Routing:** File-system based routing (e.g., `app/planning/page.tsx`, `app/history/page.tsx`) [17, 24].
*   **Layouts:** Use `layout.tsx` for the persistent navigation bar that links to "Planning" and "History" [17].
*   **Rendering Strategy:**
    *   **Server Components (Default):** Use for fetching history from the DB and initial page loads [31].
    *   **Client Components (`"use client"`):** Use strictly for the **Leaflet Map** (which needs the `window` object), the form inputs, and the "Approve Route" button [31].

### Data Fetching & State Management
*   **Fetching Data:** Use `async/await` directly in Server Components to fetch History [25, 32].
*   **Mutating Data (Saving Routes):** Do **NOT** use API Routes (`pages/api`). You must use **Server Actions** [33].
    *   Create a file `actions.ts` with `"use server"`.
    *   The "Approve" button on the client invokes this function to save the route to MongoDB directly from the server side.

### AI & Integration
*   **LLM Integration:** Connect to an LLM API (OpenAI/Gemini/Claude) via Node.js.
    *   *Prompt Engineering:* The prompt must request structured JSON data containing coordinates (lat/long) to be compatible with Leaflet [2].
*   **Maps:** Use **Leaflet.js** [2].
    *   *Implementation Note:* Leaflet does not work with Server Side Rendering (SSR). You must import it using `next/dynamic` with `{ ssr: false }`.
*   **Weather:** Connect to a real weather API (e.g., OpenWeatherMap) as per requirements [3].

---

## 3. Defense Preparation Checklist
*According to source [4]*

**1. "What happens if I remove this line?"**
*   **Scenario:** Removing `revalidatePath('/history')` in your Server Action.
*   **Answer:** The History page will not update with the new route until the cache clears or the server restarts [33].

**2. "Why Server Components?"**
*   **Theory:** Explain that they reduce the bundle size sent to the client (Zero KB JS) and keep API keys/Database logic secure on the server [31].

**3. "Where is the bug?"**
*   **Mandatory Slide:** You must have a slide listing **Known Bugs** [5].
*   *Strategy:* If the "Silent Refresh" is flaky, or the LLM sometimes gives straight lines instead of paths, document it here.

## 4. Required File Structure
*Based on Source [23]*

```text
/my-project
├── /app
│   ├── layout.tsx       # Main Navbar & Auth Check
│   ├── page.tsx         # Homepage (index.html equivalent)
│   ├── /planning
│   │   ├── page.tsx     # Form & Map (Client Component for map)
│   │   └── actions.ts   # Server Action to call LLM & Save
│   └── /history
│       ├── page.tsx     # Async Server Component (fetches DB)
│       └── loading.tsx  # Streaming UI [32]
├── /middleware.ts       # JWT Validation Logic [1]
└── /lib
    └── db.ts            # Mongoose Connection