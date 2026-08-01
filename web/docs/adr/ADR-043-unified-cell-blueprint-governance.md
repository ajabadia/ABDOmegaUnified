# ADR-043: Unified Cell & Blueprint Governance Under UCA

**Status:** ACCEPTED  
**Date:** 2026-06-01  
**Supersedes:** None  
**Related:** ADR-015 (Unified Cell Studio), ADR-041 (Dual-Mode Validation), ADR-042 (Two-Phase Validation), ADR-046 (Cell Philosophy)

**Foundational Dependency**: ADR-046 (Cell Philosophy Redesign) defines the Primitive/Composite/Structural types. ADR-043 establishes governance rules over those types. ADR-046 must be implemented first to provide the type definitions that ADR-043 governs.

## Context

Currently, the OMEGA system has fragmented governance systems for different levels of the UI hierarchy:

1. **Cells** (individual controls) use `OMEGA_ELEMENT_CATALOG` for element definitions
2. **Blueprints** (templates) have their own validation via `BlueprintValidator`
3. **CellStudioContainer** has its own `IndustrialGovernanceConsole` for styling
4. **Manifest** has `ui.styles`, `ui.palette`, `ui.colors` for global theming

This fragmentation creates:
- Inconsistent validation rules between cells and blueprints
- Duplicated governance logic in different parts of the system
- Confusion about which system has authority (Catalog vs Manifest styles vs Studio governance)
- Difficulty maintaining coherence as the system scales

## Decision

Establish **UCA (Universal Cell Architecture) as the single source of truth** for all UI governance, unifying:

1. **Element Catalog** → Becomes the canonical registry for all cell types
2. **Style Variants** → Derived from catalog, overridden by manifest
3. **Blueprint Validation** → Uses catalog rules + manifest resources
4. **Cell Studio** → Operates within catalog constraints, exports to manifest format

### Unified Governance Hierarchy

```
OMEGA_ELEMENT_CATALOG (Registry)
    ├── Primitive Types (knob, slider, port, led, etc.)
    ├── Default Variants (A_cyan, B_amber, etc.)
    ├── Slot Definitions (what can attach where)
    └── Capability Constraints (what behaviors are allowed)
           ↓ Inherit/Override
MANIFEST.ui.styles (Instance Customization)
    ├── Style Variants (custom themes)
    ├── Color Tokens (palette override)
    └── Typography (font families, sizes)
           ↓ Validate
BLUEPRINT.validator (Runtime Gate)
    ├── Catalog Rules (cellRef must exist in catalog)
    ├── Style Rules (variant must be defined)
    └── Resource Rules (assets must exist in manifest)
           ↓ Compose
CELL_STUDIO (Authoring Environment)
    ├── Uses Catalog as constraints
    ├── Exports CellTemplate (ModuleTemplate)
    └── Freezes to Blueprint-compatible format
```

### Catalog as Single Source of Truth

```typescript
// Current: Fragmented
OMEGA_ELEMENT_CATALOG        // Cell definitions only
manifest.ui.styles           // Separate styling system
BlueprintValidator           // Custom validation rules

// Proposed: Unified
OMEGA_ELEMENT_CATALOG        // Primary registry
├── cellTypes: Record<string, CellTypeDefinition>
├── variants: Record<string, StyleVariant>
├── slotDefinitions: SlotDefinition[]
└── validationRules: ValidationRule[]

// BlueprintValidator imports from catalog
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';

class BlueprintValidator {
  validate(nodes, manifest) {
    for (const node of nodes) {
      // Use catalog rules for validation
      const cellType = OMEGA_ELEMENT_CATALOG.find(node.cellRef);
      if (!cellType) {
        throw new Error(`Unknown cell type: ${node.cellRef}`);
      }
      // Validate variant exists in catalog or manifest
      // Validate bindings against cellType capabilities
    }
  }
}
```

### Unified Validation Interface

```typescript
interface UCAValidationContext {
  catalog: typeof OMEGA_ELEMENT_CATALOG;
  manifest: OMEGA_Manifest;
  blueprint?: BlueprintDefinition;
}

class BlueprintValidator {
  // Now accepts UCAValidationContext
  static validate(nodes: OmegaNode[], context: UCAValidationContext): void {
    // Use context.catalog for cell type validation
    // Use context.manifest for resource validation
    // Use context.blueprint for placeholder validation
  }
}
```

## Consequences

### Positive

- **Single Authority**: No more conflicting rules between systems
- **Consistency**: All UI elements follow the same governance patterns
- **Maintainability**: Changes to rules only happen in one place (catalog)
- **Discoverability**: Developers only need to understand one system
- **Validation Reuse**: Catalog rules used by both BlueprintValidator and CellStudio

### Negative

- **Migration Effort**: Existing code using separate governance systems needs refactoring
- **Breaking Changes**: CellStudioContainer governance must be updated to use catalog
- **Initial Complexity**: The unified catalog must be comprehensive to replace multiple systems

### Trade-offs

The unified governance trades short-term migration complexity for long-term maintainability and coherence.

## Validation Criteria

1. **Catalog Coverage**: All cell types and variants are defined in `OMEGA_ELEMENT_CATALOG`
2. **Validation Consistency**: `BlueprintValidator` uses catalog rules, not custom logic
3. **Cell Studio Alignment**: `CellStudioContainer` operates within catalog constraints
4. **No Duplication**: No separate governance systems for styles, colors, or element definitions

## Implementation Notes

### Governance Scope

Governance applies at different levels:
- **Primitives**: Defined and validated by `OMEGA_ELEMENT_CATALOG` only (type, allowed variants, slot definitions)
- **Composites (Cells)**: Governed by catalog (type/variant) + manifest (style overrides, custom colors)
- **StructuralModules**: Governed by their contained cells; the module itself has layout strategy but no independent style governance

This means:
- Adding a new primitive requires updating the catalog
- Customizing a cell's appearance uses manifest styles (override catalog defaults)
- A StructuralModule's visual identity comes from its cells, not from the module

### Phase 1: Catalog Enrichment

---

**Certified by:** OMEGA Engineering  
**Standards:** Era 7.2.3 - UCA Phase 27