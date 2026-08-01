@echo off
REM OMEGA SYSTEM AUDIT WRAPPER (Era 7.2.3)
REM This is a convenience wrapper for the PowerShell audit script.

echo [OMEGA] Launching Audit Orchestrator...
powershell -ExecutionPolicy Bypass -File scripts\omega-audit.ps1
echo [OMEGA] Audit Finished.
pause
