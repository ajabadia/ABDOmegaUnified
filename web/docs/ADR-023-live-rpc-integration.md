# ADR-023: Live RPC Integration (Phase 20.3)

## Status
ACCEPTED

## Context
After establishing the Sovereign Audio Bridge (Phase 20.1) and Hierarchical Path Addressing (Phase 20.2), the system requires a robust operational layer to synchronize the live state between the OMEGA Manifest Editor and the C++/WASM engine. The primary challenge is ensuring that high-frequency parameter deltas and structural snapshots coexist without causing state drift or engine instability.

## Decision
We will implement a bidirectional **Live RPC Orchestration** layer within the bridge.

### Key Mechanisms:
1.  **Confirmed Snapshots**: Structural deployments (`syncSnapshot`) will require an explicit `ACK` from the engine before the UI transition to `in-sync` status.
2.  **Delta Stream Prioritization**: Real-time parameter updates (`applyDelta`) will be prioritized over structural telemetry to minimize audible latency.
3.  **Engine Heartbeat**: The bridge will monitor a periodic `heartbeat` signal from the engine to detect `degraded` or `disconnected` states.
4.  **State Reconciliation**: If a structural change occurs while a delta stream is active, the bridge will pause deltas, synchronize the snapshot, and then resume the stream using updated HPA paths.

## Consequences
- **Operational Reliability**: The UI accurately reflects the engine's execution state.
- **Latency Predictability**: Explicit prioritization ensures that knob turns feel "analog" and immediate.
- **Robustness**: The system can recover gracefully from engine crashes or WebSocket interruptions by re-syncing the full canonical tree.

## Done When
- [ ] Snapshots are confirmed by the engine via RPC.
- [ ] Heartbeat monitoring accurately reflects in the UI Compliance Badge.
- [ ] Structural changes pause and resume the delta stream without audio glitches.
- [ ] Latency for `applyDelta` messages remains below industrial thresholds.
