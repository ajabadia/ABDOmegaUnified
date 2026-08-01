@echo off
TITLE ABDOmega - Sintetizador Nativo C++ (Host)
echo ================================================================
echo  Iniciando Sintetizador Nativo ABDOmega (OMEGA_Synth.exe)
echo ================================================================
echo.

:: 0. Guardia pre-arranque: parentesis sin escapar en bloques .bat
call "%~dp0scripts\check_bat_parens.cmd"
if errorlevel 1 (
    echo [ERROR] Validacion de scripts .bat fallida - abortando arranque.
    exit /b 1
)

cd /d "%~dp0host"
start "" "OMEGA_Synth.exe"

echo [OK] Sintetizador Nativo ABDOmega ejecutandose en ventana de escritorio.
