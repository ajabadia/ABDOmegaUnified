@echo off
setlocal enabledelayedexpansion

:: ═══════════════════════════════════════════════════════════════
:: OMEGA SYSTEM - WORKSPACE WATCHDOG LAUNCHER (Era 7.2.3)
:: ═══════════════════════════════════════════════════════════════

echo.
echo ==========================================================
echo    OMEGA - LANZADOR DE SINCRONIZACION BIDIRECCIONAL
echo ==========================================================
echo.

echo Selecciona el directorio que deseas monitorear y sincronizar:
echo [1] Directorio de Desarrollo de Plugins (Recomendado)
echo     =^> %~dp0..\..\ABDOmega plugins\modules
echo [2] Directorio de Recursos de Ejecucion del Sintetizador
echo     =^> %~dp0..\..\ABDOmega\Resources\modules
echo.

set /p OPTION="Introduce opcion [1 o 2, por defecto 1]: "

if "%OPTION%"=="2" (
    set "TARGET_DIR=%~dp0..\..\ABDOmega\Resources\modules"
) else (
    set "TARGET_DIR=%~dp0..\..\ABDOmega plugins\modules"
)

echo.
echo [WATCHDOG] Iniciando monitorizacion bidireccional sobre:
echo            %TARGET_DIR%
echo.

node "%~dp0..\omega-watchdog.mjs" "%TARGET_DIR%"

pause
