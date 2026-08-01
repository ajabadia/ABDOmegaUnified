# ADR-043 Analysis: OMEGA_ELEMENT_CATALOG Enrichment Proposal

**Date:** 2026-06-01  
**Status:** Analysis for Implementation  
**Related:** ADR-043 (Unified Governance), ADR-046 (Cell Philosophy)

---

## Current State Analysis

### OMEGA_ELEMENT_CATALOG Structure (Current)

```typescript
interface ElementDefinition {
  id: string;                    // e.g., 'knob', 'port', 'led'
  label: string;                 // Human-readable name
  category: ElementCategory;     // 'infrastructure' | 'signal' | 'io' | 'telemetry' | 'mechanical' | 'decor' | 'rack'
  description: string;
  icon: string;
  capabilities: AestheticCapability[];  // 40+ capabilities (variant, color, asset, etc.)
  attachmentRole: 'host' | 'fragment' | 'both' | 'none';
  allowedFragments?: string[];   // Advisory only - not enforced
  cssSelector?: string;
  defaultAssetPath?: string;
  supportedAssetModes?: ('static' | 'sequence')[];
}
```

**Current Usage:**
- `CellStudioContainer.tsx` - Element selection UI
- `IdentityGovernance.tsx` - Variant/asset selection
- `LogicSection.tsx` - Component type filtering
- `AttachmentTypeAnchor.tsx` - Fragment availability
- `ModuleStyleLibrary.tsx` - Style variant management
- `governanceUtils.ts` - Helper functions

### ADR-046 PrimitiveType Mapping

The new ADR-046 types use simplified `PrimitiveType`:
```typescript
type PrimitiveType = 'knob' | 'slider' | 'port' | 'led' | 'display' | 'switch' | 'button' | 'label';
```

**Current catalog IDs that map to Primitives:**
| PrimitiveType | Catalog ID(s) | Notes |
|---------------|---------------|-------|
| `knob` | `knob` | Direct mapping |
| `slider` | `slider-v`, `slider-h` | Split into V/H variants |
| `port` | `port` | Direct mapping |
| `led` | `led` | Direct mapping |
| `display` | `display` | Direct mapping |
| `switch` | `switch` | Direct mapping |
| `button` | (missing) | No 'button' in catalog! Uses 'stepper' or 'switch' |
| `label` | `label` | Direct mapping |

**Gaps Identified:**
- `button` primitive type doesn't exist in catalog (ADR-046 has it)
- `slider-v` and `slider-h` in catalog map to single `slider` in ADR-046

---

## Gaps vs ADR-043 Requirements

ADR-043 specifies the catalog should be the single source of truth with:

1. **❌ Slot Definitions** - No explicit slot definitions per element type
   - ADR-046 defines `Slot { position, capacity, accepts }`
   - Current: `allowedFragments` is advisory string array only
   
2. **❌ Validation Rules** - No runtime validation rules
   - ADR-043 wants: `validationRules: ValidationRule[]`
   - Current: BlueprintValidator has hardcoded rules

3. **❌ Variant Registry** - Variants defined elsewhere (IndustrialGovernanceConsole)
   - ADR-043 wants: `variants: Record<string, StyleVariant>`
   - Current: Variants scattered in UI components

4. **❌ Behavior Constraints** - No behavior preset validation
   - ADR-046 defines `BehaviorPreset = 'rotary' | 'filmstrip' | 'stepped' | 'binary' | 'linear' | 'display'`
   - Current: No catalog-level behavior validation

5. **❌ Integration with BlueprintValidator** - Catalog not used for validation
   - ADR-043 wants: BlueprintValidator uses catalog rules
   - Current: Custom validation logic duplicate catalog capabilities

---

## Proposed Enrichment

### Extended ElementDefinition

```typescript
// NEW: Validation rule using schema-based approach (not functions - can be serialized)
interface ValidationRule {
  capability: AestheticCapability;
  type: 'range' | 'pattern' | 'enum' | 'required';
  config: {
    min?: number;
    max?: number;
    pattern?: string;          // Regex pattern for strings
    values?: unknown[];        // For enum type
  };
  errorMessage: string;
}

// NEW: Variant definition
interface CatalogVariant {
  id: string;                    // e.g., 'A_cyan', 'B_amber'
  label: string;
  overrides: Partial<OmegaStyleNode>;
}

// NEW: Slot definition using string literals (foundation - no ADR-046 dependency)
interface CatalogSlot {
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'overlay';
  capacity: number;              // Max decorators
  accepts: string[];             // Element IDs that can be placed (catalog references)
}

// Extended ElementDefinition
interface EnrichedElementDefinition extends ElementDefinition {
  // Slot definitions (replaces allowedFragments advisory)
  slots?: CatalogSlot[];
  
  // Behavior constraints
  allowedBehaviors?: BehaviorPreset[];
  
  // Validation rules for this element type
  validationRules?: ValidationRule[];
  
  // Style variants defined at catalog level
  variants?: CatalogVariant[];
}
```

### Variant Registry Structure

```typescript
// Centralized variant registry
interface VariantRegistry {
  // Size prefix variants (A_, B_, C_, D_)
  sizePrefixes: string[];
  
  // Color suffix variants
  colorSuffixes: Record<string, string>;  // 'cyan' -> '#00f0ff', 'amber' -> '#ffbf00'
  
  // Predefined industrial variants
  industrialVariants: CatalogVariant[];
}

// Resolution priority (single source of truth)
// OMEGA standard: 'catalog-first' - catalog defines base variants, manifest can override
type VariantResolutionPriority = 'catalog-first' | 'manifest-first' | 'catalog-only';
const DEFAULT_VARIANT_RESOLUTION: VariantResolutionPriority = 'catalog-first';
```

### Validation Rule Examples (Schema-Based)

```typescript
// For 'knob' element - using schema instead of functions
const knobValidationRules: ValidationRule[] = [
  {
    capability: 'variant',
    type: 'pattern',
    config: { pattern: '^[A-D]_(cyan|amber|red|green)$' },
    errorMessage: 'Knob variant must match pattern [A-D]_[color]'
  },
  {
    capability: 'size',
    type: 'range',
    config: { min: 40, max: 200 },  // Applies to both width and height
    errorMessage: 'Knob size must be between 40 and 200'
  }
];

// For 'port' element
const portValidationRules: ValidationRule[] = [
  {
    capability: 'variant',
    type: 'enum',
    config: { values: ['mono', 'stereo', 'insert'] },
    errorMessage: 'Port variant must be mono, stereo, or insert'
  }
];

// Validation function (outside catalog, in validator code)
function validateAgainstRule(node: OmegaNode, rule: ValidationRule): string | null {
  const value = node.style?.[rule.capability as keyof OmegaStyleNode];
  
  switch (rule.type) {
    case 'pattern':
      return new RegExp(rule.config.pattern!).test(String(value)) ? null : rule.errorMessage;
    case 'range':
      const num = Number(value);
      return (num >= rule.config.min! && num <= rule.config.max!) ? null : rule.errorMessage;
    case 'enum':
      return rule.config.values!.includes(value) ? null : rule.errorMessage;
    case 'required':
      return value !== undefined ? null : rule.errorMessage;
  }
}
```

---

## Implementation Phases

### Phase 1: Add PrimitiveType Mapping
```typescript
// In ElementCatalog.ts - add primitiveType field to each element
{
  id: 'knob',
  primitiveType: 'knob',  // NEW
  // ... rest unchanged
}
```

### Phase 2: Add Slot Definitions
```typescript
// Replace allowedFragments with proper slot definitions
{
  id: 'knob',
  slots: [
    { position: 'top', capacity: 1, accepts: ['label', 'led'] },
    { position: 'bottom', capacity: 1, accepts: ['label'] },
  ],
  // Remove allowedFragments (or deprecate it)
}
```

### Phase 3: Add Validation Rules
```typescript
// Add validationRules to elements that need it
{
  id: 'knob',
  validationRules: [
    { capability: 'size', validator: sizeValidator, errorMessage: '...' },
  ]
}
```

### Phase 4: BlueprintValidator Integration (depends on ADR-044)

```typescript
// BlueprintValidator uses catalog rules
// NOTE: Depends on ADR-044 implementation - validation functions in separate module
import { validateAgainstRule } from './validationFunctions';

class BlueprintValidator {
  static validate(nodes: OmegaNode[], manifest: OMEGA_Manifest) {
    for (const node of nodes) {
      const def = getElementDefinition(node.cellRef);
      if (!def) throw new Error(`Unknown cell type: ${node.cellRef}`);
      
      // Run catalog validation rules
      for (const rule of def.validationRules ?? []) {
        const error = validateAgainstRule(node, rule);
        if (error) throw new Error(error);
      }
    }
  }
}
```

**Dependency Note:** Phase 4 requires ADR-044 to be implemented first as it establishes the validation function pattern.

---

## Migration Notes

1. **Backward Compatibility**: `allowedFragments` kept as deprecated, `slots` takes precedence
2. **Gradual Adoption**: Add fields incrementally without breaking existing consumers
3. **Type Safety**: New interfaces are optional additions, not replacements

---

## Files to Modify

1. `src/omega-ui-core/governance/ElementCatalog.ts`
   - Add new interfaces (`ValidationRule`, `CatalogVariant`, `CatalogSlot`)
   - Add `primitiveType` mapping
   - Add `slots`, `validationRules`, `variants` fields
   - Add helper functions for slot validation

2. `src/omega-ui-core/uca/blueprintValidator.ts` (ADR-044)
   - Import catalog and use validation rules

---

## Open Questions

1. Should `allowedFragments` be deprecated or kept for backward compatibility?
2. How to handle variants that exist in manifest but not in catalog?
3. Should validation rules be centralized or per-element?