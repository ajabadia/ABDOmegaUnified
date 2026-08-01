@echo off
setlocal enabledelayedexpansion

:: OMEGA Plugin SDK - Build System
:: (c) 2026 ABD OMEGA

echo [OMEGA] Building Plugins...

set "SDK_DIR=%~dp0.."
set "PLUGIN_SRC=%SDK_DIR%\src\WasmPlugins"
set "PLUGIN_OUT=%SDK_DIR%\Resources\modules"

if not exist "%PLUGIN_OUT%" mkdir "%PLUGIN_OUT%"

:: 1. Check for Clang
set "CLANG_CMD=clang"

:: Priority 1: User-provided local LLVM path
set "LOCAL_LLVM=D:\desarrollos\ABDOmega\clang+llvm-22.1.4-x86_64-pc-windows-msvc\bin\clang.exe"
if exist "!LOCAL_LLVM!" (
    set "CLANG_CMD=!LOCAL_LLVM!"
    echo [INFO] Using Local LLVM 22.1.4: !CLANG_CMD!
) else (
    :: Priority 2: Standard PATH check
    where !CLANG_CMD! >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [INFO] Local LLVM not found. Searching for .NET Emscripten SDK...
        set "DOTNET_CLANG=C:\Program Files\dotnet\packs\Microsoft.NET.Runtime.Emscripten.3.1.56.Sdk.win-x64\9.0.14\tools\bin\clang.exe"
        if exist "!DOTNET_CLANG!" (
            set "CLANG_CMD=!DOTNET_CLANG!"
            echo [INFO] Using .NET Emscripten Clang: !CLANG_CMD!
        ) else (
            echo [ERROR] 'clang' not found.
            exit /b 1
        )
    )
)

echo [INFO] Using Clang: "!CLANG_CMD!"

:: 2. Compile each .c and .cpp file
for %%f in ("%PLUGIN_SRC%\*.c" "%PLUGIN_SRC%\*.cpp") do (
    set "FILENAME=%%~nf"
    set "FILEEXT=%%~xf"
    echo [OMEGA] Compiling !FILENAME!!FILEEXT!...
    
    :: Determine Compiler
    set "COMPILER_CMD=!CLANG_CMD!"
    if "!FILEEXT!"==".cpp" (
        set "COMPILER_CMD=!SDK_DIR!\clang+llvm-22.1.4-x86_64-pc-windows-msvc\bin\clang++.exe"
        if not exist "!COMPILER_CMD!" set "COMPILER_CMD=clang++"
    )

    :: Determine Output Directory (Check if subfolder exists)
    set "OUT_DIR=%PLUGIN_OUT%"
    if exist "%PLUGIN_OUT%\!FILENAME!" (
        set "OUT_DIR=%PLUGIN_OUT%\!FILENAME!"
    )
    
    :: Compile to WASM using discovered Clang
    :: Added -fno-exceptions -fno-rtti for minimal C++ footprint
    "!COMPILER_CMD!" --target=wasm32 -O3 -nostdlib -fno-exceptions -fno-rtti -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined -o "!OUT_DIR!\!FILENAME!.wasm" "%%f"

    if exist "!OUT_DIR!\!FILENAME!.wasm" (
        echo [SUCCESS] !FILENAME! built as WASM in !OUT_DIR!
        
        :: Era 7 - Extract Contract JSON automatically
        if exist "%SDK_DIR%\scripts\extract_contract.js" (
            echo [OMEGA] Extracting Technical Contract...
            node "%SDK_DIR%\scripts\extract_contract.js" "!OUT_DIR!\!FILENAME!.wasm"
        )

        :: AOT Optimization if wamrc is present
        where wamrc >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo [OMEGA] Generating AOT...
            wamrc --target=x86_64 --format=aot -o "!OUT_DIR!\!FILENAME!.aot" "!OUT_DIR!\!FILENAME!.wasm"
        )
    ) else (
        echo [FAILED] !FILENAME! compilation error.
    )
)

echo [OMEGA] Build Process Finished.
