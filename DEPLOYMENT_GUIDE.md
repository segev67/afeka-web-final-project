# Cloud Deployment Guide

Complete guide to deploy the Afeka Hiking Trails application to the cloud.

## 📋 Deployment Overview

We'll deploy three components:
1. **MongoDB** → MongoDB Atlas (Cloud Database)
2. **Auth Server (Express)** → Railway.app (Free Tier)
3. **Client (Next.js)** → Vercel (Free Tier)

**Total Cost**: $0 (All free tiers)

---

## 🗄️ Step 1: MongoDB Atlas Setup (Database)

### 1.1 Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google account
3. Choose **Free Shared Cluster** (M0)

### 1.2 Create a Cluster

1. Click **"Build a Database"**
2. Select **"Shared"** (Free tier)
3. Choose cloud provider: **AWS**
4. Region: Select closest to your location
5. Cluster Name: `afeka-hiking-cluster`
6. Click **"Create"**

### 1.3 Create Database User

1. Go to **"Database Access"** in left sidebar
2. Click **"Add New Database User"**
3. Authentication: **Password**
4. Username: `afeka-admin`
5. Password: Generate secure password (save it!)
6. Database User Privileges: **Read and write to any database**
7. Click **"Add User"**

### 1.4 Configure Network Access

1. Go to **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ For production, restrict to specific IPs
4. Click **"Confirm"**

### 1.5 Get Connection String

1. Go to **"Database"** → Click **"Connect"**
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy connection string:
   ```
   mongodb+srv://afeka-admin:<password>@afeka-hiking-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Save this connection string - you'll need it for both servers

**Example final string**:
```
mongodb+srv://afeka-admin:MySecurePass123@afeka-hiking-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## 🚂 Step 2: Deploy Auth Server to Railway

Railway is perfect for Express.js apps - free tier includes 500 hours/month.

### 2.1 Prepare Auth Server for Deployment

#### Update `auth-server/package.json`

Add start script if not present:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  }
}
```

#### Create `auth-server/.railwayignore`

```
node_modules/
.env
.env.local
*.log
.DS_Store
```

### 2.2 Create Railway Account

1. Go to https://railway.app
2. Click **"Login"**
3. Sign up with GitHub (recommended) or email

### 2.3 Deploy Auth Server

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub
4. Select your repository
5. Railway will detect Node.js and deploy automatically

### 2.4 Configure Environment Variables

1. Go to your project → **"Variables"** tab
2. Click **"New Variable"** and add each:

```env
PORT=5001
NODE_ENV=production
MONGODB_URI=mongodb+srv://afeka-admin:YourPassword@afeka-hiking-cluster.xxxxx.mongodb.net/hiking-auth?retryWrites=true&w=majority
JWT_SECRET=your-production-secret-here-use-strong-random-string
JWT_REFRESH_SECRET=your-refresh-secret-here-also-strong-random
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-app.vercel.app
```

**Generate secure secrets**:
```bash
# Run this locally to generate secure secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.5 Get Auth Server URL

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://your-auth-server.up.railway.app`)
4. Save this URL - you'll need it for the client

---

## ▲ Step 3: Deploy Client to Vercel

Vercel is optimized for Next.js - deployment is seamless.

### 3.1 Prepare Client for Deployment

#### Update `client/next.config.ts`

Ensure it has proper configuration:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add production optimizations
  output: 'standalone',
};

export default nextConfig;
```

### 3.2 Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access GitHub

### 3.3 Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. **Root Directory**: Select `client`
4. **Framework Preset**: Next.js (auto-detected)
5. Click **"Deploy"**

#### Option B: Via Vercel CLI

```bash
cd client
npx vercel
# Follow prompts
```

### 3.4 Configure Environment Variables

1. Go to Project **"Settings"** → **"Environment Variables"**
2. Add the following variables:

**For Production**:

```env
NEXT_PUBLIC_AUTH_SERVER_URL=https://your-auth-server.up.railway.app
GEMINI_API_KEY=your-gemini-api-key
OPENWEATHERMAP_API_KEY=your-openweather-api-key
MONGODB_URI=mongodb+srv://afeka-admin:YourPassword@afeka-hiking-cluster.xxxxx.mongodb.net/hiking-routes?retryWrites=true&w=majority
```

3. Click **"Save"**
4. **Redeploy**: Go to **"Deployments"** → Click menu on latest → **"Redeploy"**

### 3.5 Get Your App URL

Your app will be available at:
```
https://your-app-name.vercel.app
```

---

## 🔄 Step 4: Update CORS Configuration

### 4.1 Update Auth Server CORS

In Railway, update environment variable:

```env
CLIENT_URL=https://your-app-name.vercel.app
```

### 4.2 Update Auth Server Code (if needed)

If you have hardcoded CORS origins, update `auth-server/src/index.ts`:

```typescript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
```

Redeploy on Railway after changes.

---

## ✅ Step 5: Verify Deployment

### 5.1 Test MongoDB Connection

Check Railway logs:
```
✅ MongoDB connected successfully
```

### 5.2 Test Auth Server

Visit: `https://your-auth-server.up.railway.app/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-02-23T..."
}
```

### 5.3 Test Full Application

1. Visit: `https://your-app-name.vercel.app`
2. Register a new user
3. Log in
4. Generate a route
5. Save route
6. View in history

---

## 🔧 Troubleshooting

### Issue: MongoDB Connection Fails

**Solution**:
- Check MongoDB Atlas Network Access allows all IPs (0.0.0.0/0)
- Verify connection string password is correct
- Ensure connection string uses `+srv` format
- Check MongoDB Atlas cluster is running

### Issue: CORS Errors

**Solution**:
- Verify `CLIENT_URL` in auth server matches Vercel URL exactly
- Check auth server has `credentials: true` in CORS config
- Ensure Vercel deployment is using correct `NEXT_PUBLIC_AUTH_SERVER_URL`

### Issue: Auth Server Not Responding

**Solution**:
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure PORT is set to 5001 or Railway's default
- Check Railway service is running (not sleeping)

### Issue: API Keys Not Working

**Solution**:
- Verify Gemini API key is valid
- Check OpenWeatherMap API key is activated
- Ensure environment variables don't have extra spaces
- Redeploy after adding/updating env vars

### Issue: Images Not Loading

**Solution**:
- Check browser console for CORS errors
- Pollinations.ai may be slow - fallback should trigger
- Verify ImageWithFallback component is being used

---

## 💰 Cost Breakdown

| Service | Free Tier | Limits | Cost |
|---------|-----------|--------|------|
| **MongoDB Atlas** | ✅ M0 Cluster | 512 MB storage, Shared RAM | $0 |
| **Railway** | ✅ 500 hours/month | $5 credit/month | $0 |
| **Vercel** | ✅ Hobby Plan | 100 GB bandwidth | $0 |
| **Gemini API** | ✅ Free Tier | 60 requests/minute | $0 |
| **OpenWeatherMap** | ✅ Free Tier | 1000 calls/day | $0 |
| **Pollinations.ai** | ✅ Free | Unlimited | $0 |
| **OSRM** | ✅ Public Server | Rate limited | $0 |
| **Total** | | | **$0** |

---

## 🎯 Production Checklist

### Before Deployment

- [ ] All environment variables prepared
- [ ] API keys obtained (Gemini, OpenWeatherMap)
- [ ] MongoDB Atlas cluster created
- [ ] GitHub repository is public or accessible
- [ ] `.env` files are in `.gitignore`

### During Deployment

- [ ] MongoDB Atlas connection string saved
- [ ] Auth server deployed to Railway
- [ ] Auth server URL saved
- [ ] Client deployed to Vercel
- [ ] Environment variables configured on both platforms
- [ ] CORS settings updated

### After Deployment

- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test route generation
- [ ] Test route saving
- [ ] Test route history
- [ ] Test on mobile devices
- [ ] Verify all images load
- [ ] Check weather data displays

---

## 📱 Update Your README

After deployment, update `README.md` with your URLs:

```markdown
## 🌐 Live Deployment

- **Application URL**: https://afeka-hiking-trails.vercel.app
- **Auth Server**: https://afeka-auth-server.up.railway.app
- **GitHub Repository**: https://github.com/yourusername/afeka-hiking-trails
```

---

## 🔐 Security Best Practices

### Production Security

1. **Environment Variables**:
   - Never commit `.env` files
   - Use strong random secrets for JWT
   - Rotate secrets periodically

2. **MongoDB**:
   - Restrict IP access in production
   - Use strong passwords
   - Enable audit logging

3. **API Keys**:
   - Store in environment variables only
   - Set up rate limiting
   - Monitor usage

4. **CORS**:
   - Restrict to your Vercel domain only
   - Don't use wildcards (*) in production

---

## 📊 Monitoring

### Railway Monitoring

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: CPU, Memory, Network usage
- **Alerts**: Set up email alerts for crashes

### Vercel Monitoring

- **Analytics**: Built-in web analytics
- **Speed Insights**: Performance monitoring
- **Error Tracking**: Runtime error logs

### MongoDB Atlas Monitoring

- **Performance**: Query performance insights
- **Alerts**: Set up alerts for connection issues
- **Metrics**: Database operations, connections

---

## 🚀 Deployment Commands Summary

### Initial Deployment

```bash
# 1. Deploy Auth Server to Railway
cd auth-server
railway login
railway up

# 2. Deploy Client to Vercel
cd ../client
vercel --prod
```

### Update Deployment

```bash
# Auth Server
cd auth-server
git push origin main
# Railway auto-deploys on git push

# Client
cd client
vercel --prod
# Or: git push (if connected to Vercel Git)
```

---

## 🎓 For Your Project Defense

When presenting your deployed application:

1. **Show Live URLs**: Demonstrate working application in browser
2. **Explain Architecture**: Show how three components connect
3. **Database**: Explain MongoDB Atlas setup and connection
4. **Environment Variables**: Explain how secrets are managed
5. **Scaling**: Discuss how each service can scale

**Key Points**:
- ✅ Fully functional in cloud
- ✅ No local dependencies required
- ✅ Professional deployment setup
- ✅ Free tier for demonstration
- ✅ Can be accessed from anywhere

---

## 📝 Deployment URLs Template

Save these after deployment:

```
MongoDB Atlas Cluster: https://cloud.mongodb.com/v2/[your-cluster-id]
Auth Server (Railway): https://[your-service].up.railway.app
Client (Vercel): https://[your-app].vercel.app
GitHub Repository: https://github.com/[username]/[repo]
```

---

**Ready to Deploy?** Follow the steps in order, and your application will be live on the web! 🌐
