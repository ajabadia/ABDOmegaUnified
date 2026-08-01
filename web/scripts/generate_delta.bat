@echo off
REM OMEGA Phase Delta Report Generator (Batch version)
REM Usage: generate_delta.bat

setlocal enabledelayedexpansion

echo ======================================================================
echo OMEGA PHASE DELTA REPORT GENERATOR (BATCH)
echo ======================================================================
echo.

set OUTPUT=delta_report_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt
set OUTPUT=%OUTPUT: =0%

echo # OMEGA Phase 7.1.b - Delta Report > %OUTPUT%
echo Generated: %date% %time% >> %OUTPUT%
echo. >> %OUTPUT%
echo --- >> %OUTPUT%
echo. >> %OUTPUT%

echo ## 1. Git Status >> %OUTPUT%
echo. >> %OUTPUT%
echo ``` >> %OUTPUT%
git status --short >> %OUTPUT% 2>nul
echo ``` >> %OUTPUT%
echo. >> %OUTPUT%

echo ## 2. Modified Files (last commit) >> %OUTPUT%
echo. >> %OUTPUT%
echo ``` >> %OUTPUT%
git diff --name-status HEAD~1 HEAD >> %OUTPUT% 2>nul
echo ``` >> %OUTPUT%
echo. >> %OUTPUT%

echo ## 3. TypeScript Check >> %OUTPUT%
echo. >> %OUTPUT%
echo Running TypeScript...
echo ``` >> %OUTPUT%
call npx tsc --noEmit >> %OUTPUT% 2>&1
if !errorlevel! equ 0 (
    echo PASS: TypeScript clean >> %OUTPUT%
) else (
    echo FAIL: TypeScript has errors >> %OUTPUT%
)
echo ``` >> %OUTPUT%
echo. >> %OUTPUT%

echo ## 4. ESLint Check >> %OUTPUT%
echo. >> %OUTPUT%
echo Running ESLint...
echo ``` >> %OUTPUT%
call npm run lint -- --quiet >> %OUTPUT% 2>&1
if !errorlevel! equ 0 (
    echo PASS: ESLint clean >> %OUTPUT%
) else (
    echo FAIL: ESLint has errors >> %OUTPUT%
)
echo ``` >> %OUTPUT%
echo. >> %OUTPUT%

echo ## 5. Build Check >> %OUTPUT%
echo. >> %OUTPUT%
echo Running build...
echo ``` >> %OUTPUT%
call npm run build >> %OUTPUT% 2>&1
if !errorlevel! equ 0 (
    echo PASS: Build successful >> %OUTPUT%
) else (
    echo FAIL: Build failed >> %OUTPUT%
)
echo ``` >> %OUTPUT%
echo. >> %OUTPUT%

echo ## 6. Manual Checklist >> %OUTPUT%
echo. >> %OUTPUT%
echo - [ ] Clipboard cross-doc tested >> %OUTPUT%
echo - [ ] Session restore (inc. history) tested >> %OUTPUT%
echo - [ ] Reset document tested >> %OUTPUT%
echo - [ ] Legacy purge verified >> %OUTPUT%
echo - [ ] Contract alignment (undo/redo) checked >> %OUTPUT%
echo. >> %OUTPUT%
echo --- >> %OUTPUT%
echo. >> %OUTPUT%
echo Add manual notes and paste this file for review. >> %OUTPUT%

echo.
echo ======================================================================
echo Report generated: %OUTPUT%
echo ======================================================================
echo.
notepad %OUTPUT%
