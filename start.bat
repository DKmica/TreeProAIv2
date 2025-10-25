@echo off
echo TreePro AI - Starting Development Environment
echo ================================================

REM Check if .env exists
if not exist .env (
    echo Error: .env file not found!
    echo Please copy .env.example to .env and add your API keys
    exit /b 1
)

if not exist backend\.env (
    echo Error: backend\.env file not found!
    echo Please copy backend\.env.example to backend\.env and configure database
    exit /b 1
)

REM Check if database exists
psql -U postgres -lqt | findstr /C:"treeproai" >nul
if errorlevel 1 (
    echo Database 'treeproai' not found. Creating...
    createdb -U postgres treeproai
    echo Database created
    
    echo Running database initialization...
    psql -U postgres -d treeproai -f backend\init.sql
    echo Database initialized with sample data
)

REM Install dependencies if needed
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

if not exist backend\node_modules (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

echo.
echo All checks passed!
echo.
echo Starting servers...
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start backend
start "TreePro Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start frontend
start "TreePro Frontend" cmd /k "npm run dev"

echo.
echo Servers started in separate windows
echo Close the windows to stop the servers