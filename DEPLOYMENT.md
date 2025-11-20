# TreePro AI - Deployment Guide

## Production Deployment Configuration

TreePro AI is configured for deployment on Replit's autoscale infrastructure.

### Deployment Settings

**Deployment Target:** `autoscale`  
**Build Command:** `pnpm run build:production`  
**Run Command:** `node backend/server.js`

### Build Process

The production build follows these steps:

1. **Install Dependencies**
   ```bash
   pnpm install
   cd backend && pnpm install
   ```

2. **Build Frontend**
   ```bash
   pnpm run build
   ```
   - Compiles React/TypeScript with Vite
   - Outputs to `dist/` directory
   - Includes code splitting and minification

3. **Copy to Backend**
   ```bash
   mkdir -p backend/public
   cp -r dist/* backend/public/
   ```
   - Creates `backend/public/` directory
   - Copies all built files from `dist/`

### Server Configuration

The backend server (`backend/server.js`) is configured to:

1. **Serve API Routes** - All `/api/*` routes handled by Express
2. **Serve Static Files** - Frontend assets from `backend/public/`
3. **SPA Fallback** - All non-API routes serve `index.html` for client-side routing

```javascript
// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

### Database Initialization

For fresh deployments, the database is initialized from `backend/init.sql`:

```bash
psql $DATABASE_URL -f backend/init.sql
```

This creates all 38 required tables with proper foreign key relationships.

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (automatically provided by Replit)
- `GEMINI_API_KEY` - Google Gemini API key for AI features
- `GOOGLE_MAPS_API_KEY` - Google Maps API key for location features

Optional (Stripe integration):
- `STRIPE_SECRET_KEY` - Automatically managed by Replit Stripe connector
- `STRIPE_WEBHOOK_SECRET` - Automatically managed by Replit Stripe connector

### Development vs Production

| Environment | Frontend | Backend | Database |
|------------|----------|---------|----------|
| **Development** | Vite dev server (port 5000) | Express API (port 3001) | PostgreSQL (development) |
| **Production** | Served by Express from `backend/public/` | Express (port from env) | PostgreSQL (production) |

### Deployment Checklist

Before deploying:

- [ ] All tests passing (`npm run test`)
- [ ] Database schema up to date (`backend/init.sql`)
- [ ] Environment variables configured
- [ ] Build script tested locally (`pnpm run build:production`)
- [ ] No console errors in frontend
- [ ] API endpoints verified
- [ ] Stripe webhook configured (if using payments)

### Troubleshooting

**Build fails with "directory does not exist"**
- Fixed: `backend/public/` directory is created during build
- Directory tracked in git via `.gitkeep` file

**Frontend not loading in production**
- Check: `backend/public/` contains built files
- Check: Express static serving configured
- Check: SPA fallback route configured

**Database errors on deployment**
- Ensure `backend/init.sql` is up to date
- Check all foreign key references are valid
- Verify PostgreSQL version compatibility (14+)

### Monitoring

After deployment:
1. Check server logs for startup errors
2. Verify `/api/health` endpoint responds
3. Test frontend loads at root URL
4. Verify database connection
5. Test critical user flows

### Scaling

The autoscale deployment automatically:
- Scales up during high traffic
- Scales down during low traffic
- Maintains zero downtime during deployments
- Handles SSL/TLS certificates automatically

### Support

For deployment issues:
1. Check server logs in Replit console
2. Verify environment variables are set
3. Test build script locally first
4. Review this deployment guide
