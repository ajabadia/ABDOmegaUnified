# OMEGA Universal VA Modular Specification

## 1. Concept: "The Foundation of Flexibility"
Transitioning from fixed-engine emulations (Juno, MS-20) to a modular VA system built on ACE (Architectural Component Emulation). This allows users to mix-and-match Roland/Korg/Prophecy components.

## 2. The VA Modular 0.1 Engine (`VA_MODULAR_01`)
Un motor determinista construido por `EngineConfigManager` cuando un preset contiene un bloque `voiceArch`.

The synth voice is defined by a `voiceArch` block within each Layer.

### 2.1 Component Whitelist (Phase 1)
- **Oscillators**: `OSC-VA-001` (Juno DCO), `OSC-VA-004` (JP SUPERSAW), `OSC-VA-002` (Korg MS-20 VCO).
- **Filters**: `FLT-VA-001` (Juno IR3109), `FLT-KORG35` (Korg 35), `FLT-JP8080` (JP-8080).
- **Modulators**: `ENV-ADSR-GEN` (Generic ADSR), `LFO-VA-001` (Generic LFO).

### 2.2 Voice Architecture Constraints
- **Per Voice**: 1-2 Oscillators, 1 Filter, 1 VCA.
- **Modulation**: Up to 3 ADSR Envelopes, 2 LFOs.
- **Roles**: Modulation is routed by context roles (`amp`, `filter`, `mod`) until the full `ModulationGraph` is exposed.

## 3. Implementation Sprints
### Sprint 1: Contracts & Telemetry
- Define fixed telemetry indices for 15 core taps.
- Implement `getTelemetrySources` RPC.
- Add `visual.scope` block to `OmegaPreset` ValueTree.

### Sprint 2: WaveformScope UI
- `ModuleOscilloscope` refactor for modal expansion.
- Grouped A/B source selection.
- Overlay & XY rendering modes.

### Sprint 3: Persistence & Modular Logic
- Link `scopeState` to `ValueTree`.
- Implement `PRESET / SESSION` toggle.
- Create "ModuleAdvanced" UI for VA Modular parameter control.

## 4. Baseline Validation (The Gold Standard)
Two reference presets must be identical in quality to the fixed engines:
1. **Juno Wide Pad (Modular)**: Uses Juno DCO + JP Supersaw + IR3109 Filter.
2. **MS20 Punch Bass (Modular)**: Uses MS-20 VCO + Korg35 Filter.
