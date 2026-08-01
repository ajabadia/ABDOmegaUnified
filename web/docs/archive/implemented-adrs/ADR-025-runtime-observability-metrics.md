# ADR-025: Runtime Observability & Metrics (Phase 20.5)

## Status
ACCEPTED

## Context
After Phase 20.4, the runtime pipeline is deterministic, atomic, and blocked by validated Blueprints before materialization. The next operational risk is not correctness of instantiation, but lack of visibility when latency, buffering, heartbeat drift, or instantiation failures occur in production.
The observability layer must correlate bridge events, runtime events, and failure modes without leaking sensitive state, and should rely on structured context such as correlation identifiers and measured durations.

## Decision
The system will introduce a Runtime Observability & Metrics layer for the Phase 20 pipeline.

### Key Mechanisms:
1. **Correlation IDs**: Every snapshot, delta burst, validation failure, and instantiation attempt must carry a stable correlation identifier across bridge and runtime logs.
2. **Structured Logs**: Observability events must be emitted in structured form with consistent fields for phase, component, path, code, state, and durationMs.
3. **Latency Metrics**: The system must record end-to-end timings for syncSnapshot, delta buffering, validation, and WASM instantiation.
4. **Failure Counters**: Validation blocks, rollback activations, heartbeat degradation events, and reconnect attempts must be counted as discrete operational events.
5. **Health State Export**: The bridge and runtime must expose a machine-readable health view suitable for the Compliance Badge and audit tooling.

## Consequences
- Operators can distinguish correctness failures from performance regressions.
- Bridge health, runtime health, and validation failures become auditable as separate signals.
- Latency regressions can be detected without changing the execution path.
- Observability remains safe if sensitive payloads are excluded from logs.

## Done When
- All critical bridge and runtime transitions emit structured observability events.
- Correlation IDs propagate across sync, validation, and instantiation steps.
- Latency metrics are recorded for snapshot, buffer flush, and instantiation paths.
- Failure and rollback events are visible in logs and counters.
- No sensitive payload data is logged.

## Functional Contract
### Input
- Snapshot sync attempts.
- Delta bursts.
- Validation results.
- Runtime instantiation outcomes.
- Heartbeat and connection transitions.

### Output
- Structured logs.
- Latency metrics.
- Failure counters.
- Health state snapshot.

## Non-Goals
- This phase does not change Blueprint semantics.
- This phase does not alter instantiation rules.
- This phase does not replace validation or rollback logic.
- This phase does not add user-facing feature behavior.

## Acceptance Criteria
- A single correlation ID can trace one Blueprint lifecycle end-to-end.
- Validation failures are measurable and attributable.
- Runtime instantiation latency is observable per attempt.
- Heartbeat degradation is visible as a distinct operational signal.
- Logs remain structured and free of sensitive data.

## Rule of Thumb
> If the runtime cannot be measured, it cannot be trusted under load.
