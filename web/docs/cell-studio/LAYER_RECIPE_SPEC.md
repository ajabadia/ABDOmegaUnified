# SPEC: Layer Recipes & Multi-Asset Composition

**Status:** ACTIVE (PHASE 15)  

## Concept

A **Layer Recipe** is a declarative template that defines how multiple visual assets (statics, SVGs, filmstrips) are stacked and modulated to create a high-fidelity control.

## Recipe Taxonomy

Each layer in a recipe is assigned a **Role**:
- `base`: The main body of the control (e.g., Knob Body).
- `indicator`: The dynamic part that moves or changes (e.g., Knob Pointer).
- `overlay`: Static or dynamic glare, shadows, or textures.
- `mask`: SVG or Alpha masks for advanced clipping.
- `label`: Integrated text or plaque layers.

## Modulated Composition

Each layer can independently subscribe to the cell's main behavior or have its own specialized mapping:
- **Primary Modulation**: Follows the main control value (e.g., the pointer rotates).
- **Secondary Modulation**: Follows auxiliary state (e.g., the indicator glows when active).
- **Static**: Remains fixed regardless of input.

## Serialization

Layer Recipes are serialized within the `CellTemplate` under the `layers` array, utilizing the UCA recursive model to allow nested recipes.

---
*MIGRATED FROM docs/cell editor - para más adelante/ADR-010-asset-behavior-lab.md (Extracted) on 2026-05-12*
