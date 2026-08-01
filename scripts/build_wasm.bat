@echo off
TITLE ABDOmegaUnified - WASM Module Compiler
echo ================================================================
echo  ABDOmegaUnified WASM Module Compiler (Emscripten / em++)
echo ================================================================
echo.

set OUTPUT_DIR=%~dp0..\web\public\wasm
set ENGINE_INC=%~dp0..\engine\include
set BINDINGS_INC=%~dp0..\engine\bindings

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo [1/4] Verificando entorno Emscripten (em++)...
where em++ >nul 2>nul
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] em++ no encontrado en el PATH.
    echo Para compilar los modulos C++ a WASM debes instalar o activar Emscripten SDK ^(emsdk^).
    echo.
    echo Si ya tienes emsdk instalado, ejecuta 'emsdk_env.bat' antes de este script.
    goto END
)

echo [2/4] Compilando modulo preexistente midi_in...
em++ -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\midi_in\midi_in.cpp" -o "%OUTPUT_DIR%\midi_in.wasm"

echo [3/4] Compilando modulo preexistente midi_trigger...
em++ -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\midi_trigger\midi_trigger.cpp" -o "%OUTPUT_DIR%\midi_trigger.wasm"

echo [4/4] Compilando modulo preexistente omega_lab_monitor...
em++ -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\omega_lab_monitor\omega_lab_monitor.cpp" -o "%OUTPUT_DIR%\omega_lab_monitor.wasm"

:END
echo.
echo ================================================================
echo  Compilacion de modulos WASM preexistentes finalizada.
echo ================================================================
