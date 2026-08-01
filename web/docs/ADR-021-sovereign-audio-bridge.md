# ADR-021: Sovereign Audio Bridge Architecture

## Context
Following the consolidation of the Universal Cell Architecture (UCA) and the migration to native `OmegaNode` rendering (Phase 19), the system requires a definitive bridge to the C++/WASM audio engine. The previous `WasmRuntime` implementation was a mock/diagnostic shell. 

## Decision
The `WasmRuntime` will be refactored into a **Sovereign Bridge Adapter** that communicates with the audio engine via JSON-RPC 2.0. This bridge will use the `OmegaNode` tree as the sole source of truth for DSP configuration.

### Operational Domains
Phase 20 introduces a clear taxonomy for nodes during runtime execution:

1.  **Audio Domain**: Generative and processing nodes (Oscillators, Filters, Mixers). These are mapped directly to WASM DSP functions.
2.  **Control Domain**: Nodes producing/consuming normalized values (Knobs, LFOs, Envelopes). These are mapped to parameter delta patches.
3.  **MIDI Domain**: Event-driven nodes (Note generators, CC mappers). These are handled via the high-priority event bus.
4.  **Telemetry Domain**: Feedback-only nodes (VU Meters, Status Badges). These are fed by periodic telemetery snapshots from the engine.

### Communication Protocol
- **`syncSnapshot`**: Full UCA tree deployment. Used for structural changes (adding/removing nodes) and initial load.
- **`applyDelta`**: Low-latency incremental updates. Used for real-time parameter interaction (knobs/sliders).
- **Addressing Scheme**: Canonical hierarchical paths (e.g., `voice_1/osc_1/freq`) replace legacy flat IDs.

## Consequences
- **Elimination of Drift**: The engine and UI share the exact same structural contract.
- **Execution Sovereignty**: Blueprints and templates are now executable units, not just visual descriptors.
- **Latency Efficiency**: Separating structural snapshots from parameter deltas ensures sub-millisecond response times for UI interactions.
- **Domain Isolation**: Prevents control-only nodes from polluting the audio DSP graph needlessly.
