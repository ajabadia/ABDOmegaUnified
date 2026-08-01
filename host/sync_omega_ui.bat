@echo off
setlocal enabledelayedexpansion

:: ═══════════════════════════════════════════════════════════════
:: OMEGA UI CORE SYNC SCRIPT (v1.1)
:: Source of Truth: ABDOmegaEditor
:: ═══════════════════════════════════════════════════════════════

set "SRC=%~dp0..\ABDOmegaEditor\src\omega-ui-core"
set "DST=%~dp0ui\omega-ui-core"

echo [SYNC] Syncing OMEGA UI Core from ABDOmegaEditor...

:: 1. Robocopy MIR
robocopy "%SRC%" "%DST%" /MIR /NJH /NJS /NDL /NC /NS /NP

:: 2. Inject DO NOT EDIT header and Normalize Imports (.js) via PowerShell
:: Updated Regex to handle both ./ and ../ paths for modular files
echo [SYNC] Injecting protection headers and normalizing imports...
powershell -ExecutionPolicy Bypass -File "%~dp0sync_omega_ui.ps1" -DstPath "%DST%"

:: 3. Sync Era 7 JSON Schema
echo [SYNC] Syncing Era 7 JSON Schema...
if not exist "%~dp0Resources\schemas" mkdir "%~dp0Resources\schemas"
copy /y "%~dp0..\ABDOmegaEditor\src\data\omega-schema-v7.json" "%~dp0Resources\schemas\omega-schema-v7.json" > nul

:: 4. Optional: Compile UI (if tsc is available)
cd /d "%~dp0ui"
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [BUILD] Compiling UI TypeScript...
    call npx tsc
)

echo [SYNC] Complete.
