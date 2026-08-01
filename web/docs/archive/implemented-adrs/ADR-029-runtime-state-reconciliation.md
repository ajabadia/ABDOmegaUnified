# ADR-029: Runtime State Reconciliation (Phase 20.9)

## Status
PROPOSED

## Context
After Phase 20.8, high-frequency parameter changes are batched efficiently, but the system still needs a deterministic way to reconcile runtime state between the engine and the UI when both sides can diverge temporarily. A reconciliation layer is required to detect drift, resolve conflicts, and converge both views to the same authoritative state without breaking the existing transaction, validation, batching, or persistence contracts.

## Decision
The system will implement a Runtime State Reconciliation layer to keep the UI and engine convergent over time.

### Key Mechanisms:
1. **Authoritative Comparison**: The bridge will compare engine state snapshots, UI-local state updates, and the last acknowledged canonical state to detect divergence.
2. **Deterministic Conflict Policy**: When the same logical path has competing updates, the system will apply a deterministic policy (Last-Write-Wins for control state, Strict Blocking for structural data).
3. **Versioned State Tokens**: Each reconciled state will carry a revision token to ensure idempotency.
4. **Reconciliation Window**: The bridge may delay final convergence briefly to collect late-arriving updates, then emit one resolved state.
5. **Conflict Visibility**: Non-trivial conflicts will be surfaced through the observability layer.

## Consequences
- The UI and runtime can recover from temporary divergence without manual resets.
- Low-risk control values converge automatically with minimal disruption.
- Structural integrity remains protected by existing validation and transaction layers.
- Reconciliation events become visible and auditable.

## Done When
- Divergence between UI and engine is detected reliably.
- Reconciliation produces a single deterministic winner for conflicting control paths.
- Structural state is never reconciled in a way that bypasses validation.
- Reconciliation outcomes are observable and traceable.

## Functional Contract
### Input
- Engine state snapshots.
- UI-local state updates.
- Last acknowledged canonical state.

### Output
- Converged UI state.
- Converged runtime state.
- Observability events.

## Non-Goals
- This phase does not replace transactional editing.
- This phase does not override Blueprint validation.
- This phase does not alter persistence semantics.

## Acceptance Criteria
1. UI and engine state converge after a detected divergence.
2. Repeated reconciliation on the same inputs yields the same result.
3. Structural invalidity still fails validation instead of being reconciled away.
4. Reconciliation events are visible in observability logs.
