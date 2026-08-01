# SPEC: Universal Cell Architecture (UCA) — Phase 0/1
## ABDOmega / OMEGA Manifest Editor

**Status:** DRAFT  
**Date:** 2026-05-12  
**Related:** OMEGA_ENGINEERING_MANIFEST_SPEC, guidelines, INTEGRATION_BRIEF, INTEGRATION_BRIEF_F13, src/omega-ui-core/SPEC.md

---

## 1. Vision

ABDOmega is the host/core modular platform.  
Third parties build the DSP engine in the ABD SDK, likely compiled to `.wasm`, while the web editor is used to author the visual face of the module: panels, controls, ports, indicators, backgrounds, screws, styles, fonts, and assets.

Everything is packaged into a self-contained `.acepack` so it can be imported into ABDOmega or another compatible installation.

The web app is not the product itself; conceptually, the editor is a visual SDK and authoring tool.

---

## 2. Core Boundary

The architecture is split into four clear layers:

1. **Motor**
   - The code that computes audio, CV, events, and logic.
   - Lives in C++ and is compiled to `.wasm`.

2. **Contract**
   - The list of parameters, inputs, outputs, bindings, ranges, units, and roles.
   - This is the bridge between DSP and UI.

3. **Visual Manifest**
   - The representation of the module: knobs, sliders, displays, LEDs, layout, themes, assets, fonts, and style decisions.

4. **Acepack**
   - The distributable bundle that contains:
     - `.wasm`
     - `.acemm`
     - assets
     - styles
     - templates used
     - metadata / versioning / signatures if needed

---

## 3. Universal Cell Model

The universal conceptual unit is **Cell**.

A Cell can be:
- a screw,
- a background panel,
- a knob,
- a display,
- a VU meter,
- a port,
- a container,
- a composite module section.

Not every Cell has to be interactive.

### Suggested taxonomy

```ts
type CellKind =
  | 'decor'
  | 'mechanical'
  | 'control'
  | 'telemetry'
  | 'io'
  | 'container'
  | 'composite';
```

### Cell responsibilities

A Cell may define:
- `definition`: identity, category, version.
- `assets`: resources it needs.
- `layers`: filmstrip, label, SVG, LED, hitbox, etc.
- `styleDefaults`: color, material, shadow, font, etc.
- `layoutDefaults`: size, anchors, offsets.
- `interaction`: none, rotary, linear, toggle, trigger, menu.
- `bindingHints`: compatible with parameter, port, state, telemetry.
- `exportPolicy`: built-in, local-only, embedded in `.acepack`.

---

## 4. Hierarchical Tree

The architecture is hierarchical and recursive.

```text
Rack
  Face / Plane
    Container / Group
      Cell
        Cell / Layer / Asset
```

### Roles in the tree

```ts
type NodeKind =
  | 'rack'
  | 'face'
  | 'container'
  | 'cell'
  | 'asset-layer';

type NodeRole =
  | 'structure'
  | 'decor'
  | 'mechanical'
  | 'control'
  | 'telemetry'
  | 'io'
  | 'logic-group';
```

### Important principle

- `Rack`, `Face`, `Container`, and `Cell` are all composable nodes.
- They share the same recursive model.
- They differ by role, not by being different systems.

---

## 5. Templates vs Instances

There is a critical distinction:

### CellTemplate
Reusable catalog definition.

Example:
- `roland_knob`
- `filmstrip_vu_meter`
- `ssl_button`
- `moog_panel_screw`

A template defines the default structure, layers, and behavior.

### OmegaNode
Concrete instance inside a rack/module.

Example:
- `cutoff_knob`
- `mix_slider`
- `level_led`

An instance contains:
- `cellRef`
- `binding`
- `position`
- `size`
- `overrides`
- `children`

### Rule

The catalog contains templates.  
The manifest contains instances.

The manifest can embed or reference the templates/assets it uses so that the `.acepack` remains self-contained.

---

## 6. Packaging Model

### `.acemm`
Visual manifest file for the module.

Contains:
- tree of nodes,
- bindings,
- layout,
- styles,
- references to assets and templates.

### `.acepack`
Autocontained distributable package.

Contains:
- `.wasm` engine,
- `.acemm` visual manifest,
- assets,
- fonts,
- styles,
- template library used,
- metadata,
- optional signature/version information.

### Asset types

- PNG
- SVG
- filmstrip
- font
- CSS
- preview audio
- metadata JSON

---

## 7. Editor Role

The web editor is a visual authoring environment, not the runtime source of truth for core cells.

The editor should:
- inspect the tree,
- edit nodes,
- manage bindings,
- select templates,
- manage assets,
- edit style tokens,
- export `.acepack`,
- render previews.

The editor must not hardcode core cells as React-only primitives when those cells are meant to be distributable artifacts.

---

## 8. DRY Governance Components

To stay DRY, the editor should use shared “intelligent” controls that adapt based on capabilities.

### Examples

- `ColorTokenPicker`
  - Reads the 13 rack/theme colors.
  - Applies semantic tokens instead of raw hex when possible.

- `AssetPicker`
  - Reads JSON asset registries.
  - Supports fixed image, filmstrip, and sequence modes.

- `FontTokenPicker`
  - Picks from the 4 theme fonts.

- `StyleVariantPicker`
  - Selects reusable material or surface variants.

- `BindingPicker`
  - Connects to DSP contract parameters or ports.

### Rule

The inspector does not edit “knobs” or “leds”.  
It edits cells with capabilities.

That is how the architecture scales without creating a different panel for every element type.

---

## 9. UCA Phase 0

Phase 0 is documentation and stabilization.

### Goals
- Write the architecture clearly.
- Align naming.
- Avoid breaking the current editor immediately.
- Keep the model additive.

### Deliverable
Create:

- `docs/UNIVERSAL_CELL_ARCHITECTURE.md`

This document should define:
- Rack
- Face
- Container
- Cell
- Template
- Instance
- Asset
- Binding
- Acepack
- ownership rules between DSP and UI

---

## 10. UCA Phase 1

Phase 1 is the additive contract.

### Additions
Create a new contract for the tree model:

- `OmegaNode`
- `CellTemplate`
- `CellKind`
- `NodeKind`
- `NodeRole`

### Required properties
A node should support:
- `id`
- `kind`
- `role`
- `cellRef`
- `bind`
- `pos`
- `size`
- `style`
- `children`

### Constraints
- Do not replace the current editor renderer yet.
- Do not remove legacy manifest structures yet.
- Do not rewrite the full UI in this phase.
- Keep the new contract additive.

---

## 11. Migration Strategy

The current editor already has a large amount of structure and attachment logic.

The correct move is:
1. stabilize the current codebase,
2. introduce the UCA contract,
3. add conversion helpers,
4. then move rendering and UI step by step.

This avoids mixing a new architecture with an unstable base.

---

## 12. Validation Criteria

### Structural
- The tree model is explicit and documented.
- Cells are universal nodes with roles.
- Templates and instances are clearly separated.

### Packaging
- A module can be packaged as `.acepack`.
- The package is self-contained.
- The visual manifest and DSP engine remain separate but linked by contract.

### DRY / UX
- The editor uses shared intelligent pickers.
- Color, asset, and font governance is centralized.
- No duplicated special-case inspector panels are introduced if a capability-based control can serve the same need.

### Compatibility
- Existing docs and editor direction remain coherent.
- The architecture can be introduced without immediately rewriting everything.

---

## 13. Notes

- `.wasm` is the authority for logic/DSP.
- `.acemm` is the authority for visual/layout description.
- `bind` must match exported contract IDs from the DSP engine.
- `omega-ui-core` remains the visual source of truth shared by editor and ABDOmega.
- UCA is the internal visual composition model, not a replacement for the DSP contract.

---


# Implementation Plan: Stabilization Gate + Universal Cell Architecture (UCA)
## ABDOmega / OMEGA Manifest Editor

**Status:** DRAFT  
**Date:** 2026-05-12  
**Related:** SPEC: Universal Cell Architecture (UCA) — Phase 0/1

---

## Objective

Stabilize the current codebase, reduce duplication in the manifest editor, and introduce the Universal Cell Architecture as an additive model without breaking the existing editor flow.

This plan is intentionally staged:
1. stabilize the repo,
2. document the architecture,
3. add the new contract,
4. add conversion helpers,
5. prepare experimental rendering,
6. move the UI to hierarchical editing later.

---

## Phase 0 — Stabilization Gate

### Goal
Get the current editor base into a trusted state before introducing the UCA contract.

### Tasks

- [ ] Run `tsc --noEmit` and record the real failures.
- [ ] Run `eslint --quiet` and record the real failures.
- [ ] Fix direct TypeScript errors in the manifest editor core first.
- [ ] Remove accidental duplicated imports and broken references.
- [ ] Resolve missing icon/component imports in inspector and governance panels.
- [ ] Replace obvious `any` usages in the current hot paths only when they block compilation.
- [ ] Confirm the editor still boots after each small fix batch.

### Acceptance criteria
- `tsc` is clean.
- `eslint --quiet` is clean.
- The manifest editor still opens.
- No new architectural changes are introduced in this phase.

---

## Phase 1 — Architecture Document

### Goal
Write the canonical architecture note before changing runtime behavior.

### Tasks

- [ ] Create `docs/UNIVERSAL_CELL_ARCHITECTURE.md`.
- [ ] Define `Rack`, `Face`, `Container`, `Cell`, `Layer`, and `Asset`.
- [ ] Define the separation between `CellTemplate` and `OmegaNode`.
- [ ] Define the boundary between `.wasm`, `.acemm`, and `.acepack`.
- [ ] Define ownership rules:
  - `.wasm` = logic / DSP authority.
  - `.acemm` = visual / layout authority.
  - `.acepack` = distributable bundle.
- [ ] Define the DRY inspector philosophy:
  - `ColorTokenPicker`
  - `AssetPicker`
  - `FontTokenPicker`
  - `StyleVariantPicker`
  - `BindingPicker`

### Acceptance criteria
- The document can be read as the source of truth for Phase 1 and beyond.
- The document does not contradict the current bundle state.

---

## Phase 2 — Additive UCA Contract

### Goal
Introduce the new tree model without replacing the current manifest model yet.

### Tasks

- [ ] Add a new UCA contract file, for example `uca.ts` or `node.ts`.
- [ ] Define `CellKind`.
- [ ] Define `NodeKind`.
- [ ] Define `NodeRole`.
- [ ] Define `OmegaNode`.
- [ ] Define `CellTemplate`.
- [ ] Add strict types for `id`, `kind`, `role`, `cellRef`, `bind`, `pos`, `size`, `style`, and `children`.
- [ ] Keep the legacy manifest types intact.

### Acceptance criteria
- The new contract compiles.
- No current renderer is broken.
- The new model is additive only.

---

## Phase 3 — Conversion Helpers

### Goal
Bridge legacy flat structures to the new tree model safely.

### Tasks

- [ ] Implement `manifestToOmegaTree(manifest)`.
- [ ] Implement `omegaTreeToManifest(tree)`.
- [ ] Preserve data loss as close to zero as possible.
- [ ] Map legacy containers and controls into tree nodes.
- [ ] Map attachments into cells or child nodes where appropriate.
- [ ] Add tests for round-trip behavior on representative samples.

### Acceptance criteria
- Legacy manifests can be converted into UCA trees.
- The converter does not destroy bindings or layout information.
- Round-tripping is deterministic for supported fields.

---

## Phase 4 — Experimental Renderer

### Goal
Create a recursive renderer behind a feature flag.

### Tasks

- [ ] Add `UniversalRenderer.ts` or equivalent.
- [ ] Implement recursive node traversal.
- [ ] Support child accumulation of position and layout offsets.
- [ ] Dispatch templates by `cellRef` or role.
- [ ] Keep the current renderer as the default path.
- [ ] Gate the new renderer behind a flag or experimental entrypoint.

### Acceptance criteria
- The new renderer can render a nested tree.
- The legacy renderer still works.
- No accidental replacement happens before the model is ready.

---

## Phase 5 — Hierarchical Inspector

### Goal
Update the UI to edit the tree directly once the contract is stable.

### Tasks

- [ ] Add a hierarchical tree inspector.
- [ ] Allow selecting nested children inside a cell.
- [ ] Allow editing of `CellTemplate`-backed nodes.
- [ ] Allow drag/drop into containers and groups.
- [ ] Expose capabilities-based editors instead of type-specific panels where possible.
- [ ] Reuse the shared pickers for color, assets, and fonts.

### Acceptance criteria
- The inspector works on the tree model.
- The UI remains DRY.
- Special-case panels are avoided when a capability-based control is enough.

---

## Phase 6 — Packaging Direction

### Goal
Prepare the architecture for `.acepack` export and third-party cells.

### Tasks

- [ ] Define the package layout under `public/assets/elements/cells`.
- [ ] Define cell metadata naming and discovery rules.
- [ ] Define what must be embedded in `.acepack`.
- [ ] Define how third-party cells are registered and resolved.
- [ ] Define how templates and assets are copied into the package when needed.

### Acceptance criteria
- The package model is explicit.
- The editor can reason about external cells as artifacts, not as React-only components.
- The format remains self-contained.

---

## Implementation Notes

- Do not jump to UCA UI refactors before the stabilization gate is closed.
- Do not split the editor into multiple competing inspector systems.
- Prefer shared intelligent pickers over one-off forms.
- Treat the manifest editor as a host/runtime for composable cells.
- Keep the architecture additive until the conversion layer is fully proven.

---

## Verification Checklist

### Stabilization
- [ ] `tsc --noEmit` passes.
- [ ] `eslint --quiet` passes.

### Contract
- [ ] `OmegaNode` exists and compiles.
- [ ] `CellTemplate` exists and compiles.
- [ ] Legacy manifest types still compile.

### Conversion
- [ ] A legacy manifest can be converted to tree form.
- [ ] The tree can be serialized back to a supported manifest shape.

### Rendering
- [ ] The experimental renderer handles nested nodes.
- [ ] The legacy renderer remains intact.

### UI
- [ ] The inspector can navigate nested cells.
- [ ] Shared pickers are reused across relevant panels.

### Packaging
- [ ] External cells have a clear package location.
- [ ] `.acepack` ownership is documented.
- [ ] The model remains self-contained.

---