# OMEGA Core Master Map (Era 7.2.3)

## 🏗️ Architectural Backbone
The `src/Core/` directory contains the engine's "Aseptic" business logic, decoupled from the JUCE framework and the specific plugin implementation.

## 📂 Primary Domains

### 1. [Service/](file:///d:/desarrollos/ABDOmega/src/Core/Service/)
Authoritative orchestrators that manage state and lifecycle.
- **[Config/](file:///d:/desarrollos/ABDOmega/src/Core/Service/Config/)**: [MOVED] Governance of engine state and global settings.
  - `EngineConfigManager.h`, `SystemSettingsManager.h`.
- **[Engine/](file:///d:/desarrollos/ABDOmega/src/Core/Service/Engine/)**: Synthesis engine interfaces and orchestration.

### 2. [Providers/](file:///d:/desarrollos/ABDOmega/src/Core/Providers/)
Specialized sub-systems for telemetry, semantic mapping, and routing.
- **[Telemetry/](file:///d:/desarrollos/ABDOmega/src/Core/Providers/Telemetry/)**: Real-time signal monitoring hub.
- **[Semantic/](file:///d:/desarrollos/ABDOmega/src/Core/Providers/Semantic/)**: Manifest-to-engine binding and discovery.
- **[Routing/](file:///d:/desarrollos/ABDOmega/src/Core/Providers/Routing/)**: Modulation matrix and signal path compilation.

### 3. [Ace/](file:///d:/desarrollos/ABDOmega/src/Core/Ace/)
The **Aseptic Component Engine**. Manages WASM module loading, validation, and cataloging.
- **Loader**, **Validator**, **Catalog**, **Registry**.

### 4. [Model/](file:///d:/desarrollos/ABDOmega/src/Core/Model/)
Pure data structures and domain identifiers.
- **Patch**, **Parameters**, **Identifiers**, **Runtime State**.

### 5. [Compiler/](file:///d:/desarrollos/ABDOmega/src/Core/Compiler/)
Graph orchestration and execution plan compilation for the voice architecture.

### 6. [Wasm/](file:///d:/desarrollos/ABDOmega/src/Core/Wasm/)
Low-level WASM runtime integration (WAMR) and host-binding services.

---
*OMEGA — Engineering Standard V7.2.3 — Core Master Governance*
