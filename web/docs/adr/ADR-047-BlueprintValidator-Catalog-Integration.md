# ADR-047: BlueprintValidator Catalog Integration

**Status:** Accepted  
**Date:** 2026-06-02  
**Supersedes:** N/A  
**Superseded by:** N/A

---

## Context

Phase 20.4 introduced the BlueprintValidator class for OMEGA UCA structural integrity and invariant compliance. As OMEGA evolved through ADR-043 (ElementCatalog Enrichment) and ADR-046 (Cell Types), the need arose to validate node styles against the catalog's `validationRules` before instantiation.

The BlueprintValidator previously validated:
- Uniqueness of node IDs
- Structural cycles
- Cell integrity (cellRef, bindings)
- Asset resource existence

But it did **not** validate:
- Style property values against catalog validation rules
- Variant selection against catalog variants
- Behavior presets against allowed behaviors
- Slot mappings against catalog slot definitions

---

## Decision

Integrate BlueprintValidator with ElementCatalog to perform runtime validation of node styles, variants, behaviors, and slot mappings against the enriched catalog definitions.

### Architecture

```
BlueprintValidator.validateQuietly()
    └── traverseAndValidate()
            └── validateStyleAgainstCatalog()  ← NEW
                    ├── getElementDefinition(elementId)
                    ├── validateValueAgainstRule() for each rule
                    ├── getElementVariants() → validate variant
                    ├── getAllowedBehaviors() → validate behavior
                    └── getElementSlots() → validate slot mappings
```

### Key Design Decisions

1. **Schema-based validation (no functions in catalog)**: The catalog stores `ValidationRule` objects with serializable configs. The `validateValueAgainstRule()` function is implemented in code, not stored in the catalog.

2. **Error vs Warning distinction**: 
   - **Errors**: Validation rule failures (size out of range, invalid variant pattern)
   - **Warnings**: Non-blocking issues (slot mapping may not be allowed, element not in catalog)

3. **Graceful degradation for non-catalog elements**: If `cellRef`/`templateRef` doesn't exist in the catalog, validation is skipped with a warning.

4. **Public API for catalog introspection**: `getCatalogInfo()` method allows external consumers to inspect catalog element definitions.

---

## Implementation Details

### Files Modified

| File | Change |
|------|--------|
| `src/omega-ui-core/uca/blueprintValidator.ts` | Added catalog integration |
| `src/omega-ui-core/governance/ElementCatalog.ts` | Enhanced with validation helpers |

### Imports from ElementCatalog

```typescript
import {
  getElementDefinition,
  getAllowedBehaviors,
  getElementVariants,
  getElementSlots,
  validateValueAgainstRule,
  getPrimitiveTypeFromElement,
  type ValidationRule,
  type CatalogSlot
} from '../governance/ElementCatalog';
```

### New Methods

#### `validateStyleAgainstCatalog(node, errors, warnings)`

Validates a node's style against the ElementCatalog:

1. **Style Property Validation**: For each `validationRule` in the catalog element:
   - Extract value from `node.style[rule.capability]`
   - Call `validateValueAgainstRule(value, rule)`
   - Push error if validation fails

2. **Variant Validation**: If `node.style.variant` is set:
   - Get catalog variants via `getElementVariants(elementId)`
   - Check if variant ID exists in catalog
   - Push error with allowed variants list if invalid

3. **Behavior Validation**: If `node.meta.behavior` is set:
   - Get allowed behaviors via `getAllowedBehaviors(elementId)`
   - Check if behavior is in the allowed list
   - Push error with allowed behaviors list if invalid

4. **Slot Mapping Validation**: For each entry in `node.slotMappings`:
   - Find slot definition via `getElementSlots(elementId)`
   - Check if `slotTarget` matches `slot.accepts` (exact match or prefix match)
   - Push warning if not allowed

#### `getCatalogInfo(node)`

Public method returning catalog information for a node:

```typescript
{
  elementId: string | undefined;      // cellRef or templateRef
  primitiveType: string | undefined;  // ADR-046 primitive type
  validationRules: ValidationRule[] | undefined;
  allowedBehaviors: string[] | undefined;
  variants: { id: string; label: string }[];
  slots: CatalogSlot[];
}
```

### ValidationRule Schema

```typescript
interface ValidationRule {
  capability: AestheticCapability;  // e.g., 'size', 'variant', 'fontSize'
  type: 'range' | 'pattern' | 'enum' | 'required';
  config: {
    min?: number;         // For range type
    max?: number;         // For range type
    pattern?: string;     // For pattern type (regex)
    values?: unknown[];   // For enum type
  };
  errorMessage: string;
}
```

---

## Catalog Elements with ValidationRules

### Knob

```typescript
{
  id: 'knob',
  allowedBehaviors: ['rotary', 'filmstrip'],
  validationRules: [
    { capability: 'size', type: 'range', config: { min: 40, max: 200 }, 
      errorMessage: 'Knob size must be between 40 and 200 pixels' },
    { capability: 'variant', type: 'pattern', config: { pattern: '^[A-D]_(cyan|amber|red|green|ruby|jade)$' }, 
      errorMessage: 'Knob variant must match pattern [A-D]_[color]' }
  ],
  variants: [
    { id: 'A_cyan', label: 'Alabaster Cyan' },
    { id: 'B_amber', label: 'Brass Amber' },
    { id: 'C_ruby', label: 'Crimson Ruby' },
    { id: 'D_jade', label: 'Dark Jade' }
  ],
  slots: [
    { position: 'top', capacity: 1, accepts: ['label'] },
    { position: 'bottom', capacity: 1, accepts: ['label'] },
    { position: 'overlay', capacity: 2, accepts: ['led', 'port'] }
  ]
}
```

### Slider-V

```typescript
{
  id: 'slider-v',
  allowedBehaviors: ['linear', 'filmstrip'],
  validationRules: [
    { capability: 'size', type: 'range', config: { min: 40, max: 400 }, 
      errorMessage: 'Slider height must be between 40 and 400 pixels' }
  ],
  slots: [
    { position: 'left', capacity: 1, accepts: ['label'] },
    { position: 'right', capacity: 1, accepts: ['label'] },
    { position: 'overlay', capacity: 3, accepts: ['led', 'port'] }
  ]
}
```

### Port

```typescript
{
  id: 'port',
  validationRules: [
    { capability: 'variant', type: 'enum', config: { values: ['mono', 'stereo', 'insert', 'usb', 'hdmi'] }, 
      errorMessage: 'Port variant must be one of: mono, stereo, insert, usb, hdmi' }
  ]
}
```

### Display

```typescript
{
  id: 'display',
  allowedBehaviors: ['display'],
  validationRules: [
    { capability: 'fontSize', type: 'range', config: { min: 8, max: 72 }, 
      errorMessage: 'Display font size must be between 8 and 72 pixels' },
    { capability: 'precision', type: 'range', config: { min: 0, max: 6 }, 
      errorMessage: 'Display precision must be between 0 and 6 decimal places' }
  ]
}
```

### LED

```typescript
{
  id: 'led',
  allowedBehaviors: ['binary', 'stepped'],
  validationRules: [
    { capability: 'intensity', type: 'range', config: { min: 0, max: 1 }, 
      errorMessage: 'LED intensity must be between 0 and 1' }
  ],
  variants: [
    { id: 'led_cyan', label: 'Cyan LED' },
    { id: 'led_amber', label: 'Amber LED' },
    { id: 'led_red', label: 'Red LED' },
    { id: 'led_green', label: 'Green LED' }
  ]
}
```

---

## Usage Examples

### Basic Validation

```typescript
import { BlueprintValidator } from '@/omega-ui-core/uca/blueprintValidator';

const node = {
  id: 'gain-knob',
  kind: 'cell',
  cellRef: 'knob',
  layout: { pos: { x: 0, y: 0 } },
  style: { size: 80, variant: 'A_cyan' }
};

const result = BlueprintValidator.validateQuietly(node, manifest);
console.log(result.valid);      // true
console.log(result.errors);     // []
console.log(result.warnings);   // []
```

### Invalid Size

```typescript
const node = {
  id: 'huge-knob',
  kind: 'cell',
  cellRef: 'knob',
  style: { size: 300 }  // Out of range (40-200)
};

const result = BlueprintValidator.validateQuietly(node, manifest);
// result.valid = false
// result.errors = ["Catalog validation failed for \"huge-knob\" (knob): Knob size must be between 40 and 200 pixels [Rule: range, Capability: size]"]
```

### Invalid Variant

```typescript
const node = {
  id: 'bad-knob',
  kind: 'cell',
  cellRef: 'knob',
  style: { variant: 'X_purple' }  // Not in catalog
};

const result = BlueprintValidator.validateQuietly(node, manifest);
// result.errors = ["Invalid variant \"X_purple\" for \"bad-knob\" (knob). Allowed variants: A_cyan, B_amber, C_ruby, D_jade"]
```

### Get Catalog Info

```typescript
const info = BlueprintValidator.getCatalogInfo(node);
// {
//   elementId: 'knob',
//   primitiveType: 'knob',
//   validationRules: [...],
//   allowedBehaviors: ['rotary', 'filmstrip'],
//   variants: [{id: 'A_cyan', label: 'Alabaster Cyan'}, ...],
//   slots: [...]
// }
```

---

## Consequences

### Positive

1. **Runtime validation before instantiation**: Blueprints are validated against the catalog before materialization, catching configuration errors early.

2. **Centralized validation logic**: `validateValueAgainstRule()` is defined once and used by both ElementCatalog (for standalone style validation) and BlueprintValidator (for node validation).

3. **Consistent error messages**: Catalog-defined error messages ensure user-facing errors are consistent and informative.

4. **Extensible**: New elements can define validationRules in the catalog without code changes.

5. **ADR-046 compatibility**: Integration preserves the ADR-046 type bridge, mapping catalog elements to primitive types.

### Negative

1. **Additional runtime overhead**: Each node with styles now incurs catalog lookup overhead.

2. **Catalog must be accurate**: Validation is only as good as the validationRules defined in the catalog.

3. **Tight coupling**: BlueprintValidator now depends on ElementCatalog's internal structure.

### Neutral

1. **Warnings for non-blocking issues**: Slot mapping warnings don't block instantiation but inform developers of potential issues.

---

## References

- [ADR-043: ElementCatalog Enrichment](./ADR-043-Catalog-Enrichment.md)
- [ADR-046: Cell Types](./ADR-046-Cell-Types.md)
- [Phase 20.4: BlueprintValidator Implementation](./PHASE_20_BLUEPRINT_VALIDATOR.md)
- `src/omega-ui-core/uca/blueprintValidator.ts`
- `src/omega-ui-core/governance/ElementCatalog.ts`

---

## Notes

- The `validateValueAgainstRule()` function uses a switch on `rule.type` with schema-based validation, avoiding function storage in the catalog.
- For elements without `validationRules` defined, validation passes silently.
- The `getCatalogInfo()` public method is useful for UI components that need to display catalog element details.