# TreePro AI - Deployment Guide

## ✅ Deployment Configuration Complete

Your TreePro AI application is now properly configured for deployment on Replit's Cloud Run Autoscale infrastructure.

---

## 🚀 Deployment Settings

### Package Manager
- **Development**: npm
- **Production/Deployment**: pnpm (Replit's deployment environment)

### Build Command
```bash
pnpm install && cd backend && pnpm install && cd .. && pnpm run build && cp -r dist/* backend/public/
```

**What it does:**
1. Installs root dependencies with pnpm
2. Installs backend dependencies with pnpm
3. Builds the React frontend to `dist/`
4. Copies built files to `backend/public/`

### Run Command
```bash
node backend/server.js
```

**What it does:**
- Starts the Express backend server
- Serves both static frontend files AND API endpoints
- Binds to 0.0.0.0 (all interfaces) in production
- Uses PORT environment variable from Cloud Run

---

## 🔐 Required Secrets (All Configured ✅)

The following secrets are properly configured for deployment:

1. **VITE_GEMINI_API_KEY** ✅
   - Google Gemini API key for AI features
   - Exposed to frontend with VITE_ prefix

2. **VITE_GOOGLE_MAPS_KEY** ✅
   - Google Maps API key for location features
   - Exposed to frontend with VITE_ prefix

3. **DATABASE_URL** ✅
   - PostgreSQL connection string
   - Auto-configured by Replit

---

## 🏗️ Backend Production Configuration

The backend is properly configured for Cloud Run deployment:

```javascript
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
```

**Development Mode:**
- Port: 3001 (frontend proxies `/api` requests)
- Host: localhost

**Production Mode:**
- Port: Uses PORT env var from Cloud Run
- Host: 0.0.0.0 (binds to all network interfaces)

---

## 📦 Helper Scripts

You can test the build process locally:

```bash
# Install all dependencies (root + backend)
pnpm run install:all

# Run full production build
pnpm run build:production
```

---

## 🎯 How to Deploy

1. **Click the "Deploy" button** in your Replit workspace
2. The build process will automatically:
   - Install all dependencies with pnpm
   - Build the frontend
   - Copy files to backend/public
   - Deploy to Cloud Run
3. Your app will be live at your deployment URL!

---

## ✨ What's Been Fixed

### 1. Package Manager
- ✅ Build command now uses `pnpm` instead of `npm`
- ✅ All production scripts updated to use pnpm

### 2. Backend Configuration
- ✅ Binds to 0.0.0.0 in production (Cloud Run requirement)
- ✅ Uses PORT environment variable from Cloud Run
- ✅ Serves static frontend files from `public/` directory
- ✅ Handles SPA routing (all routes serve index.html)

### 3. Environment Secrets
- ✅ All required API keys configured
- ✅ Frontend keys use VITE_ prefix
- ✅ Database connection auto-configured

### 4. Build Process
- ✅ Installs root dependencies
- ✅ Installs backend dependencies
- ✅ Builds frontend
- ✅ Copies built files to correct location

---

## 🎉 Your App Is Ready!

TreePro AI is fully configured and ready for deployment. The build process will:
- Complete successfully with pnpm
- Serve on the correct port with Cloud Run
- Include all necessary secrets
- Handle both API and static file serving

**Click Deploy and go live! 🌲✨**
