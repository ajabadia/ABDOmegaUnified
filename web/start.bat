@echo off
TITLE OMEGA Manifest Editor - Dev Server Unico (Port 6789)
SET PORT=6789
SET EDITOR_PATH=/en/editor
echo ================================================================
echo    OMEGA MANIFEST EDITOR - VIA DEV SERVER UNICO (6789)
echo ================================================================
echo.

:: 0. Guardia pre-arranque: parentesis sin escapar en bloques .bat
call "%~dp0..\scripts\check_bat_parens.cmd"
if errorlevel 1 (
    echo [ERROR] Validacion de scripts .bat fallida - abortando arranque.
    exit /b 1
)

:: 0b. Guardia pre-arranque: node_modules integro.
:: Sin historial, un package.json corrupto (bytes nulos) rompe la resolucion
:: de modulos y el dev server no arranca. Fallar aqui, no 30s despues.
call "%~dp0..\scripts\check_node_modules.cmd"
if errorlevel 1 (
    echo [ERROR] node_modules corrupto - abortando arranque.
    exit /b 1
)

:: Next.js solo permite UN 'next dev' por proyecto (lockfile .next/dev).
:: El Manifest Editor es una RUTA del mismo servidor (/en/editor), no un
:: servidor aparte. Si el dev server de 6789 ya esta corriendo, no se
:: lanza otro; solo se abre el editor.

echo [1/3] Comprobando si el dev server ya corre en el puerto %PORT%...
SET SERVER_UP=0
FOR /F "tokens=5" %%P IN ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') DO (
    SET SERVER_UP=1
)

IF "%SERVER_UP%"=="1" (
    echo [1/3] Dev server ya activo en el puerto %PORT%. No se lanza otro servidor.
) ELSE (
    echo [1/3] Dev server no detectado. Lanzandolo en el puerto %PORT%...
    cd /d "%~dp0"
    start /b npm run dev -- -p %PORT%
    timeout /t 6 /nobreak >nul
)

echo [2/3] Abriendo Manifest Editor en http://localhost:%PORT%%EDITOR_PATH%...
start http://localhost:%PORT%%EDITOR_PATH%

echo [3/3] Listo.
echo.
echo Nota: el Manifest Editor no es un servidor separado; es la ruta
echo %EDITOR_PATH% del dev server unico en el puerto %PORT%.
echo.
pause
