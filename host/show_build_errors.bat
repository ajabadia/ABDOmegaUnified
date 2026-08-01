@echo off
setlocal enabledelayedexpansion

:: OMEGA Build Error Collector
:: Locates Visual Studio vcvarsall.bat via VS_VCVARSALL env, vswhere, or known install

echo [OMEGA] Locating Visual Studio development environment...

:: --- Visual Studio Toolchain Resolution ---
:: Priority: 1) VS_VCVARSALL env var | 2) vswhere autodetection | 3) known local install
set "VCVARSALL="
set "PF86=%ProgramFiles(x86)%"

if not "%VS_VCVARSALL%"=="" (
    set "VCVARSALL=%VS_VCVARSALL%"
    echo [INFO] Using VS_VCVARSALL: !VCVARSALL!
)

if not defined VCVARSALL (
    set "VSWHERE=!PF86!\Microsoft Visual Studio\Installer\vswhere.exe"
    if exist "!VSWHERE!" (
        for /f "usebackq tokens=*" %%i in (`"!VSWHERE!" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
            set "VS_INSTALL=%%i"
        )
        if defined VS_INSTALL (
            set "VCVARSALL=!VS_INSTALL!\VC\Auxiliary\Build\vcvarsall.bat"
            echo [INFO] vswhere located VS at: !VS_INSTALL!
        )
    )
)

if not defined VCVARSALL (
    set "VCVARSALL=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvarsall.bat"
    echo [INFO] Using default install: !VCVARSALL!
)

if not exist "!VCVARSALL!" (
    echo [ERROR] vcvarsall.bat not found at !VCVARSALL!
    echo [INFO] Set VS_VCVARSALL to the full path of your vcvarsall.bat or install the VS C++ workload.
    exit /b 1
)

call "!VCVARSALL!" x64
cd build_nmake
nmake > ..\full_build_errors.txt 2>&1
