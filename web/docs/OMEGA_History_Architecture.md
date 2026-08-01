# OMEGA History & Memory Architecture

## Overview
The OMEGA History Architecture is designed to provide both high-frequency interaction (Undo/Redo) and industrial-grade auditability (History Engine). This document defines how these layers interact to avoid redundancy while maintaining systemic integrity.

## The Layered Model

### 1. UX Layer (Undo/Redo)
- **Files**: `useDocumentOrchestrator.ts` (actions), `useUndoRedo.ts`.
- **Role**: Handles the "last-in, first-out" stack of recent edits.
- **Behavior**: Fast, transient, and primarily local to the active editing session.
- **Relation**: Should treat the History Engine as its backend for "Deep Undo" or session restoration.

### 2. Semantic Layer (History Engine)
- **Files**: `historyService.ts`, `historyDiff.ts`, `historyRestore.ts`, `types/history.ts`.
- **Role**: The canonical source of truth for the manifest's evolution and workspace context.
- **Behavior**: Durable, versioned, and semantically aware. Captures "Significant Events" (commits, syncs, recovery) and **UI Intentions**.
- **Rule**: Every entry must be valid according to the `BlueprintValidator` and include `uiState` context.

### 3. Execution Layer (Orchestrator & Runtime)
- **Files**: `useDocumentOrchestrator.ts`, `wasmRuntime.ts`, `persistenceService.ts`.
- **Role**: Materializes the selected state (current or historical) into the audio engine and persistent storage.
- **Rule**: Does not manage history directly; only orchestrates the activation of states provided by the UI or History layers.

## Decision Matrix: Coexistence vs. Fusion

| Scenario | Recommendation | Rationale |
| :--- | :--- | :--- |
| **Simple Revert** | Undo Stack | Speed and UX familiarity. No need for full semantic diff for a single knob move. |
| **Audit Trail** | History Engine | Requires lineage, correlation IDs, and durable metadata. |
| **Time Travel** | History Engine | Navigating by version/ID rather than steps. Requires validated restoration. |
| **Recovery** | History Engine | Session recovery points must be durable and validated. |

## Sequence Maps

### Commit & Capture
1. User commits a Transaction.
2. `useDocumentOrchestrator` updates active state.
3. `historyService.captureRevision` is triggered.
4. History entry is recorded with `TRANSACTION_COMMIT` reason and correlation ID.
5. `observabilityService` emits `HISTORY_CAPTURED`.

### Historical Restore
1. User selects a revision from a History UI.
2. `HistoryRestoreEngine.prepareRestore(id)` is called.
3. `BlueprintValidator` checks the historical data.
4. If valid, `useDocumentOrchestrator` receives the graph.
5. Orchestrator triggers an `UPDATE_DOCUMENT`.
6. System activates the historical state and records a new `RECOVERY_POINT`.

## UI State Synchronization (Era 8)
Starting with Phase 22, the History Engine synchronizes the manifest state with the workspace environment.

### Tracked UI Context
- **Selection**: `selectedNodeId` ensures the user returns to the specific focus of their edit.
- **Pinning**: `pinnedNodeId` maintains reference panels across undo steps.
- **Layout**: `layoutRatio` and `isSplit` preserve the physical organization of the workspace.

### Capture Policy
- **Coalescing**: UI-only transitions are debounced/coalesced to prevent "focus noise" in the history stack.
- **Stability**: Interaction events (like dragging a splitter) only enter the history upon **Release** (`onDragEnd`).

## File Responsibilities
| Responsibility | Primary File |
| :--- | :--- |
| Historical Memory | `historyService.ts` |
| Semantic Comparison | `historyDiff.ts` |
| Safe Restoration | `historyRestore.ts` |
| Recent Revert (UX) | `useDocumentOrchestrator.ts` (Reducers) |
| System Convergence | `reconciliationService.ts` |
| Permanent Storage | `persistenceService.ts` |
