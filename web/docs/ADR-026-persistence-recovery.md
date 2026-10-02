# ADR-026: Persistence & Recovery (Phase 20.6)

## Status
PROPOSED

## Context
After Phase 20.5, the system is observable and deterministic. However, the runtime state is currently volatile; a page refresh or a process crash results in total state loss. To achieve industrial reliability, the OMEGA Manifest Editor requires a mechanism to persist the last known good canonical state and rehydrate it without operational drift.

## Decision
The system will implement a deterministic Persistence & Recovery layer focused on the canonical representation of the Blueprint and its operational metadata.

### Key Mechanisms:
1. **Canonical State Snapshots**: Only the normalized, validated output from the `BlueprintResolver` (the "Canonical Graph") is persisted. Editable/intermediate states are excluded to prevent drift.
2. **Operational Metadata**: Every persisted state must include:
    - `schemaVersion`: To ensure compatibility with the current runtime.
    - `lastCorrelationId`: To link the restored state to the previous observability trace.
    - `syncHash`: The last ACK'd hash from the RPC bridge.
3. **Atomic Rehydration**: Recovery is an all-or-nothing operation. If the persisted state fails validation (via `BlueprintValidator`) during rehydration, the system must discard the state and revert to a safe `DEFAULT_MANIFEST`.
4. **LocalStorage/IndexedDB Backend**: Initial implementation will use `localStorage` for immediate persistence, with a pluggable interface for future server-side synchronization.
   - **Addendum (session vault)**: `localStorage` keeps being the authority for the MANIFEST and for which documents exist, because that is JSON and it is synchronous. The undo stack and `extraResources` are NOT JSON-serializable in a usable way (a full manifest per entry; `ArrayBuffer`s that `JSON.stringify` flattens to `{}`), so they live in a second store: IndexedDB, which uses the structured clone algorithm and therefore keeps them intact.
   - The vault is a strict complement: it never creates documents, and its stack is only attached to a document whose manifest hash matches the one the record was written with. A mismatch means the stack belongs to a state the user is not looking at, and nothing is attached (the old "no undo after reload" behaviour).
   - The vault rehydrates the history WITHOUT resetting the save point: `isInitializing` is left `false` on purpose, because the dirty watcher's `CAPTURE_HASH` would move `lastSavedIndex` to the live cursor and make the unsaved-change count jump to zero.
5. **Auto-Save Trigger**: State is persisted only upon successful `bridge.syncSnapshot` ACK, ensuring that the persisted state is always one that has been accepted by the runtime.

## Consequences
- Session persistence across page reloads is achieved.
- Undo/redo survives a page reload, including the binary assets the document references.
- Recovery is guaranteed to be consistent with the last valid runtime instance.
- No partial or corrupted states can be rehydrated due to mandatory pre-recovery validation.
- Minimal storage footprint by persisting only canonical data.

## Done When
- Canonical state is successfully saved after every successful bridge sync.
- System automatically rehydrates the last valid state upon initialization.
- Rehydration triggers a mandatory validation check.
- Traceability is maintained (recovered states emit a `RECOVERY` event in observability logs).

## Functional Contract
### Input
- Successful `syncSnapshot` events.
- Initial app load.

### Output
- Persisted JSON payload (canonical graph + metadata).
- Rehydrated `OMEGA_Manifest` in the orchestrator.

## Non-Goals
- This phase does not implement multi-level undo/redo (reserved for Phase 8).
- This phase does not persist unvalidated user edits.
- This phase does not replace server-side long-term storage.

## Acceptance Criteria
1. Refreshing the browser restores the exact canvas state and bridge status.
2. Corrupting the persisted data manually results in a graceful reset to `DEFAULT_MANIFEST`.
3. Recovery events are visible in the `observabilityService` logs.
