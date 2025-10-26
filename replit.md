# TreePro AI - Replit Project Documentation

## Overview
TreePro AI is a comprehensive business management platform for tree service companies, powered by Google Gemini AI. This is a full-stack application with React frontend and Node.js/Express backend.

**Status**: Fully configured and running on Replit  
**Last Updated**: October 26, 2025

## Recent Changes

### October 26, 2025 - Comprehensive API & Data Fixes + AI Estimator Fix

#### AI Estimator Fix (Latest)
1. **Fixed Invalid Gemini Model Names**
   - Updated all Gemini API calls from invalid `gemini-2.5-pro` to `gemini-2.0-flash`
   - Fixed AI Tree Estimator, AI Core, Chat Service, Marketing Tools
   - Added better error messages to display actual API errors
   - All AI features now working correctly

#### Critical Bug Fixes
1. **Fixed Leads Page Crash** (pages/Leads.tsx)
   - Added optional chaining (`?.`) to safely access `lead.customer.name` and `lead.customer.email`
   - Prevents "Cannot read properties of undefined (reading 'name')" error
   - Added fallback values ('N/A') for missing customer data

2. **Fixed Backend API - Complete snake_case to camelCase Transformation** (backend/server.js)
   - **Quotes API**: `customer_name` → `customerName`, `line_items` → `lineItems`, `stump_grinding_price` → `stumpGrindingPrice`, `lead_id` → `leadId`
   - **Employees API**: `job_title` → `jobTitle`, `pay_rate` → `payRate`, `hire_date` → `hireDate`, `performance_metrics` → `performanceMetrics`
   - **Equipment API**: `purchase_date` → `purchaseDate`, `last_service_date` → `lastServiceDate`, `assigned_to` → `assignedTo`, `maintenance_history` → `maintenanceHistory`
   - **Leads API**: Custom endpoint with SQL JOIN to embed full customer objects, `customer_id` → `customerId`
   - **Jobs API**: All job-related fields properly transformed
   - Added proper null handling to prevent data corruption (preserves null values instead of converting to 0)
   - Added bidirectional transformations (transformRow & transformToDb) for all resources

3. **Database Seeding Completed**
   - Successfully seeded database with realistic test data:
     - 10 employees with certifications and performance metrics
     - 15 equipment items with maintenance schedules
     - 50 customers across Los Angeles area with GPS coordinates
     - 20 leads with various statuses (New, Contacted, Qualified, Lost)
     - 30 quotes with line items and pricing
     - 15 jobs with scheduling and crew assignments

#### Technical Improvements
- All API responses now match TypeScript type definitions
- Numeric fields (payRate, stumpGrindingPrice) properly parsed as numbers
- NULL preservation prevents accidental data overwriting
- Complete CRUD support with proper field transformations

## Project Architecture

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS (via CDN in development)
- **Routing**: React Router DOM (HashRouter)
- **Port**: 5000 (production and development)
- **Host**: 0.0.0.0 (allows Replit proxy access)

### Backend
- **Framework**: Node.js + Express
- **Database**: PostgreSQL (Replit-managed)
- **Port**: 3001 (development), 5000 (production)
- **Host**: localhost (development), 0.0.0.0 (production)

### Database
- **Type**: PostgreSQL 14+
- **Provider**: Replit managed database
- **Schema**: Initialized from `backend/init.sql`
- **Tables**: customers, leads, quotes, jobs, invoices, employees, equipment

## Key Features
1. AI-Powered Tree Estimating (Gemini 2.5)
2. Smart Lead Scoring
3. Intelligent Job Scheduling
4. Job Hazard Analysis
5. Marketing Automation
6. Customer Portal with public links
7. Crew Mobile App with GPS tracking
8. Real-time Maps (Google Maps)

## Environment Variables

### Required Secrets (Configured in Replit)
- `VITE_GEMINI_API_KEY` - Google Gemini API key for AI features
- `VITE_GOOGLE_MAPS_KEY` - Google Maps API key for location features
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

### Backend Environment (backend/.env)
- `DATABASE_URL` - Uses Replit's DATABASE_URL
- `PORT` - Backend server port (3001 for dev, 5000 for production)
- `NODE_ENV` - Environment mode (development/production)

## Development Setup

### Workflows
Two workflows are configured:

1. **Frontend** (Port 5000)
   - Command: `npm run dev:frontend`
   - Runs Vite development server
   - Proxies `/api` requests to backend at localhost:3001
   - Configured with `allowedHosts: true` for Replit proxy

2. **Backend** (Port 3001)
   - Command: `npm run dev:backend`
   - Runs Express server with nodemon (auto-restart)
   - Serves REST API at `/api/*` endpoints
   - Connects to PostgreSQL database

### Important Configuration

#### Vite Configuration (vite.config.ts)
- **Port**: 5000
- **Host**: 0.0.0.0 (required for Replit)
- **allowedHosts**: true (required for Replit proxy)
- **Proxy**: /api → http://localhost:3001
- API keys injected via environment variables

#### Backend Server (backend/server.js)
- Uses environment-based host binding
- Development: localhost (for frontend proxy)
- Production: 0.0.0.0 (for direct access)
- Serves static files from `backend/public` in production

## Database Schema

### Tables
- `customers` - Customer information with coordinates
- `leads` - Lead tracking and status
- `quotes` - Quote management with line items
- `jobs` - Job scheduling and tracking
- `invoices` - Invoice generation and payment tracking
- `employees` - Employee management
- `equipment` - Equipment tracking and maintenance

### Initialization
Database schema is initialized from `backend/init.sql` which includes:
- Table definitions with UUID primary keys
- Indexes for performance
- Foreign key relationships

## API Endpoints

All endpoints are prefixed with `/api`:

### CRUD Operations (for each resource)
- GET `/api/{resource}` - List all
- GET `/api/{resource}/:id` - Get by ID
- POST `/api/{resource}` - Create new
- PUT `/api/{resource}/:id` - Update
- DELETE `/api/{resource}/:id` - Delete

### Resources
- customers, leads, quotes, jobs, invoices, employees, equipment

### Health Check
- GET `/api/health` - Server status check

## Production Deployment

### Build Process
1. `npm run build` - Builds frontend to `dist/` directory
2. Copy `dist/*` to `backend/public/`
3. Backend serves static files and API

### Deployment Configuration
- **Target**: Autoscale (stateless web app)
- **Build**: `npm run build && cp -r dist/* backend/public/`
- **Run**: `node backend/server.js`
- **Port**: 5000 (environment variable PORT)

### Production Server
- Backend serves both static frontend files and API endpoints
- All non-API routes serve `index.html` (SPA routing)
- CORS enabled for API access

## Known Issues & Solutions

### Vite Cache Issues
If you see "chunk file not found" errors:
```bash
rm -rf node_modules/.vite
```
Then restart the Frontend workflow.

### TailwindCSS CDN Warning
The project uses TailwindCSS via CDN in development. This is intentional for rapid development and works fine, though production builds should use PostCSS plugin.

## File Structure
```
treepro-ai/
├── components/         # React components
│   ├── icons/         # SVG icon components
│   └── ...           # Layout, Header, Sidebar, etc.
├── contexts/          # React contexts (Auth)
├── hooks/            # Custom React hooks
├── pages/            # Page components
│   ├── crew/         # Crew mobile app pages
│   └── portal/       # Customer portal pages
├── services/         # API and AI services
│   └── gemini/       # Modular Gemini AI services
├── backend/          # Express backend
│   ├── server.js     # Main server file
│   ├── db.js         # Database connection
│   └── init.sql      # Database schema
├── index.html        # HTML entry point
├── index.tsx         # React entry point
├── App.tsx           # Main app component
└── vite.config.ts    # Vite configuration
```

## Troubleshooting

### Frontend Not Loading
1. Check Frontend workflow is running
2. Verify `allowedHosts: true` in vite.config.ts
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Restart Frontend workflow

### Backend API Errors
1. Check Backend workflow is running
2. Verify DATABASE_URL environment variable is set
3. Check backend logs for connection errors
4. Test health endpoint: `/api/health`

### Database Connection Issues
1. Verify Replit PostgreSQL database is provisioned
2. Check DATABASE_URL in backend/.env
3. Re-initialize schema: `psql $DATABASE_URL -f backend/init.sql`

## Development Notes

### Port Configuration
- Frontend: 5000 (user-facing)
- Backend: 3001 (internal, proxied by frontend)
- Production: Backend serves everything on port 5000

### Hot Module Reload (HMR)
Vite HMR is configured to work with Replit's proxy environment. No custom WebSocket configuration needed.

### Authentication
Demo mode - accepts any email/password for login (development only).

## Resources
- [Google Gemini API](https://aistudio.google.com/apikey)
- [Google Maps API](https://console.cloud.google.com/)
- [Project README](./README.md)
- [Quick Start Guide](./QUICK_START.md)
