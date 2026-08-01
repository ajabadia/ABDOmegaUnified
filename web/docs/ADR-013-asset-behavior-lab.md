# ADR-013: Phase 12 — Asset Behavior Lab & Layer Recipes

**Status:** PROPOSED / ACTIVE  
**Date:** 2026-05-12  
**Supersedes:** ADR-011 (Blueprint Studio), ADR-009 (Phase 9)

## Context
With the core manifest industrialization and blueprint injection engine certified (`SYS_READY`), the next bottleneck in the OMEGA ecosystem is the high-fidelity authoring of reusable controls. The current `UniversalCellEditorModal` handles basic fragment composition but lacks a formal model for how visual assets (filmstrips, statics) respond to input, state, and telemetry.

To reach industrial parity with tools like WebKnobMan while providing OMEGA-native advantages (genetic composition, recursive logic), the editor must evolve into an **Asset Behavior Lab**.

## Decision
Phase 12 implements the **Asset Behavior Lab** (ABL), shifting the focus from ad-hoc property editing to guided genetic authoring.

### 1. Formal Asset Behavior Model
We introduce the `AssetBehavior` interface as a first-class citizen of the UCA model.
- **Behavior Presets**: Pre-defined logic for common controls (`rotary`, `slider`, `switch`, `button`, `meter`, `led`, `display`).
- **Semantic Mapping**: Explicitly mapping input sources (Value, State, Telemetry) to visual frames or CSS transforms via `BehaviorMapping`.
- **Normalization Layer**: A centralized `BehaviorResolver` that translates runtime values into visual frame indices, ensuring consistency between the Lab and the Runtime.

### 2. Layer Recipes (Multi-Asset Composition)
We transition from flat fragment lists to a **Layer Recipe** model.
- **Compositional Stacking**: Guided assembly of cells using a stack of assets (e.g., Body + Indicator + Glare + Label).
- **Role-Based Layers**: Each layer in a recipe is assigned a role (base, overlay, mask) and can independently reference a behavior preset.
- **DNA Export**: Authored recipes are saved as `CellTemplates` (Blueprints) with persistent genetic constraints.

### 3. Guided Authoring UX
The UI is refactored into a wizard-like experience:
- **Preset Selection**: "What do you want to build?" (Knob, Meter, Plate).
- **Behavior Mapping Inspector**: Focused interface for frame-range and polarity adjustment.
- **Visual Scrubbing**: Real-time simulation of input values in the preview pane to validate behavior before save.

## Consequences

### Positive
- **Authoring Speed**: Preset-based wizards reduce the time to create a custom control from minutes to seconds.
- **Visual Fidelity**: Layer recipes allow for complex, professional-looking controls through multi-asset stacking.
- **Genetic Integrity**: Behavior is encoded into the blueprint itself, ensuring it works immediately upon injection.
- **DRY Architecture**: Converges multiple scattered sequence/style governance modules into a single `AssetBehaviorGovernance` pipeline.

### Negative
- **Migration Complexity**: Coexisting with legacy style-driven filmstrip properties requires robust adapters in the renderer.
- **Contract Overhead**: The `CellTemplate` and `OmegaNode` interfaces grow to accommodate the behavior model.

## Implementation Roadmap

### Phase 12.1: Contract & Normalization (DONE)
- [x] Define `AssetBehavior` and `BehaviorMapping` types.
- [x] Integrate `assetBehavior` into `OmegaNode` and `CellTemplate`.
- [x] Implement `BehaviorResolver.ts` logic.
- [x] Support `forceFrame` in `CellRenderer` and `SequenceRenderer`.

### Phase 12.2: Lab Foundation (DONE)
- [x] Refactor `UniversalCellEditorModal` into `AssetBehaviorLab`.
- [x] Implement `AssetBehaviorPresetSelector`.
- [x] Implement `BehaviorMappingInspector`.

### Phase 12.3: Layer Recipes (Commit 3 - ACTIVE)
- [ ] Implement `LayerRecipeEditor` for visual stacking.
- [ ] Add support for multiple assets in a single cell composition.
- [ ] Enable DNA export of complex recipes.

### Phase 12.4: Integration & Refinement
- [ ] Add real-time value scrubbing UI.
- [ ] Update Gallery to highlight Lab-authored blueprints.
- [ ] Finalize genetic constraints for behavior-locked nodes.

## Validation Criteria
1. **Behavior Parity**: A rotary knob authored in the Lab must behave identically in the Virtual Rack after injection.
2. **Composition Stability**: Multi-layer recipes must preserve their Z-order and opacity after export/import.
3. **Legacy Safety**: Existing manifests using legacy filmstrip fields must continue to render correctly.

---
**Proposed by:** OMEGA Engineering Team  
**Standards:** Industrial Era 7.2.3 / Phase 12
