# ADR-022: Deterministic Parameter Binding (Phase 20.2)

## Context
Phase 20.1 established the RPC transport layer for UCA trees. However, to ensure reliability during real-time synthesis, we need a deterministic method for identifying parameters across the bridge. Legacy systems often rely on volatile indices or flat strings, which lead to "parameter drift" when the manifest structure changes.

## Decision
We will adopt **Hierarchical Path Addressing (HPA)** as the sovereign parameter identification scheme for OMEGA.

### HPA Rules:
1.  **Identity Stability**: Parameters are addressed by their absolute path in the UCA tree (e.g., `root/voice_1/filter/cutoff`).
2.  **Explicit Bindings**: Every `OmegaNode` with a `role` of `control` or `audio` must expose a binding path for its primary value.
3.  **Port Mapping**: Ports are addressed as sub-paths of their parent node (e.g., `node_id/ports/in_1`).
4.  **Delta Sovereignty**: `applyDelta` RPC messages MUST use the HPA path as the `targetId`.

### Parameter Taxonomy:
-   **Static Properties**: Visual/Metadata properties (labels, colors) are NOT sent via delta patches. They are part of the `syncSnapshot`.
-   **Dynamic Parameters**: Real-time DSP values (frequency, gain, cutoff) are the primary residents of the delta channel.
-   **Systemic Events**: Trigger/Gate events are handled as zero-latency HPA pulses.

## Consequences
- **Drift Immunity**: Even if nodes are reordered in the manifest, their paths remain stable, ensuring that the engine continues to update the correct DSP unit.
- **Improved Observability**: Developers can inspect the WebSocket stream and immediately understand which component is being modulated without cross-referencing a flat ID table.
- **Orchestration Simplicity**: The `useSimulationBridge` no longer needs to maintain a local mapping of IDs; it simply resolves the path of the affected `OmegaNode`.
