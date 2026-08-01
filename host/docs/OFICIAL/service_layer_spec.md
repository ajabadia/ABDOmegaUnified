# OMEGA Service Layer Specification

## 1. Overview
The Service Layer provides a high-level, decoupled API for managing the OMEGA synthesis engine and preset lifecycle. It acts as a mediator between the Plugin Wrapper (`OmegaAudioProcessor`) and the internal DSP Core.

## 2. Key Components

### 2.1 EngineConfigManager
- **Location:** `SOURCE/Core/Service/EngineConfigManager.h`
- **Responsibility:** Translates high-level OMEGA parameters (e.g., `LAYERAMAINCUTOFF`) and entire `OmegaPreset` architectures into specific engine calls.
- **Key Methods:**
    - `applyPreset(const OmegaPreset& p)`: Configures oscillators, filters, and effects for 16 voices.
    - `updateParameter(const juce::String& id, float value)`: Thread-safe parameter updates during real-time processing.

### 2.2 PresetService
- **Location:** `SOURCE/Core/Service/PresetService.h`
- **Responsibility:** Orchestrates the loading and saving of presets using the `AceCatalog` and `OmegaPreset` serialization.
- **Key Methods:**
    - `loadPreset(const juce::File& file, OmegaPreset& out)`: Reads YAML and populates the `ValueTree`.
    - `createDefault(const juce::String& engineType)`: Factory for initial preset states.

## 3. Design Principles
- **JUCE-Free Core:** Services are designed to minimize JUCE dependencies, favoring standard C++ and PODs where possible.
- **Audio-Thread Safety:** `EngineConfigManager` uses non-blocking logic to ensure that parameter updates do not cause audio glitches.
- **Unified State:** All preset data is stored in a single `juce::ValueTree` within `OmegaPreset`, ensuring consistency across UI, Engine, and Disk.

## 4. Usage in Plugin
The `OmegaAudioProcessor` should not call engine methods directly. Instead:
1. It receives a parameter change from the host.
2. It delegates to `mEngineConfig.updateParameter()`.
3. The service handles the mapping to the specific voice or global effect.
## 5. RPC Controller Layer (WebUI Bridge)
As of Build #91, the monolithic `OmegaUiBridge` has been replaced by a **Router-Controller** pattern to improve maintainability:

### 5.1 RpcRouter
- **Role:** Central dispatcher for incoming JSON-RPC messages.
- **Delegation:** Routes requests to specialized controllers based on the `type` field.

### 5.2 Controllers
- **RpcPresetController:** Manages all preset and ACE catalog operations (via `PresetService`).
- **RpcTelemetryController:** Handles real-time signal fetching from the `ModulationTelemetryHub`.
- **RpcSystemController:** Manages global settings, versioning, and Git-for-Sounds snapshots.
