# 🏗️ OMEGA Build Guide

This document describes the official build workflow for OMEGA Synth.

## Prerequisites
- **CMake** (3.22+)
- **Ninjia** or **MSBuild** (Visual Studio 2022)
- **JUCE Framework** (included in `/JUCE`)
- **clap-juce-extensions** (included in `/third_party/clap-juce-extensions`, CLAP format — see *CLAP* below)

## CLAP

The CLAP binary (`omega_plugin_CLAP`) is generated via [free-audio/clap-juce-extensions](https://github.com/free-audio/clap-juce-extensions) (MIT, forkless — JUCE official 8.x does **not** include the CLAP format). Setup (gitignored, same convention as `/JUCE`):

```powershell
cd host/third_party
git clone --recursive https://github.com/free-audio/clap-juce-extensions
git -C clap-juce-extensions checkout 645ed2f  # "Compatibility with JUCE 8.0.11 (#169)" — required for JUCE 8.0.11+
git -C clap-juce-extensions submodule update --recursive
```

> ⚠️ The tag `0.26.0` does **not** compile with JUCE 8.0.11+ (`juce_LegacyAudioParameter.cpp` was removed upstream); use commit `645ed2f` pinned above.

Build the CLAP explicitly (it is **not** part of the default `all` target):

```powershell
cmake --build build --config Release --target omega_plugin_CLAP
# artefacto: build/src/Plugin/omega_plugin_artefacts/Release/CLAP/OMEGA Synth.clap
```

The CLAP shares the `omega_plugin` target's sources, embedded WebView2 editor and state (CLAP_ID `com.abd-ia.omega` — same as the VST3 `BUNDLE_ID`).
## Standard Workflow (CLI)

The recommended way to build OMEGA is using the automated script:

```powershell
./build_auto.bat
```

This script will:
0. Run static fail-fast validations: `check_bat_parens` (parens in `.bat` blocks), RPC contract (`tests/rpc_contract.test.ts`), manifest parity (`check_manifest_parity.mjs` + regenerate ACEMM_CATALOG) and the canonical-defaults guard (`check_canonical_defaults.mjs` — literals `'industrial'/1/0.5/100/120/420/12` must only live in `DEFAULT_*` constants).
1. Typecheck and bundle the WebUI (`tsc` + `esbuild` → `host/ui/bundle.js`, baking the current build number into `OMEGA_BUILD_ID`).
2. **Validate the freshly generated bundle** with `npm run test:smoke` (see *Bundle smoke tests* below) — any arity or visual-parity break aborts the build before compiling C++.
3. Initialize/Update the CMake cache and build `omega_core` / `omega_dsp` / `omega_plugin` (VST3/Standalone).
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

### Bundle smoke tests (`host/ui`)

After regenerating `host/ui/bundle.js`, validate the **real compiled artifact** (not the sources) before shipping:

```powershell
cd host/ui
npm run test:smoke
```

Runs sequentially (`&&` — one fresh vitest process per file, avoiding transform/cache contention). Triple validation — guard + arity + parity:

1. `tests/canonicalDefaults.test.ts` — canonical-defaults guard for host/ui consumers (4 tests).
2. `tests/bundle-arity.smoke.test.ts` — loads the real `bundle.js` and verifies the `ModuleRenderer(content, options)` 2-arg path end-to-end (4 tests).
3. `tests/renderers/visualParity.test.ts` — junction byte-identity + editor/runtime cell parity + unified chassis + golden snapshot (8 tests).

This is the same step `build_auto.bat` runs after `esbuild`; it fails the build (exit 1) if the bundle is broken.

## Troubleshooting
- **Clean Build**: If you experience weird linking errors, delete the `build/` directory and run `build_auto.bat` again.
- **Linter Errors**: The project uses modern C++17 features. Ensure your IDE is using the correct standard.
