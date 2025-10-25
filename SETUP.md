# TreePro AI - Setup Guide

This guide will walk you through setting up TreePro AI from scratch.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ PostgreSQL 14+ installed ([Download](https://www.postgresql.org/download/))
- ✅ Git installed ([Download](https://git-scm.com/))
- ✅ A code editor (VS Code recommended)

## Step 1: Clone or Download the Project

```bash
# If using Git
git clone <repository-url>
cd treepro-ai

# Or download and extract the ZIP file
```

## Step 2: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## Step 3: Get API Keys

### Google Gemini API Key (Required)

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy your API key

### Google Maps API Key (Required)

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
4. Go to Credentials → Create Credentials → API Key
5. Copy your API key

## Step 4: Configure Environment Variables

### Frontend Configuration

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your keys
nano .env  # or use your preferred editor
```

Your `.env` should look like:
```env
VITE_GEMINI_API_KEY=AIzaSyC...your_actual_key
VITE_GOOGLE_MAPS_KEY=AIzaSyD...your_actual_key
```

### Backend Configuration

```bash
# Copy the example file
cd backend
cp .env.example .env

# Edit backend/.env
nano .env
```

Your `backend/.env` should look like:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/treeproai
PORT=5000
NODE_ENV=development
```

**Note:** Replace `yourpassword` with your PostgreSQL password.

## Step 5: Set Up PostgreSQL Database

### Start PostgreSQL

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
```

**Windows:**
- Start PostgreSQL from the Services app

### Create Database

```bash
# Create the database
createdb treeproai

# Initialize with schema and sample data
psql -d treeproai -f backend/init.sql
```

### Verify Database Setup

```bash
# Check if database exists
psql -l | grep treeproai

# Check if tables were created
psql -d treeproai -c "\dt"

# Check sample data
psql -d treeproai -c "SELECT COUNT(*) FROM customers;"
```

You should see 4 customers.

## Step 6: Verify Setup

Run the verification script:

```bash
node verify-setup.js
```

This will check:
- ✅ Node.js and npm versions
- ✅ PostgreSQL installation and status
- ✅ Environment files
- ✅ Dependencies
- ✅ Database setup
- ✅ Required files

Fix any errors or warnings before proceeding.

## Step 7: Start the Application

### Option A: Manual Start (Recommended for first time)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Wait for: `Backend server running on http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Wait for: `Local: http://localhost:3000`

### Option B: Automated Start

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
start.bat
```

## Step 8: Access the Application

1. Open your browser to `http://localhost:3000`
2. You should see the TreePro AI login page
3. Login with any email and password (demo mode)
4. Explore the application!

## Troubleshooting

### "Cannot connect to database"

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux
```

### "Port 3000 already in use"

**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows (then use taskkill)
```

### "API key not found"

**Solution:**
- Verify `.env` file exists in root directory
- Check that keys don't have quotes around them
- Restart the dev server after changing `.env`

### "Module not found"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

cd backend
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors

**Solution:**
```bash
# Check DATABASE_URL format
# Should be: postgresql://username:password@host:port/database

# Test connection
psql -d treeproai -c "SELECT 1;"

# If connection fails, check PostgreSQL is running
# and credentials are correct
```

## Next Steps

Once your setup is complete:

1. **Explore the Dashboard** - View business metrics and recent activity
2. **Try AI Tree Estimator** - Upload tree photos for instant quotes
3. **Check AI Core** - See automated business insights
4. **Test Customer Portal** - Create a quote and view the public link
5. **Try Crew App** - Navigate to `/crew` for mobile crew interface

## Getting Help

If you encounter issues:

1. Run `node verify-setup.js` to diagnose problems
2. Check the [README.md](README.md) troubleshooting section
3. Review browser console for errors (F12)
4. Check backend terminal for error messages

## Production Deployment

For production deployment instructions, see [README.md](README.md#production-deployment).

---

**Congratulations! 🎉 Your TreePro AI setup is complete!**