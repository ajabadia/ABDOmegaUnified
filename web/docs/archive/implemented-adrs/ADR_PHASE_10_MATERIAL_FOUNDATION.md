# ADR: Phase 10 — Industrial Design Token Governance & Material Foundation

**Status:** ACCEPTED  
**Date:** 2026-05-11  
**Context:** Phase 10.1 (The Material Foundation)  
**Related:** ADR_PHASE_9_ADVANCED_AUTHORING, ADR-010 (Identity)

## Context

Following the success of Phase 9 in stabilizing the authoring logic and topological validation (DFS), the editor faced a critical bottleneck: visual governance. Aesthetic properties were hardcoded or scattered across ad-hoc registries, leading to a "visual debt" that made the UI fragile and difficult to skin. 

To reach Era 7.2.3 industrial standards, the OMEGA Manifest Editor required a unified, immutable material foundation where visual tokens are decoupled from the rendering logic.

## Decision

We have implemented the **Material Foundation** architecture, centered around three core pillars:

### 1. Canonical Token Registry (`design-tokens.ts`)
- **Centralization**: All colors, radii, materials, and physics constants are moved to a single immutable registry.
- **Semantic Mapping**: Tokens are organized by industrial roles (e.g., `primary`, `surface`, `weak`) rather than literal values.
- **HSL Standards**: Implementation of high-fidelity color palettes for the tech-noir aesthetic.

### 2. Industrial Hybrid Derivation (`useDesignTokens.ts`)
- **Orchestration**: The hook now acts as a master derivation engine that merges:
    1. Base Tokens (Factory Specs).
    2. Manifest UI Overrides (Patch-specific aesthetics).
    3. Entity Overrides (Local component skinning).
- **Backward Compatibility**: Restored support for `accent` aliases and flattened `style` objects to satisfy legacy primitive requirements without breaking existing patches.
- **Zero-Noise Typing**: Elimination of all `any` types in favor of strict `Record` and `Unknown` casts, resolving 70+ TypeScript regressions.

### 3. Blind Consumption Pattern (CSS Variables)
- **Performance**: Styling is offloaded to the browser via CSS Variables (e.g., `--omega-color-primary`).
- **LOD Ready**: This pattern prepares the rack for Level of Detail (LOD) optimizations, where style updates don't require React re-renders.

## Consequences

### Positive
- **Visual Consistency**: Uniform appearance across all documents and tabs.
- **Theming Speed**: Global "Skinning" is now possible by modifying a single file.
- **Architectural Purity**: Renderers are now "style-blind," focusing only on structure and binding.
- **Static Integrity**: Zero compilation errors in the aesthetic pipeline.

### Negative
- **Abstraction Layer**: Requires developers to use the `useDesignTokens` hook instead of direct CSS or ad-hoc constants.
- **Legacy Bridge**: Small overhead in the hook to maintain compatibility with older manifest schemas.

## Validation Criteria

1. **Static Analysis**: `npx tsc --noEmit` returns zero errors. (**PASS**)
2. **Visual Parity**: Existing components render correctly with the new token engine. (**PASS**)
3. **Atomic Integrity**: Changes to a token propagate instantly to all governed components. (**PASS**)

---
**Approved by:** OMEGA Engineering Standards (Era 7.2.3)
