# OMEGA RPC Controllers Map (Era 7.2.3)

## 🏗️ Architecture Overview
The RPC layer follows a decoupled **Command-Dispatcher** pattern. Commands arriving from the WebView (JSON) are routed by the `RpcCommandDispatcher` to specialized controllers.

## 📂 Controller Domains

### 1. Base / Infrastructure
Found in `src/UI/Controllers/Base/`
- **`RpcCommandDispatcher.h`**: The central routing hub.
- **`RpcBaseController.h`**: Base class providing standard JSON-RPC response helpers.

### 2. System Layer
Found in `src/UI/Controllers/System/`
- **`RpcSystemController`**: Handles the application lifecycle and global settings.
  - Commands: `uiReady`, `exit`, `getSystemSettings`, `setSystemSetting`, `systemAction`.

### 3. Library & Metadata
Found in `src/UI/Controllers/Library/`
- **`RpcMetadataController`**: The authoritative source for engine and plugin capabilities.
  - Commands: `getMetadata`, `getInventory`, `getUiSchemas`, `getSampleRate`, `getTempo`.
- **`RpcPresetController`**: Manages the persistence and discovery of patches.
  - Commands: `getPresets`, `loadPreset`, `savePreset`, `newPreset`.

### 4. Runtime Layer
Found in `src/UI/Controllers/Runtime/`
- **`RpcParameterController`**: High-frequency parameter updates (V-Sliders, Knobs).
  - Commands: `setParameter`, `getParameter`.
- **`RpcTelemetryController`**: Real-time signal and LED feedback.
  - Commands: `subscribeTelemetry`, `unsubscribeTelemetry`.
- **`RpcModulationController`**: Patchbay and modulation matrix routing.
  - Commands: `addConnection`, `removeConnection`, `getMatrix`.

---
*OMEGA — Engineering Standard V7.2.3 — RPC Governance Mapping*
