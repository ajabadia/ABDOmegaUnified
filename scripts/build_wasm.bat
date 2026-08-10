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

echo [1/8] Verificando entorno Emscripten (em++)...
set EMXX=em++
where em++ >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\emsdk\upstream\emscripten\em++.exe" (
        set EMXX=C:\emsdk\upstream\emscripten\em++.exe
        echo   usando C:\emsdk\upstream\emscripten\em++.exe
    ) else (
        echo [ADVERTENCIA] em++ no encontrado en el PATH.
        echo Para compilar los modulos C++ a WASM debes instalar o activar Emscripten SDK ^(emsdk^).
        echo.
        echo Si ya tienes emsdk instalado, ejecuta 'emsdk_env.bat' antes de este script.
        goto END
    )
)

echo [2/8] Compilando modulo preexistente midi_in...
%EMXX% -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\midi_in\midi_in.cpp" -o "%OUTPUT_DIR%\midi_in.wasm"
copy /Y "%OUTPUT_DIR%\midi_in.wasm" "%~dp0..\modules\midi_in\midi_in.wasm" >nul

echo [3/8] Compilando modulo preexistente midi_trigger...
%EMXX% -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\midi_trigger\midi_trigger.cpp" -o "%OUTPUT_DIR%\midi_trigger.wasm"
copy /Y "%OUTPUT_DIR%\midi_trigger.wasm" "%~dp0..\modules\midi_trigger\midi_trigger.wasm" >nul

echo [4/8] Compilando modulo preexistente omega_lab_monitor...
%EMXX% -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\omega_lab_monitor\omega_lab_monitor.cpp" -o "%OUTPUT_DIR%\omega_lab_monitor.wasm"
copy /Y "%OUTPUT_DIR%\omega_lab_monitor.wasm" "%~dp0..\modules\omega_lab_monitor\omega_lab_monitor.wasm" >nul

echo [5/8] Compilando modulo midi_2_cv...
%EMXX% -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\midi_2_cv\midi_2_cv.cpp" -o "%OUTPUT_DIR%\midi_2_cv.wasm"
copy /Y "%OUTPUT_DIR%\midi_2_cv.wasm" "%~dp0..\modules\midi_2_cv\midi_2_cv.wasm" >nul

echo [6/8] Compilando modulo 440demo...
%EMXX% -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\440demo\440demo.cpp" -o "%OUTPUT_DIR%\440demo.wasm"
REM El host C++ carga el .wasm desde modules/<id>/ (junction host/Resources/modules) — sincronizar la copia canónica.
copy /Y "%OUTPUT_DIR%\440demo.wasm" "%~dp0..\modules\440demo\440demo.wasm" >nul

echo [7/8] Compilando cadena de voz P0: vco, vcf, adsr, vca, lfo...
for %%M in (vco vcf adsr vca lfo) do (
    echo   - %%M
    %EMXX% -O3 -s WASM=1 -s SIDE_MODULE=1 -I"%ENGINE_INC%" -include "%BINDINGS_INC%\wasm_compat.h" "%~dp0..\modules\%%M\%%M.cpp" -o "%OUTPUT_DIR%\%%M.wasm"
    if errorlevel 1 (
        echo [ERROR] Fallo la compilacion del modulo %%M.
        exit /b 1
    )
    copy /Y "%OUTPUT_DIR%\%%M.wasm" "%~dp0..\modules\%%M\%%M.wasm" >nul
)

echo [8/8] Verificando binarios en runtime (node)...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [SKIP] node no encontrado en el PATH - omitiendo verificacion runtime.
    goto END
)
node "%~dp0verify_440demo_runtime.mjs"
if %errorlevel% neq 0 (
    echo [ERROR] La verificacion runtime del 440demo fallo - revisa modules\440demo\440demo.cpp.
    exit /b 1
)
node "%~dp0verify_midi_2_cv_runtime.mjs"
if %errorlevel% neq 0 (
    echo [ERROR] La verificacion runtime del midi_2_cv fallo - revisa modules\midi_2_cv\midi_2_cv.cpp.
    exit /b 1
)
node "%~dp0verify_voice_chain_runtime.mjs"
if %errorlevel% neq 0 (
    echo [ERROR] La verificacion runtime de la cadena de voz fallo - revisa modules\{vco,vcf,adsr,vca,lfo}\*.cpp.
    exit /b 1
)

:END
echo.
echo ================================================================
echo  Compilacion de modulos WASM preexistentes finalizada (+ verificacion runtime 440demo).
echo ================================================================
