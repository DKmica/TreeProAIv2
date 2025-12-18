# TreePro AI - Deployment Guide

This guide describes how to run TreePro AI outside of Replit using standard infrastructure. The application ships as a Vite-powered React frontend and an Express API that can be hosted on any server with Node.js and PostgreSQL available. For a cloud-native recipe that pairs Supabase (database), Vercel (hosting), and Dyad (preview builds), see [`docs/SUPABASE_VERCEL_DYAD.md`](docs/SUPABASE_VERCEL_DYAD.md).

## Prerequisites
- Node.js 20+
- PostgreSQL 14+
- pnpm (recommended) or npm
- Stripe account and webhook signing secret (optional for payments)

## Environment Variables
Configure the following variables for your target environment:

| Name | Purpose |
| ---- | ------- |
| `HOST` | Interface for the API server (default: `0.0.0.0`). |
| `PORT` | Port for the API server (default: `3001`). |
| `DATABASE_URL` | PostgreSQL connection string. |
| `GEMINI_API_KEY` | Google Gemini API key for AI features. |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for geocoding and map features. |
| `AUTH_TOKEN` | Shared secret for API authentication (send as `Bearer` token or `x-api-key`). Leave unset to disable auth in non-production environments. |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (optional). |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (optional). |

## Build and Bundle
1. Install dependencies:
   ```bash
   pnpm install
   cd backend && pnpm install
   ```
2. Build the frontend:
   ```bash
   pnpm run build
   ```
3. Copy the production assets into the backend so Express can serve them:
   ```bash
   mkdir -p backend/public
   cp -r dist/* backend/public/
   ```

## Database Initialization
Bootstrap a new PostgreSQL database with the consolidated schema:
```bash
psql "$DATABASE_URL" -f backend/init.sql
```

## Running the Server
Start the API (and static asset host) with:
```bash
node backend/server.js
```
The server will listen on `HOST:PORT` and serve both `/api/*` routes and the compiled frontend from `backend/public/`.

## Deployment Checklist
- [ ] Database reachable at `DATABASE_URL`
- [ ] Environment variables configured for the target environment
- [ ] Frontend built and copied into `backend/public`
- [ ] Stripe keys and webhook secret set (if payments are enabled)
- [ ] Health check (`/api/health`) returns `200`

## Troubleshooting
- **Static assets not loading:** ensure the build artifacts are present in `backend/public` and that the server has read access.
- **Authentication failures:** confirm `AUTH_TOKEN` is set consistently on the server and in client requests.
- **Stripe webhook errors:** verify `STRIPE_WEBHOOK_SECRET` matches the value in your Stripe dashboard and that the route `/api/stripe/webhook` is reachable from Stripe.

## Monitoring
After deployment, monitor server logs for startup errors, verify database connectivity, and test core flows (login, lead creation, quote generation, payment webhook) in the deployed environment.
