# Complete Deployment Guide: Vercel + MongoDB Atlas

Deploy your entire Afeka Hiking Trails application to the cloud using only **Vercel** and **MongoDB Atlas**.

**Total Cost**: $0 (All free tiers)  
**Time Required**: ~30-40 minutes  
**Components**: 2 Vercel Projects + 1 MongoDB Cluster

---

## 🎯 Deployment Overview

We'll deploy three components:
1. **MongoDB Atlas** - Cloud database (shared by both servers)
2. **Auth Server** - Express.js on Vercel (Project 1)
3. **Client** - Next.js on Vercel (Project 2)

**Architecture**:
```
┌─────────────────────┐
│  MongoDB Atlas      │ ← Database (shared)
└─────────────────────┘
         ↑      ↑
         │      │
    ┌────┘      └────┐
    │                │
┌───────┐      ┌──────────┐
│ Auth  │ ←────│  Client  │
│Server │      │  (Next)  │
│Vercel │      │  Vercel  │
└───────┘      └──────────┘
  Project 1      Project 2
```

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] GitHub account
- [ ] Git installed locally
- [ ] Your code pushed to GitHub repository
- [ ] Gmail/Google account (for MongoDB Atlas)
- [ ] Google Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))
- [ ] OpenWeatherMap API key ([Get it here](https://openweathermap.org/api))

---

## 🗄️ Part 1: MongoDB Atlas Setup (15 minutes)

### Step 1.1: Create Account

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google (recommended) or email
3. Choose **"I'm learning MongoDB"** when asked

### Step 1.2: Create Free Cluster

1. Click **"Create"** or **"Build a Database"**
2. Choose **"M0 FREE"** tier
   - Storage: 512 MB
   - Shared RAM
   - Perfect for development

3. **Cloud Provider & Region**:
   - Provider: **AWS** (recommended)
   - Region: Choose closest to your location
     - US: `us-east-1` (Virginia)
     - Europe: `eu-west-1` (Ireland)
     - Asia: `ap-southeast-1` (Singapore)

4. **Cluster Name**: `afeka-hiking-cluster` (or your choice)

5. Click **"Create"** (takes 3-5 minutes to provision)

### Step 1.3: Create Database User

1. While cluster is creating, go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `afeka-admin`
5. **Password**: Click **"Autogenerate Secure Password"**
   - ⚠️ **SAVE THIS PASSWORD** - you'll need it!
   - Example: `K7mP9xQ2nR5tL8w`
6. **Database User Privileges**: `Atlas admin` or `Read and write to any database`
7. Click **"Add User"**

### Step 1.4: Configure Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"**
   - IP: `0.0.0.0/0`
   - ⚠️ For production, you'd restrict this, but for learning this is fine
4. Click **"Confirm"**

### Step 1.5: Get Connection String

1. Go back to **"Database"** (left sidebar)
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 5.5 or later
6. Copy the connection string:

```
mongodb+srv://afeka-admin:<password>@afeka-hiking-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

7. **Replace `<password>`** with the password you saved earlier
8. **Save two versions** (you'll need different database names):

**For Auth Server**:
```
mongodb+srv://afeka-admin:K7mP9xQ2nR5tL8w@afeka-hiking-cluster.xxxxx.mongodb.net/hiking-auth?retryWrites=true&w=majority
```

**For Client (Routes)**:
```
mongodb+srv://afeka-admin:K7mP9xQ2nR5tL8w@afeka-hiking-cluster.xxxxx.mongodb.net/hiking-routes?retryWrites=true&w=majority
```

Note the different database names: `hiking-auth` vs `hiking-routes`

---

## 🔧 Part 2: Prepare Auth Server for Vercel (10 minutes)

### Step 2.1: Create Vercel Configuration

Create `auth-server/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

### Step 2.2: Update package.json

Ensure your `auth-server/package.json` has:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "vercel-build": "tsc"
  }
}
```

### Step 2.3: Create .vercelignore

Create `auth-server/.vercelignore`:

```
node_modules
.env
.env.local
*.log
.DS_Store
dist
```

### Step 2.4: Commit Changes

```bash
cd auth-server
git add vercel.json .vercelignore
git commit -m "Add Vercel configuration for auth server"
git push origin main
```

---

## 🚀 Part 3: Deploy Auth Server to Vercel (10 minutes)

### Step 3.1: Create Vercel Account

1. Go to: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account

### Step 3.2: Create New Project for Auth Server

1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. **Import Git Repository**: Select your repository
3. **Configure Project**:
   - **Project Name**: `afeka-auth-server`
   - **Framework Preset**: Other
   - **Root Directory**: Click **"Edit"** → Select `auth-server`
   - **Build Command**: `npm run build` or `tsc`
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

4. **Environment Variables**: Click **"Add"** and add these:

```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://afeka-admin:YOUR_PASSWORD@afeka-hiking-cluster.xxxxx.mongodb.net/hiking-auth?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-random-string
JWT_REFRESH_SECRET=your-refresh-secret-also-very-long-random-string
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://afeka-hiking.vercel.app
```

**Generate secure secrets** (run locally):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. Click **"Deploy"**

### Step 3.3: Get Auth Server URL

Once deployed (takes 2-3 minutes):
1. Copy the deployment URL: `https://afeka-auth-server.vercel.app`
2. Save this - you'll need it for the client!

### Step 3.4: Test Auth Server

Visit: `https://afeka-auth-server.vercel.app/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-02-23T..."
}
```

If you see this, your auth server is live! ✅

---

## 🎨 Part 4: Deploy Client to Vercel (10 minutes)

### Step 4.1: Create New Project for Client

1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. **Import Git Repository**: Select your repository (same repo)
3. **Configure Project**:
   - **Project Name**: `afeka-hiking-trails`
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click **"Edit"** → Select `client`
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: Leave default
   - **Install Command**: `npm install` (auto-filled)

### Step 4.2: Add Environment Variables

Click **"Environment Variables"** and add:

```env
NEXT_PUBLIC_AUTH_SERVER_URL=https://afeka-auth-server.vercel.app
GEMINI_API_KEY=your-google-gemini-api-key-here
OPENWEATHERMAP_API_KEY=your-openweather-api-key-here
MONGODB_URI=mongodb+srv://afeka-admin:YOUR_PASSWORD@afeka-hiking-cluster.xxxxx.mongodb.net/hiking-routes?retryWrites=true&w=majority
```

**Important Notes**:
- Use your actual Auth Server URL from Step 3.3
- Use your actual API keys
- Use the `hiking-routes` database name (different from auth)
- Replace `YOUR_PASSWORD` with your MongoDB password

### Step 4.3: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete

### Step 4.4: Get Client URL

Once deployed:
1. Copy the deployment URL: `https://afeka-hiking-trails.vercel.app`
2. This is your main application URL!

---

## 🔄 Part 5: Update CORS Configuration (5 minutes)

### Step 5.1: Update Auth Server Environment Variables

1. Go to Vercel dashboard → **Auth Server Project**
2. Go to **"Settings"** → **"Environment Variables"**
3. Find `CLIENT_URL` and click **"Edit"**
4. Update to your actual client URL:
   ```
   CLIENT_URL=https://afeka-hiking-trails.vercel.app
   ```
5. Click **"Save"**

### Step 5.2: Redeploy Auth Server

1. Go to **"Deployments"** tab
2. Find latest deployment
3. Click **"..."** menu → **"Redeploy"**
4. Click **"Redeploy"** to confirm
5. Wait for redeployment (~1 minute)

---

## ✅ Part 6: Verification & Testing (10 minutes)

### Test Checklist

#### 1. Test Auth Server Health
```bash
curl https://afeka-auth-server.vercel.app/health
```
✅ Should return: `{"status":"ok",...}`

#### 2. Test Client Application
Visit: `https://afeka-hiking-trails.vercel.app`
✅ Should see homepage

#### 3. Test User Registration
1. Click **"Sign Up"**
2. Create account with:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test123!`
3. ✅ Should successfully register

#### 4. Test Login
1. Log in with credentials above
2. ✅ Should redirect to homepage (logged in)

#### 5. Test Route Generation
1. Go to **"Plan Route"**
2. Fill form:
   - Location: `Switzerland, Zurich`
   - Type: `Trek`
   - Days: `2`
3. Click **"Generate Route"**
4. ✅ Should generate route with map

#### 6. Test Route Saving
1. Click **"Approve & Save Route"**
2. ✅ Should redirect to route detail page

#### 7. Test Route History
1. Go to **"My Routes"**
2. ✅ Should see saved route card

#### 8. Test Weather Integration
1. Click on saved route
2. ✅ Should show updated weather forecast

#### 9. Test Image Loading
1. Check if destination image loads
2. ✅ Should show AI-generated or fallback image

#### 10. Test Logout
1. Click username → **"Logout"**
2. ✅ Should redirect to homepage (logged out)

---

## 🔧 Troubleshooting

### Issue: Auth Server Returns 404

**Symptoms**: All auth endpoints return 404

**Solution**:
1. Check `auth-server/vercel.json` exists and is correct
2. Verify "Root Directory" is set to `auth-server` in Vercel
3. Check build logs for TypeScript compilation errors
4. Ensure `src/index.ts` path is correct in `vercel.json`

### Issue: MongoDB Connection Failed

**Symptoms**: "MongoServerError: Authentication failed"

**Solution**:
1. Verify password in connection string is correct
2. Check MongoDB user has correct privileges
3. Ensure Network Access allows all IPs (0.0.0.0/0)
4. Try regenerating MongoDB password and updating env vars

### Issue: CORS Errors

**Symptoms**: "Access-Control-Allow-Origin" errors in browser console

**Solution**:
1. Verify `CLIENT_URL` in auth server matches exact client URL
2. Ensure no trailing slash in URLs
3. Check auth server has `credentials: true` in CORS config
4. Redeploy auth server after updating `CLIENT_URL`

### Issue: Environment Variables Not Working

**Symptoms**: "undefined" values or API errors

**Solution**:
1. Verify all env vars are set in Vercel project settings
2. Check for typos in variable names
3. Ensure `NEXT_PUBLIC_` prefix for client-side variables
4. **Redeploy** after adding/updating env vars (they don't update automatically)

### Issue: Gemini API Errors

**Symptoms**: "API key not valid"

**Solution**:
1. Verify API key is correct
2. Check Gemini API is enabled at https://makersuite.google.com
3. Ensure no spaces in API key
4. Try generating new API key

### Issue: Weather Not Showing

**Symptoms**: No weather data in route details

**Solution**:
1. Check OpenWeatherMap API key is valid
2. Verify API key is activated (can take 10 minutes)
3. Check browser console for API errors
4. Ensure route has valid coordinates

### Issue: Images Not Loading

**Symptoms**: Broken image icon or gray box

**Solution**:
1. Check browser console for errors
2. Pollinations.ai may be slow - wait ~10 seconds
3. Fallback to Lorem Picsum should trigger automatically
4. Verify `ImageWithFallback` component is being used

### Issue: "Serverless Function Timeout"

**Symptoms**: "504: GATEWAY_TIMEOUT" during route generation

**Solution**:
1. This is Vercel's 10-second limit
2. Gemini API is taking too long
3. Try again (sometimes it's just slow)
4. If persists, consider Railway for auth server instead

---

## 📊 Monitoring Your Deployment

### Vercel Dashboard

For each project:

1. **Overview**: Deployment status, live URL
2. **Deployments**: History of all deployments
3. **Analytics**: Page views, performance
4. **Logs**: Runtime logs (check for errors)
5. **Settings**: Environment variables, domains

### MongoDB Atlas Dashboard

1. **Metrics**: Database operations, connections
2. **Collections**: View actual data
3. **Performance**: Query performance
4. **Alerts**: Set up email alerts

### Quick Health Check Commands

```bash
# Check auth server
curl https://afeka-auth-server.vercel.app/health

# Check client (should return HTML)
curl https://afeka-hiking-trails.vercel.app
```

---

## 🔄 Updating Your Deployment

### When You Make Code Changes

**Automatic Deployment** (Recommended):
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Vercel auto-deploys on push! ✅

**Manual Deployment**:
1. Go to Vercel dashboard
2. Select project
3. Click **"Deployments"**
4. Click **"Redeploy"** on latest

### When You Update Environment Variables

1. Update in Vercel project settings
2. **Must redeploy** for changes to take effect
3. Go to Deployments → Redeploy latest

---

## 💰 Cost Breakdown

| Service | Free Tier Limits | Cost |
|---------|-----------------|------|
| **MongoDB Atlas M0** | 512 MB storage | $0 |
| **Vercel (Auth)** | 100 GB bandwidth | $0 |
| **Vercel (Client)** | 100 GB bandwidth | $0 |
| **Gemini API** | 60 req/min | $0 |
| **OpenWeatherMap** | 1000 calls/day | $0 |
| **Pollinations.ai** | Unlimited | $0 |
| **Total** | | **$0** |

---

## 🎯 Final Checklist

Before submitting your project, verify:

- [ ] MongoDB Atlas cluster is running
- [ ] Auth server is deployed and accessible
- [ ] Client is deployed and accessible  
- [ ] Can register new user
- [ ] Can log in
- [ ] Can generate routes
- [ ] Can save routes
- [ ] Can view route history
- [ ] Weather data displays
- [ ] Images load (AI or fallback)
- [ ] Can log out
- [ ] Mobile responsive works
- [ ] All environment variables set correctly
- [ ] README.md updated with live URLs

---

## 📝 Update Your README

After successful deployment, update your `README.md`:

```markdown
## 🌐 Live Deployment

- **Application**: https://afeka-hiking-trails.vercel.app
- **Auth Server**: https://afeka-auth-server.vercel.app
- **Database**: MongoDB Atlas (Cloud)
- **GitHub**: https://github.com/yourusername/afeka-hiking-trails

### Test Credentials
- Username: `demo`
- Password: `Demo123!`
```

---

## 🎓 For Your Defense

When presenting to your lecturer:

### Architecture Explanation

"Our application uses a **two-server architecture** deployed on the cloud:

1. **Auth Server** (Vercel Project 1):
   - Express.js running as serverless functions
   - Handles user authentication with JWT
   - Password encryption with bcrypt
   - Deployed at: [your-auth-server-url]

2. **Client Application** (Vercel Project 2):
   - Next.js with App Router
   - Server and Client Components
   - Interactive maps and AI integration
   - Deployed at: [your-client-url]

3. **Database** (MongoDB Atlas):
   - Cloud-hosted MongoDB
   - Two databases: `hiking-auth` and `hiking-routes`
   - Shared by both servers

**Benefits**:
- ✅ Zero cost (all free tiers)
- ✅ Global availability
- ✅ Automatic scaling
- ✅ Continuous deployment
- ✅ HTTPS by default"

### Demonstrating Features

1. **Live Demo**: Show working application in browser
2. **Code Walkthrough**: Explain key components
3. **Database**: Show MongoDB Atlas dashboard
4. **Monitoring**: Show Vercel deployment dashboard
5. **CI/CD**: Explain automatic deployment on git push

---

## 🚀 Quick Start Summary

**TL;DR** - Complete deployment in 3 main steps:

```bash
# 1. MongoDB Atlas
# → Create account → Create M0 cluster → Get connection string

# 2. Deploy Auth Server
# → Add vercel.json → Deploy to Vercel → Set env vars

# 3. Deploy Client  
# → Deploy to Vercel → Set env vars → Update CORS
```

**Total Time**: ~40 minutes  
**Total Cost**: $0  
**Result**: Fully functional cloud application! 🎉

---

## 📞 Support

If you encounter issues:

1. Check **Vercel Logs**: Dashboard → Project → Logs
2. Check **MongoDB Logs**: Atlas → Cluster → Metrics
3. Check **Browser Console**: F12 → Console tab
4. Review this troubleshooting section
5. Verify all environment variables are correct

---

## ✅ Success!

Your application is now live on the internet! 🌐

**Next Steps**:
1. Share your URLs with friends/testers
2. Update README.md with live links
3. Prepare your defense presentation
4. Test all features thoroughly
5. Document any known issues

**You've successfully deployed a full-stack application to the cloud!** 🎊
