# ADR: UCA Phase 2 - Composition & Debugging

## Context
The Universal Cell Architecture (UCA) aims to transition the OMEGA UI from a flat JSON manifest into a recursive, composite tree structure. In Phase 1, we implemented the `OmegaNode` contract and achieved 1:1 visual parity with the legacy system via a stubbed `UniversalRenderer`.

In Phase 2, we needed to graduate from flat structural parity to **true hierarchical composition**, enabling nested macro-cells, robust debugging tools, and safe legacy fallback mechanisms.

## Decisions

### 1. 6-Step Immutable Resolution Pipeline
To prevent cascading "phantom bugs" (incorrect offsets, missing inherited styles, or DOM key collisions), we formalized the expansion of templates in `ucaSemantics.ts` into a strict 6-step sequence:
1. **Expand Template**: Deep-clone the base node to prevent catalog mutation.
2. **Merge Instance Overrides**: Apply local instance `style`, `pos`, and `layout` over the template base.
3. **Apply Inherited Styles**: Propagate generic design tokens downwards (Genetic Propagation).
4. **Resolve Layout**: Normalize dimensions.
5. **Compute Renderable Children**: Recursively expand child templates.
6. **Dispatch**: Hand off to the renderer.

**Key Consequence**: ID composition is strictly managed. Children spawned from a template are automatically assigned `parentID_childID` to guarantee DOM uniqueness in React, averting rendering collisions.

### 2. Operational Debug Inspector
The `UniversalRenderer` now includes an integrated layout inspector rather than just colored borders.
- Provides semantic colors depending on the `OmegaNode` `kind`.
- Allows interception of clicks for visual node selection without triggering functional UI callbacks.
- Offers toggles to hide decorative nodes to declutter the inspection view.

**Key Consequence**: Developers can trace structural relationships and diagnose rendering issues directly inside the workbench without external dev tools. It also honors the node's `zIndex` hierarchy natively.

### 3. Asymmetric Transitional Bridge (`treeToManifest`)
The function responsible for collapsing the UCA tree back to a flat legacy manifest was implemented as an *asymmetric bridge*.

**Key Consequence**: Rather than attempting a "perfect" round-trip, the bridge safely translates 1:1 legacy equivalents (`rack -> containers -> controls`). If it detects deep nesting or macro-cells that cannot be represented in the flat model, it explicitly logs a runtime warning (`console.warn`) indicating potential data loss during the export. This ensures data integrity and developer awareness during the Expand-Contract transition.

## Status
**Accepted** - Phase 2 complete. The architecture is now capable of deep structural nesting and ready for Phase 3 (Hierarchical Authoring).
*Builds on Phase 1 PoC and formalizes runtime semantics and transitional bridge behavior.*
