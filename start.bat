@echo off
TITLE ABDOmega Unified Platform - Launcher (Port 6789)
echo ================================================================
echo  Iniciando ABDOmega Unified Dev Server en puerto 6789...
echo ================================================================
echo.

:: 0. Guardia pre-arranque: parentesis sin escapar en bloques .bat
call "%~dp0scripts\check_bat_parens.cmd"
if errorlevel 1 (
    echo [ERROR] Validacion de scripts .bat fallida - abortando arranque.
    exit /b 1
)

:: 1. Verificar Enlace Junction de Interfaz (host/ui -> web/public/host-ui)
if not exist "%~dp0web\public\host-ui" (
    echo [LINK] Creando Enlace Junction para mantener Fuente Unica de Verdad...
    cmd /c mklink /J "%~dp0web\public\host-ui" "%~dp0host\ui"
)

:: 1b. Verificar Enlace Junction de Módulos (modules -> web/public/modules)
if not exist "%~dp0web\public\modules" (
    echo [LINK] Creando Enlace Junction para Módulos Compartidos...
    cmd /c mklink /J "%~dp0web\public\modules" "%~dp0modules"
)

:: 2. Matar procesos anteriores en puertos 6789 y 3000
powershell -Command "Get-NetTCPConnection -LocalPort 6789, 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

:: 3. Abrir navegador en http://localhost:6789
start "" "http://localhost:6789"

:: 4. Lanzar servidor web Next.js en puerto 6789
cd /d "%~dp0web"
npx next dev -p 6789
