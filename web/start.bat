@echo off
SET PORT=3035
echo.
echo ==========================================
echo    OMEGA MANIFEST EDITOR - INICIO LOCAL
echo ==========================================
echo.

echo [0/3] Comprobando si el puerto %PORT% esta ocupado...
FOR /F "tokens=5" %%P IN ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') DO (
    echo [0/3] Proceso encontrado: PID %%P. Terminando...
    taskkill /F /PID %%P >nul 2>&1
)
echo [0/3] Puerto %PORT% disponible.

IF NOT EXIST node_modules (
    echo [1/3] Instalando dependencias necesarias...
    call npm install
) ELSE (
    echo [1/3] Dependencias ya instaladas.
)

echo [2/3] Iniciando servidor en puerto %PORT%...
start /b npm run dev -- -p %PORT%

echo [3/3] Abriendo navegador en http://localhost:%PORT%...
timeout /t 5 /nobreak >nul
start http://localhost:%PORT%

echo.
echo Herramienta lista y corriendo en segundo plano.
echo Presiona Ctrl+C en esta ventana para detener el servidor.
echo.
pause
