@echo off
setlocal enabledelayedexpansion
echo ========================================
echo OMEGA Synth Automated Build
echo ========================================
echo.

:: 0. Validacion estatica: parentesis sin escapar en bloques .bat (preventivo, fix #714)
echo 0. Validando scripts .bat - parentesis en bloques multilinea...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] node no encontrado en PATH - necesario para check_bat_parens.mjs.
    exit /b 1
)
if not exist "%~dp0..\scripts\check_bat_parens.mjs" (
    echo [ERROR] Escaner scripts\check_bat_parens.mjs no encontrado - no se puede validar.
    exit /b 1
)
node "%~dp0..\scripts\check_bat_parens.mjs"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] check_bat_parens.mjs detecto parentesis sin escapar en bloques .bat - abortando build.
    exit /b 1
)
echo [OK] Scripts .bat validados.

:: 1. Intentar localizar CMake localmente primero
set "CMAKE_PATH=cmake"
set "LOCAL_CMAKE=%~dp0CMake\CMake\bin\cmake.exe"

if exist "%LOCAL_CMAKE%" (
    set "CMAKE_PATH=%LOCAL_CMAKE%"
    echo [INFO] CMake LOCAL localizado en: !CMAKE_PATH!
) else (
    set "VSWHER_EXE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
    if exist "%VSWHER_EXE%" (
        for /f "usebackq tokens=*" %%i in (`"%VSWHER_EXE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.CMake.Project -property installationPath`) do (
            set "VS_PATH=%%i"
            set "POTENTIAL_CMAKE=!VS_PATH!\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
            if exist "!POTENTIAL_CMAKE!" (
                set "CMAKE_PATH=!POTENTIAL_CMAKE!"
                echo [INFO] CMake VS localizado en: !CMAKE_PATH!
            )
        )
    )
)

:: 2. Verificar si cmake es ejecutable
"%CMAKE_PATH%" --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo encontrar CMake.
    exit /b 1
)

:: 3. Leer/Incrementar version de Build
set "VERSION_FILE=build_no.txt"
if not exist %VERSION_FILE% echo 0 > %VERSION_FILE%
set /p build_no=<%VERSION_FILE%
set /a build_no=%build_no% + 1
echo %build_no% > %VERSION_FILE%

echo #define OMEGA_BUILD_VERSION "%build_no%" > "src/Core/BuildVersion.h"
echo #define OMEGA_BUILD_TIMESTAMP "%DATE% %TIME%" >> "src/Core/BuildVersion.h"

:: 4. Sincronizar UI Core (Era 7.2.3 Parity)
echo.
echo 0. Sincronizando OMEGA UI Core...
call sync_omega_ui.bat

echo.
echo 0.5 Validando Contratos RPC (Vitest)...
pushd ui
call npx vitest run tests/rpc_contract.test.ts || (echo [ERROR] Contrato RPC VIOLADO. Abortando build. & popd & exit /b 1)
popd

echo.
echo 1. Compilando y Empaquetando WebUI...
pushd ui
call npx --package typescript tsc -p tsconfig.json || (popd & exit /b 1)
echo [INFO] Generando bundle aséptico para Era 7.2.3 (Build #%build_no%)...
call npx -y esbuild src/index.ts --bundle --outfile=bundle.js --platform=browser --target=es2022 --define:window.OMEGA_BUILD_ID=\"%build_no%\" || (popd & exit /b 1)
popd

:: 4. Configurar y Compilar
set BUILD_DIR=build
if not exist %BUILD_DIR% mkdir %BUILD_DIR%

echo.
echo 1. Configurando proyecto...
"%CMAKE_PATH%" -B %BUILD_DIR% -A x64 -DBUILD_SHARED_LIBS=OFF
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Error en la configuracion de CMake.
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Compilando OMEGA Synth (Release)...
"%CMAKE_PATH%" --build %BUILD_DIR% --config Release --target omega_plugin_Standalone
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] La compilacion ha fallado.
    exit /b %ERRORLEVEL%
)

:: 5. Mover ejecutable
echo.
echo 3. Finalizando...
set "EXE_SRC=build\src\Plugin\omega_plugin_artefacts\Release\Standalone\OMEGA Synth.exe"

if exist "%EXE_SRC%" (
    echo [INFO] Encontrado ejecutable en: %EXE_SRC%
    copy /Y "%EXE_SRC%" "OMEGA_Synth.exe" >nul
    echo.
    echo ========================================
    echo BUILD EXITOSA! Build #%build_no%
    echo Ejecutable: OMEGA_Synth.exe
    echo ========================================
    exit /b 0
) else (
    echo [ERROR] No se encontro el .exe compilado en: %EXE_SRC%
    exit /b 1
)
