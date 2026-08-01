# ADR 003: Hierarchical Authoring (UCA Phase 3)

## Status
Accepted (May 2026)

## Context
The OMEGA Manifest Editor required the ability to not just render, but author the deeply nested Universal Cell Architecture (UCA) tree. Previously, the editor's core CRUD operations (`useEntityCRUD`), state hooks (`useWorkbenchState`), and property inspection (`PropertyPanel`) were heavily coupled to a flat, ID-based architecture (`manifest.ui.controls` and `manifest.ui.jacks`).

## Decision
We implemented a non-destructive hybrid authoring layer. The core decisions were:

1. **Typed Selection Referencing**: Replaced `selectedItemId: string` with `SelectionRef: { source: 'legacy' | 'uca', id: string }` across the workbench state.
2. **On-the-Fly Entity Projection**: Created `ucaInspectorAdapter.ts` with `findEditableItem` and `adaptNodeToManifestEntity`, converting deep `OmegaNode` structures into transient `ManifestEntity` shapes that the existing `PropertyPanel` can digest without a massive rewrite.
3. **Fallback to Projected Tree**: Ensured that if the `manifest.ui.tree` is undefined (in transitional/legacy mode), the adapter securely falls back to `manifestToTree(manifest)` to search and select structural nodes (like Containers/Layers) safely.
4. **Immutable Tree Mutability**: Integrated `updateNodeInTree` inside `useEntityCRUD.ts`. When a deep UCA node is modified, the UCA tree is updated immuatbly, and a passive projection updates the legacy arrays to keep the visual engine running seamlessly in both modes.

## Consequences
- **Positive**: Complete UI authoring support for complex, nested node structures. 
- **Positive**: Zero breakage of existing flat-array dependencies (like `OrbitalView`).
- **Positive**: Immediate availability of the PropertyPanel for all deep UCA elements.
- **Negative/Risk**: Deep search performance overhead (`findNodeInTree`). Recursively traversing large trees on every selection/render cycle could degrade UX in extreme modules. Future optimization (e.g., node indexing or memoization) may be required.
- **Transitional Debt**: The `ucaInspectorAdapter` is strictly a transitional bridge to enable Phase 3 without rewriting the PropertyPanel. It is a target for removal in Phase 4 or 5 once the PropertyPanel supports `OmegaNode` natively.

## Exit Criteria for Phase 4
Phase 4 (Advanced Composition & Transition) will be considered complete when:
1. The default workbench viewport natively renders the UCA tree without relying on legacy array fallbacks.
2. The flat legacy model (`manifest.ui.controls` and `manifest.ui.jacks`) is no longer required for daily editing.
3. The `ucaInspectorAdapter` is retired, and inspectors operate directly on the UCA model.

*Supersedes/extends ADR 002 (UCA Phase 2).*
