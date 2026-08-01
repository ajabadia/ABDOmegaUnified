# ADR-015: Phase 15 — Unified Cell Studio (Advanced Composition)

**Status:** PROPOSED / DRAFT  
**Date:** 2026-05-12  
**Supersedes:** ADR-013 (Asset Behavior Lab), ADR-011 (Live Templates)

## Context

The OMEGA workbench has reached full industrial maturity (`SYS_READY`). The editor base is stable, history is persistent, and the blueprint injection engine is certified. However, the authoring of individual **Cells** (the atoms of the rack) is still fragmented between the legacy inspector, the Asset Behavior Lab, and the UCA tree view.

Phase 15 marks the transition from "Editor of Manifests" to "Studio of Cells," where the focus shifts to the high-fidelity composition and behavioral definition of recursive cell structures.

## Decision

Phase 15 implements the **Unified Cell Studio**, a centralized authoring environment for creating, testing, and certifying Universal Cells (UCA).

### 1. Unified Authoring Surface (Cell Studio)
We replace the `UniversalCellEditorModal` with a dedicated **Cell Studio** mode.
- **Isolation Mode**: Clicking "Edit Cell" isolates the node in a specialized workbench view with its own grid and local coordinates.
- **Live Sandbox**: Integrated simulation controls to test the cell's response to Parameter/Telemetry inputs without deploying the full rack.
- **Breadcrumb Navigation**: Seamlessly navigate between the parent rack and nested cell hierarchies.

### 2. Recursive Behavior Logic
Cells are no longer terminal nodes; they are recursive containers of assets and sub-cells.
- **Genetic Propagation**: Parent cells can define "Behavior Drivers" that propagate values to children (e.g., a "Master Brightness" driver for a complex meter).
- **Inter-Cell Logic**: Support for basic logical links between sibling cells within the same template (e.g., a switch that toggles the visibility of an adjacent label).

### 3. Material Foundation Integration (Phase 15.2)
Integration of the Material Foundation system into the Cell Studio.
- **Shared Surfaces**: Cells can reference "Material Recipes" (Brushed Aluminum, Plastic, Glass) instead of individual color tokens.
- **Aesthetic Inheritance**: Cells automatically adapt to the global typography and surface policies defined in the `MaterialFoundationRegistry`.

### 4. Blueprint Freezing & Certification
Formalizing the "Save as Template" flow.
- **Deterministic Snapshots**: Freezing a cell in the Studio generates a certified `CellTemplate` with all assets, behaviors, and genetic constraints baked in.
- **Hash-Locked Blueprints**: Each certified cell receives an integrity hash to ensure it remains immutable once used in production racks.

## Consequences

### Positive
- **Authoring High-Fidelity**: Allows for the creation of extremely complex, professional-grade UI components.
- **Consistency**: Centralizes all "Cell" logic into a single pipeline, reducing architectural drift.
- **Portability**: Certified cells can be shared across projects via `.acepack` with guaranteed behavior.

### Negative
- **UI Complexity**: The addition of a "Studio Mode" requires a significant shift in the workbench layout and state management.
- **Renderer Pressure**: Recursive behaviors and multi-layer recipes increase the computational load on the `UniversalRenderer`.

## Implementation Roadmap

### Phase 15.1: The isolation Engine
- [ ] Implement "Studio Mode" state in `useWorkbenchState`.
- [ ] Create the `CellStudioLayout` (Isolation view, Sandbox controls).
- [ ] Enable local coordinate system for isolated cell editing.

### Phase 15.2: Behavior Orchestration
- [ ] Implement `BehaviorDriver` logic for recursive value propagation.
- [ ] Integrate the `AssetBehaviorLab` as a docked panel within the Studio.
- [ ] Add "Visual Scrubbing" at the cell level.

### Phase 15.3: Blueprint Harvest
- [ ] Implement "Freeze Cell as Template" flow.
- [ ] Integrate integrity hashing for certified cells.
- [ ] Update the Library/Gallery to support "Studio-Authored" cells.

---
**Proposed by:** OMEGA Engineering Team  
**Standards:** Industrial Era 7.2.3 / Phase 15
