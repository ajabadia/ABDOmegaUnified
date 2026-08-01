# ADR-039: Productivity Overlays and Bulk Operations (Phase 23)

## Status
Proposed (v1.0.0)

## Context
Following the implementation of the Semantic History Engine (Phase 22), the OMEGA Manifest Editor has a robust memory of user intentions and UI state. However, the interaction model is still primarily "Single-Item Focused," requiring users to open the inspector for every validation or modification. This creates a bottleneck for high-density manifest editing.

## Decision
We will implement a dual-track productivity layer: **Visual Integrity Overlays** and **Bulk Property Synchronization**.

### 1. Live Integrity Overlays (Canvas Layer)
- Introduce a high-performance overlay layer on the `Orbital` and `Rack` viewports.
- Display contextual icons/glows for:
  - **Dangling Ports**: Ports without links.
  - **Circularities**: Nodes involved in a modulation loop.
  - **Audit Warnings**: High-priority diagnostics from `StructuralAuditor`.
- Rules: Must be non-obstructive and toggleable.

### 2. Bulk Property Synchronization (Multi-Edit)
- Extend `WorkbenchState` to support `multiSelectedNodeIds`.
- Implement a "Master-Slave" sync logic:
  - When multiple nodes are selected, the inspector shows common properties.
  - Changing a property in the inspector propagates to all selected nodes.
  - Each bulk operation is recorded as a **single** semantic history entry (`BULK_UPDATE`).

### 3. Progressive Implementation
- **MVP**: Integrity indicators for dangling ports + basic multi-selection state.
- **V2**: Circularity visualizers + Bulk property sync with conflict resolution.

## Consequences
- **Positive**: Significant reduction in "Inspector Fatigue."
- **Positive**: Instant visual confirmation of system health.
- **Negative**: Increased complexity in viewport rendering (requires optimized SVG/Canvas layers).
- **Negative**: Bulk edits require careful history coalescing to avoid data corruption in undo steps.
