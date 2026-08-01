# OMEGA UI Architectural Map (Era 7.2.3)

## 🏗️ Directory Structure (Industrialized)

- **src/**: Pure TypeScript source code.
  - **Components/**: UI Widgets and Modular Views (Vanilla TS).
    - `ModuleBrowser.ts`, `ModulePatchModal.ts`, `ModulePatchbayMatrix.ts`, `PresetBrowser.ts`.
  - **Contracts/**: Authoritative UI/WASM contracts.
    - `ModuleContract.ts`, `schema_ids.ts`.
  - **Logic/**: Core Orchestration and State Management.
    - `ModuleManager.ts`: Main module lifecycle.
    - `ModuleRenderer.ts`: High-performance DOM rendering engine.
    - `ControlBinder.ts`: [NEW] Specialized interaction handler.
    - `UIManager.ts`: [NEW] Global UI/Modal/LCD orchestrator.
    - `InventoryStore.ts`, `SchemaStore.ts`: Metadata caching.
    - `RuntimeStores.ts`: Real-time state (Snapshots).
    - `Preferences.ts`, `Service.ts`: System-level logic.
  - **RPC/**: Communication Layer.
    - `OmegaRPC.ts`: Low-level bridge to C++.
    - `RpcCommandDispatcher.ts`: Command routing.
    - `OmegaLog.ts`: Engineering logging.
  - **Types/**: Canonical type definitions.
    - `OmegaTypes.ts`: ABI and Protocol schemas.
  - **Util/**: Shared helpers.
    - `RuntimeEventHub.ts`.
    - **`AssetResolver.ts`**: [ERA 7.2.3] Centralized module asset resolution.
  - `index.ts`: Unified Entry Point.
- **omega-ui-core/**: [SYNCED] Shared Design System (DO NOT EDIT).
- **dist/**: Compiled JavaScript output (Modular ESM).
- **fonts/**: Typography (`Inter`, `SevenSegment`, etc.).
- **css/**: Stylesheets organized by component.
  - `fonts.css`: [NEW] Local font definitions (Offline-first).
  - `modules.css`: [NEW] Industrial panel aesthetics.
  - `base.css`, `layout.css`, `effects.css`, etc.
- **legacy/**: [QUARANTINE] Deprecated assets and CSS from previous eras.
- `index.html`: Main container (Aseptic Root).

## 🔗 Dependencies & Sync

| Component | Source | Sync Method |
| :--- | :--- | :--- |
| `omega-ui-core` | `ABDSynthsWeb` | `sync_omega_ui.bat` |
| `omega_rpc.ts` | Local | Manual (Local SOT) |

## 🛠️ Build Pipeline

- **Compiler**: TypeScript (`tsc`).
- **Target**: ESNext (ESM).
- **Bundler**: None (Native ESM) or `esbuild` for production.

---
*OMEGA — Engineering Standard V7.2.3 — Industrial UI Mapping*
