# 🔐 Authentication Flow Explained

## Your Question: Should I see something in auth-server when accessing /planning?

**Short Answer:** NO, and here's why! 👇

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      1. USER LOGS IN                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  NEXT.JS CLIENT                     AUTH SERVER                     │
│  (http://localhost:3000)           (http://localhost:4000)          │
├────────────────────────────────────────────────────────────────────┤
│  POST /api/login                                                    │
│  { email, password }  ──────────►  Verify credentials               │
│                                    Hash password & compare           │
│                                    Generate JWT tokens               │
│  ◄────────────────────────────    Return: accessToken + cookie     │
│  Store accessToken in cookie                                        │
│  (httpOnly refreshToken cookie)                                     │
└────────────────────────────────────────────────────────────────────┘

           ▼ User navigates to /planning ▼

┌─────────────────────────────────────────────────────────────────────┐
│                2. ACCESSING PROTECTED ROUTE (/planning)             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  NEXT.JS PROXY (src/proxy.ts)                                       │
│  - Runs on Edge (Next.js server)                                    │
│  - Does NOT call auth-server                                        │
├────────────────────────────────────────────────────────────────────┤
│  1. Get accessToken from cookie                                     │
│  2. Decode JWT (base64 decode, NO signature verification)           │
│  3. Check expiration timestamp                                      │
│  4. If valid → Allow access to /planning                            │
│  5. If invalid → Redirect to /login                                 │
└────────────────────────────────────────────────────────────────────┘

           ▼ Token is valid, continue ▼

┌─────────────────────────────────────────────────────────────────────┐
│                3. PAGE LOADS & RENDERS                               │
│  - No auth-server involved                                           │
│  - Page served from Next.js                                          │
└─────────────────────────────────────────────────────────────────────┘

           ▼ User generates route ▼

┌─────────────────────────────────────────────────────────────────────┐
│                4. SERVER ACTION CALLED                               │
│  (generateRoutePlan in actions.ts)                                   │
├─────────────────────────────────────────────────────────────────────┤
│  - Runs on Next.js server (not auth server)                          │
│  - Calls Gemini API                                                  │
│  - Calls Weather API                                                 │
│  - Saves to MongoDB                                                  │
│  - Auth-server NOT involved                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## When IS the Auth Server Called?

The auth-server is ONLY called for these operations:

| Action | Endpoint | When |
|--------|----------|------|
| **Register** | `POST /api/register` | User creates account |
| **Login** | `POST /api/login` | User signs in |
| **Token Refresh** | `POST /api/refresh` | Access token expires (every 15 min) |
| **Verify** | `GET /api/verify` | Optional: explicit verification |
| **Logout** | `POST /api/logout` | User logs out |

---

## Why Doesn't Proxy Call Auth Server?

**Performance & Design:**

1. **JWT is Self-Contained**
   - Contains all user info (userId, username, email)
   - Can be decoded without contacting auth server
   - Signature ensures it hasn't been tampered with

2. **Edge Runtime Limitation**
   - Next.js proxy runs on Edge (fast, global)
   - Cannot use Node.js libraries like `jsonwebtoken`
   - We do "soft" validation: decode + check expiration

3. **Scalability**
   - Every page load would hit auth server = bottleneck
   - JWT allows stateless authentication
   - Auth server only needed for token generation/refresh

---

## What You'll See in Logs

### ✅ Auth Server (When Used)
```bash
# Only when logging in, registering, or refreshing
POST /api/login 200
POST /api/register 201
POST /api/refresh 200
```

### ✅ Next.js Client (All Page Loads)
```bash
[Proxy] Token valid, allowing access to /planning
🚀 Generating route for Liran...
✅ Route generated successfully
```

---

## Full Authentication Lifecycle

```
Day 1: 9:00 AM
├─ User logs in → Auth server generates JWT (expires in 15 min)
├─ User accesses /planning → Proxy checks token ✓
├─ User generates routes → No auth server needed
│
Day 1: 9:15 AM (Token Expires)
├─ User tries /planning → Proxy sees token expired
├─ Client auto-calls /api/refresh → Auth server issues new token
├─ User continues → Proxy checks new token ✓
│
Day 1: 11:00 PM (Refresh Token Expires - 7 days default)
├─ User tries /planning → Proxy sees token expired
├─ Client tries /api/refresh → Refresh token also expired
└─ User redirected to /login → Must log in again
```

---

## Summary

✅ **Proxy validates tokens WITHOUT calling auth server**  
✅ **Auth server ONLY involved in login/register/refresh**  
✅ **This is the correct design pattern for JWT**

The `[Proxy] Token valid` message means:
- Token was decoded successfully
- Expiration checked (still valid)
- User allowed to access page
- **NO network call to auth server**

---

## Testing the Full Flow

Want to see the auth server in action? Try this:

```bash
# Terminal with auth server running
cd auth-server && npm run test:auth
```

This will show you all the auth server endpoints being called!
