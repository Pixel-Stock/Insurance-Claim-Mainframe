@echo off
echo ========================================
echo Insurance Claims Validation System
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 2: Generating test data...
call npm run gen-data
if errorlevel 1 (
    echo ERROR: Data generation failed
    pause
    exit /b 1
)

echo.
echo Step 3: Starting services...
echo Bridge API will start on http://localhost:3000
echo React app will start on http://localhost:5173
echo.
echo Press Ctrl+C to stop the servers
echo.
call npm run dev
