@echo off
echo [OMEGA-EDITOR] Starting local Next.js dev server on port 3100...
cd /d "%~dp0.."
npm run dev -- -p 3100
pause
