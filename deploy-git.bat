@echo off
echo ========================================
echo   Deploy to GitHub & Railway
echo ========================================
echo.

echo [1/5] Initializing Git...
git init

echo [2/5] Adding files...
git add .

echo [3/5] Committing...
git commit -m "Razorpay live payment integration"

echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo.
echo   1. Create a repository on GitHub:
echo      https://github.com/new
echo.
echo   2. Then run these commands:
echo.
echo      git remote add origin https://github.com/YOUR_USERNAME/razorpay-app.git
echo      git push -u origin main
echo.
echo   3. Go to Railway and deploy:
echo      https://railway.app
echo.
echo ========================================
echo.

pause