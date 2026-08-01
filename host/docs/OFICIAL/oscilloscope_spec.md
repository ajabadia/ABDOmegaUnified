# OMEGA Oscilloscope 2.0 Specification

## 1. Concept: The "Musical Magnifying Glass"
The OMEGA Oscilloscope is a high-performance diagnostic and creative tool with two operational levels:
- **Mini-Scope**: A compact, always-on preview in the Utility Rack.
- **Large Modal**: A full-featured laboratory analyzer for deep signal inspection.

## 2. Global Architecture
### 2.1 UI/UX
- **Mini-Scope**: Displays the active visualization (A, B, or Overlay) in a simplified form. Features an "Expand" (↗) icon to open the Modal.
- **Large Modal**: High-fidelity canvas with a dedicated control bar.
- **Context Toggle**: Switch between **AUDIO** (fast signals) and **MOD** (slow signals/CV).
- **Smart Focus**: "Eye" icons on modules (DCO, VCF, LFO) allow single-click routing to the scope.

### 2.2 Visualization Modes
- **Single Channel (A or B)**: Clean view of one source.
- **Overlay (A & B)**: Both signals superimposed with distinct colors.
- **XY Mode (Lissajous)**: X=A, Y=B for phase/frequency relationship analysis.

### 2.3 Controls (Modal)
- **Timebase**: Continuous slider with pitch-sync (0.25x to 8x cycles) and Free mode.
- **Scale/Gain**: Vertical amplitude control with "Auto-Fit" (double-click).
- **Trigger**: Modes (Auto, Rising, Falling, Off) and adjustable trigger level.
- **Persistence/Freeze**: "Hold" button to pause the buffer and "Fade Trail" for motion smoothness.

## 3. Technical Integration
### 3.1 Data Flow
- Utilizes the existing `ModulationTelemetryHub` for high-speed signal taps.
- Data is served via JSON-RPC `getTelemetry`.
- **Data Contract:** Each signal is returned as a structured object:
  ```json
  {
    "history": [0.1, -0.2, ...], // Array of floats (128 samples)
    "latest": 0.123             // Most recent scalar value
  }
  ```
- **Source Groups**:
  - `Audio · Oscillators`: DCO Main, Sub, Noise.
  - `Audio · Filters`: Juno VCF, Korg35 LP, MS-20 HP.
  - `Audio · Bus`: Pre-FX, Post-FX, Master.
  - `Mod · LFOs`: LFO 1, LFO 2.
  - `Mod · Envelopes`: ENV 1, ENV 2.
  - `Mod · Sources`: ModWheel, PitchBend, Macros.

### 3.2 State Persistence (ValueTree)
The scope state is stored in the `OmegaPreset` under the `visual` block:
- `sourceAIndex`, `sourceBIndex`.
- `viewMode` (A, B, Overlay, XY).
- `timebase`, `triggerMode`, `triggerLevel`.
- `context` (Audio/Mod).

## 4. Operational Roadmap (Evolutionary)
- **Phase 1 (MVP)**: WaveformScope A/B, Basic Controls, Toggle Audio/Mod, Mini-Scope ↗ Modal.
- **Phase 2 (Expansion)**: Extended Telemetry (ModulationGraph internal taps, Space Echo), "Luxury" taps.
- **Phase 3 (Professional)**: Advanced triggering, search in source list, and **ModulationScope** (Multi-track logic analyzer view).

## 5. Persistence Detail (ValueTree Schema)
Stored in `OmegaPreset` under `visual.scope`:
```yaml
visual:
  scope:
    followsPreset: true      # UI Toggle: PRESET/SESSION
    mode: "preset"           # "preset" | "session"
    currentContext: "audio"  # "audio" | "mod"
    audio:
      viewMode: "overlay"    # "A" | "B" | "overlay" | "xy"
      sourceA: { id: "DCO_MAIN", index: 10, role: "LOCAL_OSC" }
      sourceB: { id: "MASTER_OUT", index: 63, role: "GLOBAL_MASTER" }
      timebase: { mode: "sync", value: 1.0 }
      scale: 1.0
      trigger: { mode: "auto", level: 0.0 }
      freeze: false
    mod:
      viewMode: "A"
      sourceA: { id: "LFO1_OUT", index: 100, role: "MOD_LFO" }
      sourceB: { id: "ENV1_OUT", index: 110, role: "MOD_ENV" }
      timebase: { mode: "tempo", value: "1/4" } # Sync to tempo enabled
      scale: 1.0
      trigger: { mode: "auto", level: 0.0 }
      freeze: false
```

## 6. Reset Policy
- **Reset View**: Soft reset of UI controls (zoom, time, trigger) in memory.
- **Reset Preset**: Clears `visual.scope` block for the current preset (Nuclear).
- **Reset Session**: Global wipe of all loaded scope configurations in RAM (Nuclear).
