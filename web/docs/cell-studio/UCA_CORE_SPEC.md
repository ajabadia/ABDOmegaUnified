# SPEC: Universal Cell Architecture (UCA) — Core Specification
## OMEGA Manifest Editor / Cell Studio

**Status:** ACTIVE (MIGRATED TO PHASE 15)
**Related:** OMEGA_ENGINEERING_MANIFEST_SPEC, docs/cell-studio/ASSET_BEHAVIOR_LAB_ADR.md

---

## 1. Vision

The Universal Cell Architecture (UCA) is the modular foundation of the OMEGA ecosystem. It treats every UI element—from a simple screw to a complex multi-layered knob—as a composable **Cell**. 

The goal is to enable a recursive, hierarchical composition model where visual assets, behavioral logic, and structural bindings are encapsulated into reusable artifacts called **CellTemplates**.

---

## 2. Universal Cell Model

The universal conceptual unit is **Cell**. A Cell can be a screw, a background panel, a knob, a display, a VU meter, a port, a container, or a composite module section.

### Cell taxonomy
- `decor`: Non-interactive visual elements.
- `mechanical`: Functional but non-input parts (screws, plates).
- `control`: User input elements (knobs, sliders, buttons).
- `telemetry`: Visual feedback elements (LEDs, meters).
- `io`: Ports and connectors.
- `container`: Logical or visual grouping nodes.
- `composite`: High-level assemblies of cells.

---

## 3. Hierarchical Tree

The architecture is hierarchical and recursive:
```text
Rack
  Face / Plane
    Container / Group
      Cell
        Cell / Layer / Asset
```

### Important principle
`Rack`, `Face`, `Container`, and `Cell` are all composable nodes. They share the same recursive model and differ by role, not by system.

---

## 4. Templates vs Instances

### CellTemplate
A reusable catalog definition (e.g., `roland_knob`). It defines the default structure, layers, and behavior.

### OmegaNode
A concrete instance inside a manifest (e.g., `cutoff_knob`). It contains a `cellRef`, bindings, position, size, and instance-specific overrides.

---

## 5. Implementation Standard (Era 7.2.3)

A node must support the following core properties:
- `id`: Unique identifier.
- `kind`: Structural classification.
- `role`: Behavioral intent.
- `cellRef`: Reference to a `CellTemplate`.
- `bind`: Link to DSP contract parameter.
- `pos`: Local/Global coordinates.
- `size`: Dimensions.
- `style`: Aesthetic properties (tokens/overrides).
- `children`: Nested sub-nodes.

---
*MIGRATED FROM docs/cell editor - para más adelante/CELL.MD on 2026-05-12*
