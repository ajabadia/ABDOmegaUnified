# ADR-009: Phase 9 — Advanced Authoring Station

**Status:** ACTIVE  
**Date:** 2026-05-11  
**Supersedes:** ADR-008 (Phase 8 History Engine)

## Context

Phase 8 established multi-document history with undo/redo and dirty tracking. Phase 9 elevates the OMEGA Manifest Editor to a **Pro-Tier Authoring Station** by bridging the gap between authoring (manifest) and runtime (WASM Engine), while providing advanced tools for structural reconciliation and rapid prototyping.

## Decisions

### 9.1 WASM Hot-Reload (Simulation Sync)
*Status: Accepted and Implemented*
- **Goal:** Achieve sub-500ms latency between manifest edits and simulation updates.
- **Mechanism:** 
    - Implement a `SimulationOrchestrator` to manage the bridge between React state and the WASM Worker.
    - Use a **Debounced Deployment Queue** to prevent worker saturation during high-frequency edits (sliders, typing).
    - Implement **Integrity Locks** to ensure simulation doesn't update while a history undo/redo is in progress.
- **UI Feedback:** Real-time "Syncing..." / "In Sync" status indicators in the `MultiTabHeader`.

### 9.2 Visual Diff & Merge (UCA Conflicts)
*Status: Accepted and Implemented*
- **Goal:** Side-by-side comparison of manifest snapshots for auditing and reconciliation.
- **Logic:** 
    - Move from JSON-string comparison to **Structural Tree Diffing** (entity-by-entity).
    - Highlight additions, removals, and property mutations at the UCA node level.
- **Integration:** History view will allow "Compare with Current" and "Compare with Previous" modes.

### 9.3 Selective Merge Engine
*Status: Accepted, specified in ADR-010, Implemented*
- **Goal:** Selectively apply changes from historical snapshots back into the active document.
- **Details:** Delegated entirely to [ADR-010](ADR-010.md) to prevent two normative sources.

### 9.4 Advanced Templating (Blueprint Injection / Live Templates)
*Status: Accepted and Implemented*
- **Goal:** Parametric injection of complex UCA hierarchies.
- **Mechanism:** 
    - Transitioned from flat `moduleTemplates` to formal `BlueprintDefinition` objects.
    - **Blueprint Registry:** Externalized catalog in `constants/templates.ts` for modular governance.
    - **Adaptive UI:** Enhanced `TemplateGallery` with high-fidelity descriptions and category-specific iconography.

### 9.5 Semantic Integrity Engine (Aseptic Guard)
*Status: Accepted and Implemented*
- **Goal:** Prevent unstable topologies and broken resource references.
- **Detección de Ciclos:** Implementación de un algoritmo DFS de 3 estados (White/Gray/Black) para detectar y reportar rutas de modulación circular (CIRCULAR_MODULATION).
- **Asset Resolution:** Validación automática de `assetId` frente al catálogo de recursos del manifiesto.
- **Contract Auditing:** Verificación de rangos críticos (`min < max`) y límites de valores por defecto.

### 9.6 Blueprint Expansion & Industrial Audit Trail
*Status: Accepted and Implemented*
- **Goal:** Provide immutable authoring history across sessions while expanding the library.
- **Persistence:** Implementation of `localStorage` sync for the engineering console (capped at 100 entries).
- **Expansion:** Externalized blueprint registry in `constants/templates.ts`.
- **Centralization:** Unified diagnostic pipeline integrating `StructuralAuditor` results with the legacy `ValidationService`.

## Consequences

### Positive
- **Feedback Loop:** Near-instant simulation feedback dramatically reduces patch-design time.
- **Reliability:** Visual diff and selective merge provide total transparency and surgical control over document evolution.
- **Scalability:** Blueprints enable rapid construction of massive, recursive synth architectures.

### Negative
- **Complexity:** Hot-reload requires careful state-lock management to avoid race conditions.
- **Performance:** Structural diffing of large trees (>500 nodes) might require OffscreenCanvas/Worker optimization.
- **Conflict Management:** Selective merging introduces complexity in handling nested UCA dependencies.

## Implementation Roadmap

### Phase 9.1: The Live Loop (WASM Hot-Reload)
- [x] Implement `useSimulationBridge` hook.
- [x] Create debounced worker-dispatch queue.
- [x] Add "Simulation Status" HUD to the workbench.
- [x] Handle hydration errors and WASM crash recovery.

### Phase 9.2: Visual Reconciliation
- [x] Implement tree-diffing algorithm (O(n) complexity target).
- [x] Create `DiffViewer` split-pane component.
- [x] Integrate with Phase 8 `HistoryEntry` snapshots.

### Phase 9.3: Selective Merge Engine (Current State: CERTIFIED)
- [x] Implement `applyDiffEntry` with identity protection and dependency safety.
- [x] Add `handleMergeEntries` for atomic batch reconciliation.
- [x] Enable "Apply" and "Merge All" controls in the Diff Viewer.

### Phase 9.4: Live Templates (Structural Acceleration)
- [x] Define Blueprint schema and placeholder logic.
- [x] Implement `BlueprintInjector` with ID collision protection.
- [x] Create initial library of "Standard Modules" (VCO Macro, Performance Grid).
- [x] Externalize blueprint registry for industrial governance.

### Phase 9.5: Semantic Integrity (Aseptic Guard)
- [x] Implement `StructuralAuditor.ts` for deep validation.
- [x] Circular Modulation Detection (3-state DFS) with path reporting.
- [x] Asset Resolution & Parameter Range audits.

### Phase 9.6: Blueprint Expansion & Industrial Audit Trail
- [x] Implement persistent log storage (localStorage).
- [x] Centralize all diagnostics into `useAuditEngine`.
- [x] Expand blueprint registry with industrial VCO and Grid templates.

## Validation Criteria

1. **WASM Sync:** Edits propagate to sound/visuals in <500ms without UI stutter.
2. **Diff Accuracy:** Structural diff correctly identifies 100% of property changes in a 200-node manifest.
3. **Template Integrity:** Injecting a complex blueprint preserves all parent-child relationships and layout constraints.
4. **Regressions:** Zero impact on Phase 8 undo/redo or Phase 7 multi-tab stability.
