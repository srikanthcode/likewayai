@echo off
cd /d "C:\Users\Lenovo\my first app"
if exist ".next" rmdir /s /q ".next"
call npm run build
