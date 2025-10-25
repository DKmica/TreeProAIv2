# TreePro AI - Quick Start

## 🚀 First Time Setup (5 minutes)

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Edit .env files and add your API keys
# - VITE_GEMINI_API_KEY (get from https://aistudio.google.com/apikey)
# - VITE_GOOGLE_MAPS_KEY (get from https://console.cloud.google.com/)
# - DATABASE_URL in backend/.env

# 4. Create database
createdb treeproai
psql -d treeproai -f backend/init.sql

# 5. Verify setup
npm run verify
```

## 🏃 Daily Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
npm run dev

# Browser
# Open http://localhost:3000
```

## 🔑 Login

- **Email:** any email (demo mode)
- **Password:** any password (demo mode)

## 📍 Key URLs

- **Main App:** `http://localhost:3000`
- **Crew App:** `http://localhost:3000/#/crew`
- **Customer Portal:** `http://localhost:3000/#/portal/quote/:id`
- **Backend API:** `http://localhost:5000/api`

## 🎯 Quick Feature Test

1. **Dashboard** - View business overview
2. **AI Tree Estimator** - Upload tree photo → Get instant quote
3. **AI Core** - Click "Generate Insights" → See recommendations
4. **Quotes** - Create quote → Click "Public Link" → Share with customer
5. **Crew** - Go to `/crew` → View jobs → Clock in/out

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Port in use | `lsof -ti:3000 \| xargs kill -9` |
| DB connection error | Check PostgreSQL is running: `pg_isready` |
| API key error | Verify `.env` file exists and has valid keys |
| Module not found | `rm -rf node_modules && npm install` |

## 📚 Documentation

- **Full Setup:** [SETUP.md](SETUP.md)
- **Features:** [README.md](README.md)
- **Troubleshooting:** [README.md#troubleshooting](README.md#troubleshooting)

## 🆘 Need Help?

```bash
# Run verification
npm run verify

# Check logs
# - Backend: Terminal 1
# - Frontend: Terminal 2  
# - Browser: F12 → Console
```

---

**Happy coding! 🌲**