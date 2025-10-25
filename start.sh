#!/bin/bash

# TreePro AI Startup Script

echo "🌲 TreePro AI - Starting Development Environment"
echo "================================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.example to .env and add your API keys"
    exit 1
fi

if [ ! -f backend/.env ]; then
    echo "❌ Error: backend/.env file not found!"
    echo "📝 Please copy backend/.env.example to backend/.env and configure database"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ Error: PostgreSQL is not running!"
    echo "📝 Please start PostgreSQL first"
    exit 1
fi

# Check if database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw treeproai; then
    echo "📦 Database 'treeproai' not found. Creating..."
    createdb treeproai
    echo "✅ Database created"
    
    echo "📝 Running database initialization..."
    psql -d treeproai -f backend/init.sql
    echo "✅ Database initialized with sample data"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🚀 Starting servers..."
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID