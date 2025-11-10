@echo off
REM Demo Accounts Creation Script for Windows
REM Run this script to create demo accounts in Supabase for hackathon evaluation
REM
REM Usage: scripts\create-demo-accounts.bat

echo 🔄 Creating demo accounts...
node scripts/create-demo-accounts.js

echo.
echo 🎉 Demo account creation completed!
echo.
echo 📋 Demo Accounts Available:
echo    admin@consentire.io / admin123 (admin)
echo    user@consentire.io / user123 (user)
echo    org@consentire.io / org123 (organization)
echo    regulator@consentire.io / reg123 (regulator)
echo.
echo 🚀 You can now login at http://localhost:3000/login
pause