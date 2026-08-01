@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

:: OMEGA Industrial Linter (Era 7.2.3)
:: Performs deep static analysis on Modules and Core

echo [OMEGA] Initializing Code Auditor...

:: --- LLVM Toolchain Resolution ---
:: Priority: 1) LLVM_HOME env var | 2) known local install | 3) clang-tidy on PATH
set "LLVM_BIN="
set "CLANG_TIDY="
set "REPORT_FILE=lint_report.txt"

if not "%LLVM_HOME%"=="" (
    set "LLVM_HOME_NORM=%LLVM_HOME%"
    if "!LLVM_HOME_NORM:~-1!"=="\" set "LLVM_HOME_NORM=!LLVM_HOME_NORM:~0,-1!"
    set "LLVM_BIN=!LLVM_HOME_NORM!\bin"
    echo [INFO] LLVM_HOME set: !LLVM_BIN!
)

if not defined LLVM_BIN (
    set "LLVM_BIN=D:\desarrollos\ABDOmega\clang+llvm-22.1.4-x86_64-pc-windows-msvc\bin"
    echo [INFO] LLVM_HOME not set; using default install: !LLVM_BIN!
)

set "CLANG_TIDY=!LLVM_BIN!\clang-tidy.exe"

if not exist "!CLANG_TIDY!" (
    where clang-tidy >nul 2>&1
    if not errorlevel 1 (
        set "CLANG_TIDY=clang-tidy"
        echo [INFO] clang-tidy.exe found on PATH
    ) else (
        echo [ERROR] clang-tidy.exe not found. Set LLVM_HOME to the LLVM install root or add clang-tidy.exe to PATH.
        exit /b 1
    )
)

echo [OMEGA] Audit Started: %DATE% %TIME% > "%REPORT_FILE%"
echo --------------------------------------- >> "%REPORT_FILE%"

:: 1. Audit WASM Modules (ubicacion actual: repo-root/modules/<modulo>/<modulo>.cpp)
echo [OMEGA] Auditing WASM Modules...
REM cmd NO expande wildcards anidados en 'for %%f in (..\modules\*\*.cpp)'; usar dir /s /b
for /f "delims=" %%f in ('dir /s /b ..\modules\*.cpp') do (
    echo [INFO] Inspecting %%f...
    echo >> "%REPORT_FILE%"
    echo [MODULE] %%f >> "%REPORT_FILE%"
    echo ======================================= >> "%REPORT_FILE%"
    REM Added --checks and --header-filter for LLVM 22; -include wasm_compat.h como build_wasm.bat
    "!CLANG_TIDY!" "--checks=modernize-*,bugprone-*,performance-*,readability-*" "--header-filter=.*" "%%f" -- -target wasm32 -include ..\engine\bindings\wasm_compat.h -I ..\engine\include >> "%REPORT_FILE%" 2>&1
)

:: 2. Audit Core Engine (Key Components)
echo [OMEGA] Auditing Core Engine...
set "CORE_FILES=src\Core\Ace\Registry\AceCatalog.cpp src\Core\Ace\Validation\AceValidator.cpp src\Core\Wasm\Service\WasmModuleService.cpp"
set "WAMR_INC=build\_deps\wamr-src\core\iwasm\include"

for %%f in (%CORE_FILES%) do (
    echo [INFO] Inspecting %%f...
    echo >> "%REPORT_FILE%"
    echo [CORE] %%f >> "%REPORT_FILE%"
    echo ======================================= >> "%REPORT_FILE%"
    REM Added --checks and --header-filter for LLVM 22
    "!CLANG_TIDY!" "--checks=modernize-*,bugprone-*,performance-*,readability-*" "--header-filter=.*" "%%f" -- -std=c++20 -D_ALLOW_COMPILER_AND_STL_VERSION_MISMATCH -D_CRT_SECURE_NO_WARNINGS -I src/Core -I src/Engine -I JUCE/modules -I %WAMR_INC% >> "%REPORT_FILE%" 2>&1
)

echo --------------------------------------- >> "%REPORT_FILE%"
echo [OMEGA] Audit Finished. Report saved to %REPORT_FILE%
echo [OMEGA] Done.
