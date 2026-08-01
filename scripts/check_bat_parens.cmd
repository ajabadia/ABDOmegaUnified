@echo off
setlocal
REM ============================================================
REM  check_bat_parens.cmd - Guardia pre-arranque de scripts .bat
REM  HIBRIDO (default):
REM   - Si node o el escaner faltan: [WARN] y continua (exit 0).
REM   - Si el escaner detecta parentesis sin escapar: [ERROR] y
REM     aborta (exit 1).
REM  MODO /strict (para build_auto.bat, que exige node):
REM   - Si node o el escaner faltan: [ERROR] y aborta (exit 1).
REM  Uso: call "%~dp0check_bat_parens.cmd" [/strict]
REM  Nota: %~dp0 apunta a scripts\, el escaner vive junto a este .cmd.
REM ============================================================

set "STRICT="
if /i "%~1"=="/strict" set "STRICT=1"

where node >nul 2>&1
if errorlevel 1 (
    if defined STRICT (
        echo [ERROR] node no encontrado en PATH - necesario para check_bat_parens.mjs.
        exit /b 1
    )
    echo [WARN] node no encontrado en PATH - no se puede validar scripts .bat. Continuando...
    exit /b 0
)

if not exist "%~dp0check_bat_parens.mjs" (
    if defined STRICT (
        echo [ERROR] Escaner %~dp0check_bat_parens.mjs no encontrado - no se puede validar.
        exit /b 1
    )
    echo [WARN] Escaner %~dp0check_bat_parens.mjs no encontrado - no se puede validar. Continuando...
    exit /b 0
)

node "%~dp0check_bat_parens.mjs"
if errorlevel 1 (
    echo [ERROR] check_bat_parens.mjs detecto parentesis sin escapar en bloques .bat - abortando arranque.
    exit /b 1
)

echo [OK] Scripts .bat validados.
exit /b 0
