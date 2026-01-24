# 🚀 Deployment Guide - Afeka Hiking Trails 2026

This guide covers deploying the application to cloud services.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USERS                            │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            Vercel Edge Network                      │
│         (Next.js Application)                       │
│         https://afeka-hiking.vercel.app             │
└─────────────────────────────────────────────────────┘
                       │
                       ├──► MongoDB Atlas (Routes)
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            Railway / Render                         │
│         (Express Auth Server)                       │
│         https://afeka-auth.railway.app              │
└─────────────────────────────────────────────────────┘
                       │
                       └──► MongoDB Atlas (Users)
```

---

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] Railway/Render account (free)
- [ ] MongoDB Atlas account (free)
- [ ] Gemini API key
- [ ] (Optional) OpenWeatherMap API key

---

## Step 1: Setup MongoDB Atlas

### Create Cluster

1. Go to https://cloud.mongodb.com/
2. Sign up / Log in
3. Click "Build a Database"
4. Choose **FREE** tier (M0 Sandbox)
5. Select region closest to you
6. Click "Create Cluster"

### Create Databases

1. Click "Browse Collections"
2. Create database: `hiking-auth`
3. Create collection: `users`
4. Create database: `hiking-routes`
5. Create collection: `routes`

### Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string
4. Replace `<password>` with your database password
5. Add database name at the end

**Result:**
```
mongodb+srv://username:password@cluster.mongodb.net/hiking-auth
mongodb+srv://username:password@cluster.mongodb.net/hiking-routes
```

### Setup IP Whitelist

1. Go to "Network Access"
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
4. Confirm

---

## Step 2: Deploy Auth Server to Railway

### Setup Railway

1. Go to https://railway.app/
2. Sign up with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your repository
6. Choose root directory: `auth-server`

### Configure Environment Variables

In Railway dashboard:
```
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hiking-auth
JWT_SECRET=generate-random-secret-key
JWT_REFRESH_SECRET=generate-different-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-nextjs-app.vercel.app
NODE_ENV=production
```

**Generate secrets:**
```bash
# Run locally to generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Update Build Settings

1. Build Command: `npm run build`
2. Start Command: `npm start`
3. Root Directory: `/auth-server`

### Deploy

1. Click "Deploy"
2. Wait for deployment
3. Copy your Railway URL (e.g., `afeka-auth.railway.app`)

---

## Step 3: Deploy Next.js to Vercel

### Setup Vercel

1. Go to https://vercel.com/
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Select root directory: `client`

### Configure Environment Variables

In Vercel dashboard:
```
NEXT_PUBLIC_AUTH_URL=https://your-auth-server.railway.app
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hiking-routes
GEMINI_API_KEY=your-gemini-api-key
WEATHER_API_KEY=your-weather-api-key
JWT_SECRET=same-as-auth-server
```

### Update Build Settings

- Framework Preset: **Next.js**
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `.next`

### Deploy

1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Copy your Vercel URL

---

## Step 4: Update CORS Configuration

After deployment, update auth server's `CLIENT_URL`:

### Railway Dashboard

1. Go to your auth server project
2. Variables tab
3. Update `CLIENT_URL` to your Vercel URL:
   ```
   CLIENT_URL=https://your-app.vercel.app
   ```
4. Redeploy (automatic)

---

## Step 5: Verify Deployment

### Check Auth Server

```bash
curl https://your-auth-server.railway.app/health
# Should return: {"status":"ok","server":"auth-server"}
```

### Check Next.js App

1. Visit your Vercel URL
2. Register a new user
3. Login
4. Generate a route
5. Check history

---

## Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Connection strings updated
- [ ] Auth server deployed to Railway/Render
- [ ] Environment variables configured (auth server)
- [ ] Next.js app deployed to Vercel
- [ ] Environment variables configured (Vercel)
- [ ] CORS updated with production URL
- [ ] Full flow tested on production
- [ ] URLs added to README.md
- [ ] URLs added to presentation slides

---

## Troubleshooting Deployment

### "Cannot connect to MongoDB"
- Check IP whitelist allows 0.0.0.0/0
- Verify connection string format
- Ensure password doesn't contain special characters that need encoding

### "CORS Error"
- Verify `CLIENT_URL` matches your Vercel domain exactly
- Include https:// in the URL
- No trailing slash

### "JWT verification failed"
- Ensure `JWT_SECRET` is identical in both .env files
- Case-sensitive, must match exactly

### "Gemini API not working"
- Verify API key is correct
- Check if you've hit rate limits (15 req/min free tier)
- Try refreshing after a minute

---

## Alternative Deployment Options

### Auth Server Alternatives
- **Render:** Similar to Railway, free tier available
- **Fly.io:** Good for Node.js apps
- **Digital Ocean App Platform:** Simple deployment

### Next.js Alternatives
- **Netlify:** Alternative to Vercel
- **Cloudflare Pages:** Edge deployment
- **Self-hosted:** VPS with PM2

### MongoDB Alternatives
- **Local MongoDB:** For development only
- **MongoDB Cloud Manager:** Enterprise option

---

## Post-Deployment

### Update Documentation

1. **README.md:** Add live URLs
2. **Presentation Slides:** Update Slide 1 with URLs
3. **Test all features:** On production environment
4. **Take screenshots:** For presentation

### Monitor Application

- Check Vercel Analytics for usage
- Monitor Railway logs for errors
- Set up MongoDB Atlas alerts
- Test token refresh after 15 minutes

---

## Security Checklist for Production

- [x] All API keys in environment variables
- [x] .env files in .gitignore
- [x] CORS properly configured
- [x] JWT secrets are strong and random
- [x] Passwords hashed with salt
- [x] httpOnly cookies for refresh tokens
- [x] HTTPS enforced (automatic with Vercel/Railway)
- [x] MongoDB IP whitelist configured
- [x] No sensitive data in logs
- [x] Error messages don't expose internals
