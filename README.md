# TreePro AI

A comprehensive business management platform for tree service companies, powered by Google Gemini AI.

## Features

- **AI-Powered Estimating**: Upload photos/videos of trees for instant AI-generated estimates
- **Smart Lead Scoring**: Automatically prioritize leads based on AI analysis
- **Intelligent Job Scheduling**: AI suggests optimal crew assignments and dates
- **Job Hazard Analysis**: AI-powered safety assessments from job site photos
- **Marketing Automation**: Generate social media posts, SEO content, and email campaigns
- **Equipment Maintenance**: Proactive AI maintenance recommendations
- **Customer Portal**: Public links for quotes, invoices, and job tracking
- **Crew Mobile App**: Clock in/out with GPS, photo uploads, and safety checklists
- **Real-time Maps**: Live tracking of jobs and crew locations

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.5 Pro/Flash
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Maps**: Google Maps API
- **Routing**: React Router DOM

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Google Gemini API key
- Google Maps API key

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

**Frontend (.env):**
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

**Backend (backend/.env):**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/treeproai
PORT=5000
NODE_ENV=development
```

### 3. Set Up PostgreSQL Database

**Option A: Using psql command line**
```bash
# Create database
createdb treeproai

# Run initialization script
psql -d treeproai -f backend/init.sql
```

**Option B: Using PostgreSQL GUI (pgAdmin, DBeaver, etc.)**
1. Create a new database named `treeproai`
2. Open and execute the `backend/init.sql` file

**Verify database setup:**
```bash
psql -d treeproai -c "SELECT COUNT(*) FROM customers;"
```
You should see 4 customers.

### 4. Start the Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
You should see: `Backend server running on http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
You should see: `Local: http://localhost:3000`

### 5. Access the Application

Open your browser to `http://localhost:3000`

**Login:** Use any email and password (demo mode)

## Getting Your API Keys

### Google Gemini API Key (Required for AI features)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key or use an existing one
5. Copy the key to your `.env` file as `VITE_GEMINI_API_KEY`

**Note:** Gemini API has a generous free tier. Check [pricing](https://ai.google.dev/pricing) for details.

### Google Maps API Key (Required for map features)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. (Optional but recommended) Restrict the key:
   - Application restrictions: HTTP referrers
   - Add `http://localhost:3000/*` for development
6. Copy the key to your `.env` file as `VITE_GOOGLE_MAPS_KEY`

**Note:** Google Maps has a $200/month free credit. See [pricing](https://mapsplatform.google.com/pricing/) for details.

## Project Structure

```
treepro-ai/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── icons/          # SVG icon components
│   │   ├── Layout.tsx      # Main app layout
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx
│   │   ├── AICore.tsx
│   │   ├── AITreeEstimator.tsx
│   │   ├── crew/           # Crew mobile app pages
│   │   ├── portal/         # Customer portal pages
│   │   └── ...
│   ├── services/           # API and AI services
│   │   ├── gemini/         # Modular Gemini AI services
│   │   │   ├── chatService.ts
│   │   │   ├── estimateService.ts
│   │   │   ├── marketingService.ts
│   │   │   └── businessService.ts
│   │   ├── apiService.ts   # Backend API client
│   │   └── geminiService.ts # Main AI service
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── data/               # Mock data for development
│   ├── types.ts            # TypeScript type definitions
│   └── App.tsx             # Main app component
├── backend/
│   ├── server.js           # Express server
│   ├── db.js               # Database connection
│   ├── init.sql            # Database schema & seed data
│   └── package.json
├── public/                 # Static assets
└── package.json
```

## Available Scripts

### Frontend

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon (auto-restart)

## Key Features Guide

### 1. AI Tree Estimator

**Purpose:** Generate instant quotes from tree photos/videos

**How to use:**
1. Navigate to "AI Tree Estimator" in the sidebar
2. Click "Upload Media" and select photos or videos
3. Click "Analyze Media"
4. Review AI-generated:
   - Tree identification
   - Health assessment
   - Measurements
   - Suggested services with pricing
   - Required equipment and crew
5. Click "Create Quote from Results" to save

### 2. AI Core Insights

**Purpose:** Automated business intelligence and recommendations

**Features:**
- **Lead Scoring:** Automatically prioritizes leads (1-100 score)
- **Job Scheduling:** Suggests optimal dates and crew assignments
- **Maintenance Alerts:** Flags equipment needing service

**How to use:**
1. Navigate to "AI Core"
2. Click "Generate AI Insights"
3. Review recommendations
4. Click action buttons to implement suggestions

### 3. Customer Portal

**Purpose:** Share quotes, invoices, and job status with customers

**How to use:**
1. Create a quote or job
2. Click the "Public Link" button
3. Copy and share the link with your customer
4. Customer can:
   - View and accept quotes
   - Sign electronically
   - Track job progress
   - View and pay invoices
   - Send messages

**Portal URLs:**
- Quote: `/portal/quote/:quoteId`
- Invoice: `/portal/invoice/:invoiceId`
- Job Status: `/portal/job/:jobId`

### 4. Crew Mobile App

**Purpose:** Field crew job management and safety

**How to use:**
1. Navigate to `/crew` route
2. View assigned jobs for today
3. Click on a job to:
   - Clock in (with GPS verification)
   - Upload job photos
   - Generate AI safety analysis (JHA)
   - Mark job complete
   - Clock out

**Features:**
- GPS-verified clock in/out
- Photo documentation
- AI-powered Job Hazard Analysis
- Real-time job updates

### 5. Marketing Tools

**Purpose:** AI-generated marketing content

**Features:**
- Social media post generation
- SEO content optimization
- Email campaign creation

**How to use:**
1. Navigate to "Marketing"
2. Select content type
3. Enter topic/keywords
4. Click "Generate"
5. Copy and use the AI-generated content

## Troubleshooting

### Backend won't start

**Error:** `ECONNREFUSED` or database connection errors

**Solutions:**
1. Ensure PostgreSQL is running:
   ```bash
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   
   # Windows
   # Start PostgreSQL service from Services app
   ```

2. Verify database exists:
   ```bash
   psql -l | grep treeproai
   ```

3. Check `DATABASE_URL` in `backend/.env`:
   ```env
   # Format: postgresql://username:password@host:port/database
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/treeproai
   ```

4. Test database connection:
   ```bash
   psql -d treeproai -c "SELECT 1;"
   ```

### Frontend API errors

**Error:** `Failed to fetch` or CORS errors

**Solutions:**
1. Ensure backend is running on port 5000
2. Check browser console for specific errors
3. Verify proxy configuration in `vite.config.ts`:
   ```typescript
   proxy: {
     '/api': {
       target: 'http://localhost:5000',
       changeOrigin: true,
     }
   }
   ```

### AI features not working

**Error:** `Failed to generate AI...` or API key errors

**Solutions:**
1. Verify `VITE_GEMINI_API_KEY` is set in `.env`
2. Check API key is valid at [Google AI Studio](https://aistudio.google.com/apikey)
3. Ensure you have API quota available
4. Check browser console for specific error messages
5. Try regenerating your API key

### Maps not loading

**Error:** Blank map or "This page can't load Google Maps correctly"

**Solutions:**
1. Verify `VITE_GOOGLE_MAPS_KEY` is set in `.env`
2. Ensure Maps JavaScript API is enabled in Google Cloud Console
3. Check for billing account (required even for free tier)
4. Verify API key restrictions allow `localhost:3000`
5. Check browser console for authentication errors

### Database schema issues

**Error:** Column does not exist or type mismatch

**Solutions:**
1. Drop and recreate database:
   ```bash
   dropdb treeproai
   createdb treeproai
   psql -d treeproai -f backend/init.sql
   ```

2. Or update schema manually:
   ```bash
   psql -d treeproai -f backend/init.sql
   ```

### Port already in use

**Error:** `EADDRINUSE: address already in use`

**Solutions:**
1. Find and kill the process:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   lsof -ti:5000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. Or change the port in configuration files

## Production Deployment

### Build the Frontend

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Google Cloud Run

1. **Build Docker image (injecting frontend API keys at build time):**
   ```bash
   cd backend
   docker build \
     --build-arg GEMINI_API_KEY=your_gemini_api_key \
     --build-arg GOOGLE_MAPS_KEY=your_google_maps_key \
     -t gcr.io/YOUR_PROJECT_ID/treeproai ..
   ```

2. **Push to Container Registry:**
   ```bash
   docker push gcr.io/YOUR_PROJECT_ID/treeproai
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy treeproai \
     --image gcr.io/YOUR_PROJECT_ID/treeproai \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

4. **Set environment variables in Cloud Run console:**
   - `DATABASE_URL`
   - `NODE_ENV=production`
   - (optional) `PORT=8080` if you change the default
   - (optional) `GEMINI_API_KEY` and `GOOGLE_MAPS_KEY` if you also need them at runtime

### Environment Variables for Production

```env
DATABASE_URL=postgresql://user:pass@host:5432/treeproai
NODE_ENV=production
# Optional runtime overrides (frontend keys are baked in during docker build)
GEMINI_API_KEY=your_production_key
GOOGLE_MAPS_KEY=your_production_key
PORT=8080
```

## Mobile App (iOS/Android)

This project includes Capacitor configuration for building native mobile apps.

### Build for iOS

```bash
npm run build
npx cap sync ios
npx cap open ios
```

### Build for Android

```bash
npm run build
npx cap sync android
npx cap open android
```

## Contributing

This is a demonstration project showcasing AI integration in business software.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check this README
2. Review the troubleshooting section
3. Check browser console for errors
4. Verify all environment variables are set correctly

## Roadmap

- [ ] QuickBooks integration
- [ ] Stripe payment processing
- [ ] Google Calendar sync
- [ ] SMS notifications
- [ ] Advanced reporting
- [ ] Multi-tenant support
- [ ] Mobile app release

---

**Built with ❤️ using React, TypeScript, and Google Gemini AI**