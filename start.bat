@echo off
echo ========================================
echo   Razorpay Live Payment - Quick Start
echo ========================================
echo.

echo [1/2] Installing dependencies...
cd server
call npm install

echo.
echo [2/2] Starting server...
echo.
echo ========================================
echo   ⚠️  LIVE MODE - Real Payments!
echo ========================================
echo.
echo   Open: http://localhost:3000
echo.
echo ========================================
echo.

node server.js