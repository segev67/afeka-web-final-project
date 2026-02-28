# Silent Token Refresh Implementation

## Project Requirement

From `final_project_requirements.md` line 12:

> **B.** It issues a **JWT** authorization token (containing the names of the submitter or submitters); the token will be valid for the second server and will also **refresh silently** (unnoticed by the user) once a day. [1]

## Implementation Overview

The system now implements **automatic silent token refresh** to ensure users stay logged in without interruption.

## How It Works

### Token Lifecycle

1. **Access Token**: Lasts 24 hours
   - Used for authenticating API requests
   - Stored in httpOnly cookie
   - Checked on every protected route access
   - **Expires after 24 hours** (matches "once a day" requirement)

2. **Refresh Token**: Lasts 7 days
   - Used to obtain new access tokens
   - Stored in httpOnly cookie
   - Only used when access token expires (after 24 hours)

### Silent Refresh Flow

```
User visits protected page
         ↓
Proxy checks access token
         ↓
   Is token valid?
    ↙          ↘
  YES          NO (expired)
   ↓            ↓
Allow      Check refresh token
access          ↓
           Is refresh token valid?
            ↙          ↘
          YES          NO
           ↓            ↓
    Call auth server  Redirect
    /auth/refresh     to login
           ↓
    Get new access token
           ↓
    Set new cookie
           ↓
    Continue to page
    (User never noticed!)
```

## Key Features

### 1. Transparent to User
- Happens automatically in the background
- No page reload required
- No visible interruption
- User stays logged in seamlessly

### 2. Security
- Tokens still expire regularly (access: 15min, refresh: 7 days)
- httpOnly cookies prevent XSS attacks
- Refresh token rotation (server can issue new refresh token)
- Failed refresh redirects to login

### 3. Performance
- Minimal overhead (only when token expires)
- Efficient cookie-based authentication
- No database calls in proxy (only on auth server)

## Implementation Details

### File: `client/src/proxy.ts`

#### Key Functions

1. **`refreshAccessToken(refreshToken: string)`**
   - Calls auth server's `/auth/refresh` endpoint
   - Sends refresh token as cookie
   - Returns new access token (and optionally new refresh token)
   - Logs all refresh attempts for debugging

2. **`proxy(request: NextRequest)`** (updated)
   - Checks if access token exists and is valid
   - If expired, attempts silent refresh
   - Sets new tokens in cookies
   - Only redirects to login if refresh fails

### File: `auth-server/src/controllers/authController.ts`

#### Endpoint: `POST /auth/refresh`

- Expects refresh token in cookie
- Verifies token signature and expiration
- Checks user still exists in database
- Generates new access token
- Optionally rotates refresh token (more secure)
- Returns new tokens

## Console Logging

For debugging and monitoring, the proxy logs all token operations:

```
[Proxy] Token valid, allowing access to /planning
[Proxy] Access token expired or invalid
[Proxy] 🔄 Access token expired, attempting silent refresh...
[Proxy] ✅ Token refreshed successfully (silent)
[Proxy] 🔄 Refresh token rotated
[Proxy] ✅ Token refreshed silently, allowing access to /planning
```

Auth server also logs:

```
🔄 [REFRESH] Token refresh requested...
🔍 [REFRESH] Verifying refresh token...
✅ [REFRESH] Token valid for user: username
🔍 [REFRESH] Checking if user still exists...
✅ [REFRESH] User verified: username
🎫 [REFRESH] Generating new tokens...
✅ [REFRESH] New tokens generated
```

## Testing Silent Refresh

### Manual Test
1. Log in to the application
2. Wait 15 minutes (or modify `JWT_EXPIRES_IN` to 1 minute for faster testing)
3. Navigate to any protected route
4. Observe console logs showing silent refresh
5. Page loads normally without redirect to login

### Expected Behavior
- User remains logged in for 7 days
- Access token refreshes automatically every 24 hours of activity
- No login prompt unless:
  - Both tokens expired (7 days of inactivity)
  - Tokens manually cleared
  - User explicitly logs out

## Environment Variables

### Auth Server (`.env`)

```env
# Access token expires after 24 hours (matches "once a day" requirement)
JWT_EXPIRES_IN=24h

# Refresh token expires after 7 days
JWT_REFRESH_EXPIRES_IN=7d

# Secret keys (use strong random strings)
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
```

### Client (`.env.local`)

```env
# Auth server URL for token refresh
NEXT_PUBLIC_AUTH_SERVER_URL=http://localhost:5001
```

## Security Considerations

### Why Two Tokens?

1. **Access Token (Short-lived)**
   - Used frequently
   - Sent with every request
   - Short expiration limits damage if stolen
   - Can be invalidated quickly

2. **Refresh Token (Long-lived)**
   - Used rarely (only when access token expires)
   - Rarely sent over network
   - Can be rotated for extra security
   - Stored securely in httpOnly cookie

### Token Rotation

The auth server rotates refresh tokens on each refresh request:
```typescript
const newRefreshToken = generateRefreshToken(tokenPayload);
res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());
```

This means:
- Old refresh token becomes invalid after use
- Prevents token replay attacks
- Each successful refresh invalidates previous token

## Troubleshooting

### User Still Gets Logged Out

**Check:**
1. Refresh token expiration time (should be 7 days)
2. Cookie settings (httpOnly, sameSite, secure)
3. Console logs for refresh failures
4. Auth server logs for token verification errors

### Infinite Redirect Loop

**Possible causes:**
1. Auth server not setting cookies correctly
2. Cookie domain mismatch
3. CORS issues preventing cookie storage

**Solution:**
- Check `Set-Cookie` headers in network tab
- Verify cookie domain matches application domain
- Ensure auth server CORS config allows credentials

### Token Refresh Fails

**Check auth server logs:**
```
❌ [REFRESH] Token refresh failed: 401
❌ [REFRESH] User not found: userId
❌ [REFRESH] No refresh token found in cookies
```

**Solutions:**
- Verify refresh token exists in cookies
- Check token expiration
- Ensure user still exists in database
- Verify JWT secrets match

## Defense Points for Presentation

### "Why did you implement it this way?"

1. **Meets project requirement**: "refresh silently (unnoticed by the user)"
2. **Best practice**: Industry standard (OAuth 2.0 pattern)
3. **Security**: Short-lived access tokens + long-lived refresh tokens
4. **UX**: User never sees authentication interruption

### "What happens if you remove the refresh logic?"

Without silent refresh:
- User logs out after 15 minutes
- Must manually log in again
- Poor user experience
- Does not meet project requirements

### "Why not just make access tokens long-lived?"

- **Security risk**: Stolen token valid for days
- **Can't revoke**: No way to invalidate compromised tokens
- **Harder to rotate**: Can't update token claims without re-login

### "How does this work with Edge runtime limitations?"

- Edge runtime can't use `jsonwebtoken` library
- We decode JWT manually for basic validation
- Full signature verification happens on auth server
- This provides "soft" validation as required by project

## Future Improvements

1. **Sliding Sessions**: Reset refresh token expiration on each use
2. **Device Tracking**: Link tokens to specific devices
3. **Token Blacklisting**: Revoke tokens server-side
4. **Activity Monitoring**: Track suspicious refresh patterns
5. **Push Notifications**: Notify user of new login from different device

## Conclusion

The silent token refresh implementation ensures:
✅ Users stay logged in seamlessly
✅ Tokens refresh automatically in background
✅ Security maintained with short-lived access tokens
✅ Project requirement fully satisfied
✅ Industry best practices followed
