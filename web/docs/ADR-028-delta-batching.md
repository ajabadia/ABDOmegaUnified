# ADR-028: Delta Batching (Phase 20.8)

## Status
PROPOSED

## Context
In high-fidelity synthesis environments, parameter updates (like moving a slider or processing an LFO) can generate hundreds of events per second. Currently, each `setParameter` call triggers an immediate `applyDelta` RPC message. This granular approach introduces significant network overhead and can lead to UI stuttering or RPC message congestion.

## Decision
The system will implement a Delta Batching mechanism to aggregate high-frequency parameter updates into temporal windows before transmission.

### Key Mechanisms:
1. **Temporal Batching Window**: Introduce a 16ms (approx. 60Hz) or 33ms window for collecting parameter deltas.
2. **Delta Coalescing**: If the same parameter (`targetId`) is updated multiple times within a single window, only the LATEST value is kept.
3. **Burst Transmission**: At the end of each window, all collected deltas are sent in a single `bridge.applyDeltaBatch` message.
4. **Fast-Path Bypass**: Critical structural changes or "single-click" events can bypass the batcher for immediate execution if flagged.
5. **Observability Integration**: Track "Batch Density" (number of deltas per message) and "Batch Latency" in the `observabilityService`.

## Consequences
- Network traffic is reduced by up to 90% during active slider movements.
- RPC congestion is eliminated, ensuring smoother interaction even on lower-performance bridges.
- Memory usage increases slightly due to the delta buffer.
- Latency increases by a maximum of the window size (e.g., 16ms), which is acceptable for most UI interactions.

## Done When
- `wasmRuntime.setParameter` buffers values instead of sending them immediately.
- A background timer flushes the buffer at regular intervals.
- The RPC bridge supports the `applyDeltaBatch` method.
- Telemetry shows batch efficiency metrics.

## Functional Contract
### Input
- High-frequency `setParameter(id, value)` calls.

### Output
- Periodic `applyDeltaBatch([{id, value}, ...])` messages.

## Non-Goals
- This phase does not batch full structural `syncSnapshot` operations (already handled by Phase 20.7 transactions).
- This phase does not implement interpolation between batched values (reserved for the DSP runtime).

## Acceptance Criteria
1. Moving a slider results in ~60 messages per second regardless of the mouse polling rate.
2. The `observabilityService` reports the average number of deltas per batch.
3. Rapidly changing multiple parameters simultaneously results in a single batched message containing all changed IDs.
