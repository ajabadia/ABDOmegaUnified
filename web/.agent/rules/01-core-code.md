# Core Code Standards (Next.js 16 + React 19 + Local-First)

## 🛠️ Stack
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Language**: TypeScript Strict
- **Web API**: File System Access API (Local Pickers)
- **Sincronización**: SSE Watchdog (Port 3001)

## ⚖️ Laws
1. **Guerra al Waterfall**: Use `Promise.all()` for independent asynchronous operations.
2. **Zero Barrel Imports**: Import directly from the source file. Do not use indexes for re-exporting.
3. **Local-First Safety**: Ensure robust error handling for browser File System permissions and handles.
4. **Fire Rule: Max 150 Lines**: Files should be specialized. Refactor files exceeding 150 lines unless they are configuration manifests or layout models.
5. **Types over Interfaces**: Use `type` for data structures (manifest layouts, schema nodes, coordinates).
6. **Strict Types**: Limit typescript escapes. Use custom types or explicit schema definitions. When using DOM experimental features, cast as `any` locally with comments.

## 📁 Structure
```
src/
  app/              # Next.js App Router (locale routing)
  components/       # Reusable layout controls and views
  features/         # Manifest Editor features (workbench, catalog, properties)
  hooks/            # IO & Editor hooks
  lib/              # Parsers, validator helpers, WASM bindings
  omega-ui-core/    # Shared CSS tokens and low-level premium widgets
```
