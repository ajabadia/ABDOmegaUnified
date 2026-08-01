# ADR-038: Semantic History Synchronization (Phase 22)

## Status
Proposed (v1.0.0)

## Context
Following the stabilization of the OMEGA Manifest Editor (Phase 21), we identified a gap in the "Time Travel" experience. Previous iterations focused on raw manifest snapshots, ignoring the user's interface context (selection, pinning, layout ratio). Undoing an action would revert the data but leave the UI in a disjointed state, leading to cognitive friction.

## Decision
We implemented an Industrial-Grade History Engine that synchronizes **Manifest Content** with **Semantic UI State**.

### 1. Semantic History Schema
Extended `HistoryEntry` to include a mandatory `uiState` context:
- `selectedNodeId`: Restores focus upon navigation.
- `pinnedNodeId`: Restores reference panels.
- `layoutRatio`: Restores the exact workspace proportions.
- `viewMode` & `isSplit`: Restores the structural layout (Orbital vs Rack vs Source).

### 2. Interaction Filtering (Interaction vs Intention)
To prevent history pollution, we implemented strict capture rules:
- **Content Changes**: Always captured.
- **UI Changes**: Captured only on **Semantic Release** (e.g., `onDragEnd` for splitter, single click for selection).
- **Coalescing**: UI events of the same type within 1.5s are automatically compressed in the `HistoryService`.

### 3. Aseptic Separation
- **Persistence**: Survives page reloads via `localStorage` (current state only).
- **History**: Volatile session memory (In-memory stack). This prevents massive storage bloat and avoids rehydrating obsolete history chains.

## Consequences
- **Positive**: High-fidelity Undo/Redo that feels like "replaying" the session.
- **Positive**: Zero-noise history stack.
- **Neutral**: Slightly higher memory footprint due to UI state snapshots (mitigated by structured cloning and lack of persistence).
- **Constraint**: History does not survive a hard reload, ensuring each session starts with a clean slate while preserving the current manifest.
