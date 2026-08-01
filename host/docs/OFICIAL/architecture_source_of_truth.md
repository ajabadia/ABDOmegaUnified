# Architecture Source of Truth (OMEGA)

This document defines which component owns the authoritative data for each domain in the OMEGA system.

| Domain | Authoritative Component | Responsibility |
| :--- | :--- | :--- |
| **Preset Structure** | `OmegaPresetSchema` | Defines required fields, naming (keys), and ValueTree shape. |
| **Component Catalog** | `AceCatalog` | Defines available DSP modules, their IDs (`OSC-VA-001`, etc.), and slot rules. |
| **Parameter Metadata** | `ParameterMetadataRegistry` | Defines UI names, ranges, units, MIDI CCs, and telemetry indices. |
| **Global Settings** | `SystemSettingsManager` | Owns sample rate, buffer size, global MPE/Midi settings, and UI preferences. |
| **Runtime State** | `EngineConfig` | The at-rest capture of the entire synthesis graph for use by the DSP engine. |

## Parameter Naming Contract

| Context | Naming Standard | Example |
| :--- | :--- | :--- |
| **JSON/YAML** | Unified/Canonic | `vcfKeyTracking`, `vcfEnvInverted`, `hpfPosition` |
| **APVTS (JUCE)** | Semantic Unified | `LAYERAMAINCUTOFF`, `MASTERCHORUSMODE` |
| **Internal Structs** | CamelCase / Unified | `lfoRate`, `jpSpread`, `vcfKeyTracking` |

## Semantic Naming Standard (Phase 13.11+)

1. **`LAYERA*`**: Used for parameters belonging to a specific synthesis layer (oscillators, filters, envelopes).
2. **`MASTER*`**: Used for global parameters belonging to the entire engine (Main Volume, Chorus, Delay, Global LFO).

## Enforcement Rules
1. **No Ad-hoc Identifiers**: All strings used as keys must be defined in `OmegaIdentifiers.h`.
2. **Schema-First Modification**: Any change to the preset format must be reflected in `OmegaPresetSchema` before implementation.
3. **Registry-Driven UI**: The WebUI must derive its ranges and names from the `RpcMetadataController`, not from hardcoded objects.
4. **Hardened Mapping**: All `LayerParams` must be explicitly mapped in `OmegaPreset.cpp` using `SET_P` macros to ensure persistence.
