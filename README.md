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

## Setup Instructions

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

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

Create a `backend/.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/treeproai
PORT=5000
NODE_ENV=development
```

### 3. Set Up the Database

```bash
# Create the database
createdb treeproai

# Run the initialization script
psql -d treeproai -f backend/init.sql
```

### 4. Start the Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Getting Your API Keys

### Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key or use an existing one
5. Copy the key to your `.env` file

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
4. Go to "Credentials" and create an API key
5. Restrict the key to your domain (optional but recommended)
6. Copy the key to your `.env` file

## Project Structure

```
treepro-ai/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── services/         # API and AI services
│   │   ├── gemini/       # Modular Gemini AI services
│   │   ├── apiService.ts # Backend API client
│   │   └── geminiService.ts # Main AI service
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   ├── types.ts          # TypeScript type definitions
│   └── App.tsx           # Main app component
├── backend/
│   ├── server.js         # Express server
│   ├── db.js             # Database connection
│   └── init.sql          # Database schema
└── public/               # Static assets
```

## Available Scripts

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Key Features Guide

### AI Tree Estimator

1. Navigate to "AI Tree Estimator"
2. Upload photos or videos of the tree
3. Click "Analyze Media"
4. Review AI-generated assessment and pricing
5. Click "Create Quote from Results"

### AI Core Insights

1. Navigate to "AI Core"
2. View automated lead scoring
3. Review smart job scheduling suggestions
4. Check proactive maintenance alerts
5. Accept or modify AI suggestions

### Customer Portal

1. Create a quote or job
2. Click the "Public Link" button
3. Copy and share the link with customers
4. Customers can view, accept quotes, and track jobs
5. Two-way messaging available

### Crew Mobile App

1. Navigate to `/crew` route
2. View assigned jobs
3. Clock in/out with GPS verification
4. Upload job photos
5. Generate AI safety analysis
6. Mark jobs complete

## Troubleshooting

### Backend won't start

- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env`
- Verify database exists: `psql -l | grep treeproai`

### Frontend API errors

- Ensure backend is running on port 5000
- Check browser console for CORS errors
- Verify `/api` proxy in `vite.config.ts`

### AI features not working

- Verify `VITE_GEMINI_API_KEY` is set correctly
- Check browser console for API errors
- Ensure you have Gemini API quota available

### Maps not loading

- Verify `VITE_GOOGLE_MAPS_KEY` is set correctly
- Ensure Maps JavaScript API is enabled in Google Cloud Console
- Check for authentication errors in browser console

## Production Deployment

### Build the Frontend

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Google Cloud Run

1. Build the Docker image (see `backend/Dockerfile`)
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Set environment variables in Cloud Run console

### Environment Variables for Production

- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_MAPS_KEY` - Google Maps API key
- `NODE_ENV=production`

## Contributing

This is a demonstration project showcasing AI integration in business software.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please check the documentation or create an issue in the repository.