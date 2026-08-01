# ADR-046: Cell Philosophy Redesign — Atomic, Composite, Structural

**Status:** ACCEPTED  
**Date:** 2026-06-01  
**Supersedes:** None  
**Related:** ADR-043 (Unified Governance), ADR-045 (CellStudio Refactor)

## Context

The current `OmegaNode` is oversized and conflates multiple responsibilities:

```typescript
// Current: 15+ properties, many optional, unclear semantics
interface OmegaNode {
  id: string;
  kind: NodeKind;           // 'cell', 'container', 'rack', etc.
  role?: NodeRole;          // Ambiguous - structural vs functional
  cellRef?: string;         // Which renderer to use
  bind?: string;            // DSP binding
  layout: {                 // Conflates position + arrangement mode
    pos, size, transform, zIndex, 
    mode?, gap?, padding?,  // These are arrangement, not position
    align?, justify?
  };
  style: OmegaStyleNode;    // 60+ properties, many rarely used
  children?: OmegaNode[];   // Hierarchy
  ports?: UCA_Port[];       // Signal routing
  modulationTargets?: string[];
  signalPath?: string;
  overrides?: Record;
  constraints?: OmegaConstraints;
  slotMappings?: Record;
  templateRef?: string;
  snapshot?: OmegaNode;
  meta?: Record;
  visible?, locked?         // UI state, not domain
}
```

**Problems:**
1. **Property bloat**: 60+ style properties, many derivable
2. **Conflated layout**: Position (pos, size) mixed with arrangement (mode, gap)
3. **Role ambiguity**: `kind` and `role` overlap semantically
4. **UI state pollution**: `visible`, `locked` are runtime concerns, not domain
5. **Binding complexity**: `bind`, `signalPath`, `modulationTargets` all relate to routing but differently

## Decision

Redefine the cell architecture with **three clear levels of abstraction**:

### Level 1: Primitive (Atomic)

The smallest renderable unit. **Only knows how to render itself.**

```typescript
interface PrimitiveNode {
  id: string;
  type: PrimitiveType;  // 'knob' | 'slider' | 'port' | 'led' | 'display' | 'switch' | 'label'
  variant: string;      // Visual variant (e.g., 'A_cyan', 'B_amber')
  position: Position;   // Only absolute position in parent
  size: Dimensions;
  binding?: Binding;    // Simplified DSP binding { parameter: string, mode: BindingMode }
}

// Binding simplified
interface Binding {
  parameter: string;    // e.g., "filter.cutoff"
  mode: 'continuous' | 'steps' | 'binary';
  polarity?: 'unipolar' | 'bipolar';
  modulation?: {
    targets: ModulationTarget[];  // What can modulate this binding
    depth?: number;               // Max modulation depth
  };
}

interface ModulationTarget {
  id: string;           // Cell ID that can modulate
  port: string;         // Which port provides modulation
  amount: number;       // Default modulation amount (0-1)
}
```

**Principles:**
- No children
- No state (value comes from outside via binding)
- No layout logic (position is absolute within parent container)
- Render-only: `PrimitiveRenderer.render(type, variant, position, size, binding)`

### Level 2: Composite (Cell)

A Primitive plus **slots for decoration** and **behavior configuration**.

```typescript
interface CompositeCell {
  id: string;
  primitive: PrimitiveNode;
  
  // Slots for decoration
  slots: {
    position: SlotPosition;  // 'top' | 'bottom' | 'left' | 'right' | 'center' | 'overlay'
    capacity: number;        // 1 or many
    accepts: PrimitiveType[]; // What can be placed here
  }[];
  
  // Decoration instances
  decorators: {
    position: SlotPosition;
    primitive: PrimitiveNode;  // Label, LED, etc.
  }[];
  
  // Behavior (without AssetBehavior complexity)
  behavior: {
    preset: BehaviorPreset;  // 'rotary' | 'filmstrip' | 'stepped' | 'binary'
    config: Record<string, unknown>;  // Preset-specific config
  };
}

// Valid behavior presets (from industry research)
type BehaviorPreset = 
  | 'rotary'      // Continuous rotation (knobs)
  | 'filmstrip'   // Frame sequence (animated knobs)
  | 'stepped'     // Discrete steps (selectors)
  | 'binary'      // On/off (switches, buttons)
  | 'linear'      // Linear mapping (sliders)
  | 'display';    // Value display (screens)
```

**Principles:**
- One primitive as "host" (the main control)
- Slots define where decorators can attach
- Decorators are primitives placed in slots
- Behavior is configuration, not implementation

### Level 3: Structural (Module/SupraCell)

A composition of Cells plus **layout strategy** and **internal routing**.

```typescript
interface StructuralModule {
  id: string;
  label: string;
  
  // Cells in this module
  cells: CompositeCell[];
  
  // Layout strategy
  layout: LayoutStrategy;
  
  // Internal signal routing (between cells in this module)
  internalRoutes: {
    from: string;   // Cell ID + port
    to: string;     // Cell ID + port  
    type: 'audio' | 'cv' | 'gate' | 'modulation';
  }[];
  
  // External interface (ports that connect outside)
  interface: {
    inputs: UCA_Port[];
    outputs: UCA_Port[];
  };
}

type LayoutStrategy = 
  | { type: 'stack'; direction: 'v' | 'h'; gap: number; align?: 'start' | 'center' | 'end' }
  | { type: 'grid'; columns: number; gap: number }
  | { type: 'absolute' };  // Cells have explicit positions
```

**Principles:**
- Module is the unit of screen arrangement
- Internal routing is explicit and validated
- Module has external interface (like a BP has ports)
- Modules can be nested (Module contains Modules)

### Equivalence with Existing Concepts

| New Concept | Current Equivalent | Notes |
|-------------|-------------------|-------|
| `PrimitiveNode` | Part of `OmegaNode` | Simplified, render-only |
| `CompositeCell` | `OmegaNode` (kind='cell') | Primitive + Slots + Decorators |
| `StructuralModule` | `OmegaNode` (kind='container') or `BlueprintDefinition` | Screen-arranged vs template |
| `BlueprintDefinition` | StructuralModule + placeholders + metadata | Templates for instantiation |

### Migration Path

```typescript
// Phase 1: Introduce new types alongside existing
type CellNode = PrimitiveNode | CompositeCell | StructuralModule;

// Phase 2: Add conversion utilities
function omegaNodeToCellNode(node: OmegaNode): CompositeCell { ... }
function cellNodeToOmegaNode(cell: CompositeCell): OmegaNode { ... }

// Phase 3: Deprecate OmegaNode complex properties
@deprecated use 'layout.mode' instead of implicit arrangement via children
@deprecated use 'behavior' instead of 'assetBehavior'
@deprecated use 'binding' instead of 'bind' + 'signalPath'

// Phase 4: Full migration
type OmegaNode = CellNode;  // Simple alias
```

## Consequences

### Positive

1. **Clear Abstraction**: Developers understand Primitive → Composite → Structural
2. **Single Responsibility**: Each level has one job
3. **Simplified Validation**: Rules are level-specific (Primitives can't have children)
4. **Industry-Aligned**: Matches patterns from JUCE, VST SDK, modular synths
5. **Testability**: Each level can be tested independently

### Negative

1. **Migration Effort**: Existing OmegaNodes must be converted
2. **Two Systems**: During transition, both old and new exist
3. **Learning Curve**: Team must learn new mental model

### Trade-offs

The clarity and testability gains far outweigh the migration cost.

## Validation Criteria

1. **Type Coverage**: All current cell types map to new types
2. **Rendering Parity**: Existing cells render identically with new types
3. **Validation Simplification**: BlueprintValidator rules become level-specific
4. **No Property Inflation**: New types have <20 properties each
5. **Modulation Support**: Binding model includes modulation targets for CV/gate routing

## Industry Best Practices (from research)

### From Audio Industry (JUCE/VST SDK):
- **Separate DSP from UI**: Primitives are pure rendering
- **ValueTree for state**: Binding is the only connection
- **Component inheritance**: Base classes with specialized overrides

### From Modern Design Systems (Material/Carbon):
- **Compound Components**: Compose from primitives
- **Slot-based APIs**: Explicit attachment points
- **Headless hooks**: Logic separate from rendering

---

**Certified by:** OMEGA Engineering  
**Standards:** Era 7.2.3 - UCA Phase 27.3