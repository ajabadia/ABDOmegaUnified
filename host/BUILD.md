# 🏗️ OMEGA Build Guide

This document describes the official build workflow for OMEGA Synth.

## Prerequisites
- **CMake** (3.22+)
- **Ninjia** or **MSBuild** (Visual Studio 2022)
- **JUCE Framework** (included in `/JUCE`)

## Standard Workflow (CLI)

The recommended way to build OMEGA is using the automated script:

```powershell
./build_auto.bat
```

This script will:
1. Initialize/Update the CMake cache.
2. Build the `omega_core` and `omega_dsp` libraries.
3. Build the `omega_plugin` (VST3/Standalone).
4. Generate the final executable in `build/src/Plugin/omega_plugin_artefacts/Release/Standalone/OMEGA Synth.exe`.

## Advanced Build (Manual CMake)

If you prefer using CMake directly:

```powershell
# 1. Configuration
cmake -B build -G "Visual Studio 17 2022" -A x64

# 2. Build All
cmake --build build --config Release
```

## Running Tests

Automated tests use Catch2 and are located in `src/Tests`.

```powershell
# Build and run tests
cmake --build build --target omegatests --config Release
./build/src/Tests/Release/omegatests.exe
```

## Troubleshooting
- **Clean Build**: If you experience weird linking errors, delete the `build/` directory and run `build_auto.bat` again.
- **Linter Errors**: The project uses modern C++17 features. Ensure your IDE is using the correct standard.
