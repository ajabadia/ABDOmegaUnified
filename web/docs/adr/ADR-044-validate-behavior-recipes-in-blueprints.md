# ADR-044: Extend BlueprintValidator for AssetBehavior and LayerRecipe Validation

**Status:** ACCEPTED  
**Date:** 2026-06-01  
**Supersedes:** None  
**Related:** ADR-041 (Dual-Mode Validation), ADR-043 (Unified Governance), ADR-015 (Cell Studio)

## Context

Currently, `BlueprintValidator` validates structural aspects of blueprints:
- Node uniqueness (no duplicate IDs)
- Cycle detection
- Cell integrity (cellRef, bind)
- Asset resource existence

However, it does NOT validate:
- **AssetBehavior** configurations (preset validity, mapping correctness)
- **LayerRecipe** structures (layer order, asset references)
- **Behavioral compatibility** (can the asset support the requested behavior?)

This creates a gap where blueprints with invalid behavior configurations can pass validation but fail at runtime.

## Decision

Extend `BlueprintValidator` to validate behavioral aspects of blueprints by adding a third validation phase:

### Three-Phase Blueprint Validation

```
Phase 1: STRUCTURAL (existing)
├── blueprintId exists
├── rootNode exists and is valid OmegaNode
└── Required fields present

Phase 2: SEMANTIC (existing, via validateQuietly)
├── Uniqueness (no duplicate IDs)
├── Cycles (no structural cycles)
├── Cell integrity (cellRef, bind for controls)
└── Asset resources (all referenced assets exist)

Phase 3: BEHAVIORAL (NEW)
├── AssetBehavior validation
│   ├── Preset validity (must be in allowed presets)
│   ├── Mapping completeness (input, mode, polarity defined)
│   └── Asset capability vs behavior compatibility
└── LayerRecipe validation
    ├── Layer ordering (non-circular dependencies)
    ├── Asset references (all layer assets exist)
    └── Mode compatibility (blend modes valid for layer types)
```

### New Validation Methods

```typescript
interface BehaviorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  layerResults: LayerValidationResult[];
}

interface LayerValidationResult {
  layerId: string;
  valid: boolean;
  errors: string[];
  assetCompatible: boolean;
}

class BlueprintValidator {
  // Extended validateQuietly
  static validateQuietly(
    nodes: OmegaNode | OmegaNode[], 
    manifest: Partial<OMEGA_Manifest>,
    options?: {
      validateBehavior?: boolean;  // Default: true
      validateRecipes?: boolean;   // Default: true
    }
  ): ValidationResult & { behavior?: BehaviorValidationResult }
}
```

### Behavior Validation Rules (aligned with ADR-046)

```typescript
// Behavior presets (per ADR-046: Cell Philosophy Redesign)
type BehaviorPreset = 
  | 'rotary'      // Continuous rotation (knobs)
  | 'filmstrip'   // Frame sequence (animated knobs)
  | 'stepped'     // Discrete steps (selectors)
  | 'binary'      // On/off (switches, buttons)
  | 'linear'      // Linear mapping (sliders)
  | 'display';    // Value display (screens)

// Validation rules aligned with new cell philosophy
function validateBehavior(cell: CompositeCell, manifest: OMEGA_Manifest): string[] {
  const errors = [];
  
  // 1. Preset must be valid (from allowed list)
  const allowedPresets: BehaviorPreset[] = ['rotary', 'filmstrip', 'stepped', 'binary', 'linear', 'display'];
  if (!allowedPresets.includes(cell.behavior.preset as BehaviorPreset)) {
    errors.push(`Invalid behavior preset "${cell.behavior.preset}" for cell "${cell.id}"`);
  }
  
  // 2. Preset-specific validation
  switch (cell.behavior.preset) {
    case 'filmstrip':
      // Validate asset has sufficient frames
      const assetRef = cell.primitive.style?.asset;
      const assetDef = manifest?.resources?.assets?.find(a => a.id === assetRef);
      if (!assetDef?.frames || assetDef.frames < 2) {
        errors.push(`Filmstrip behavior requires asset with frames >= 2, but "${assetRef}" has ${assetDef?.frames || 0}`);
      }
      break;
    case 'stepped':
      // Validate config has steps defined
      if (!cell.behavior.config?.steps || cell.behavior.config.steps < 2) {
        errors.push(`Stepped behavior requires config.steps >= 2 for cell "${cell.id}"`);
      }
      break;
    case 'rotary':
      // Validate polarity is defined
      if (!cell.behavior.config?.polarity) {
        errors.push(`Rotary behavior should specify polarity for cell "${cell.id}"`);
      }
      break;
  }
  
  // 3. Slot capacity validation
  for (const slot of cell.slots) {
    const decoratorsInSlot = cell.decorators.filter(d => d.position === slot.position);
    if (decoratorsInSlot.length > slot.capacity) {
      errors.push(`Slot "${slot.position}" in cell "${cell.id}" exceeds capacity: ${decoratorsInSlot.length} > ${slot.capacity}`);
    }
    
    // Validate decorator types match slot accepts
    for (const dec of decoratorsInSlot) {
      if (!slot.accepts.includes(dec.primitive.type)) {
        errors.push(`Decorator type "${dec.primitive.type}" not allowed in slot "${slot.position}" for cell "${cell.id}"`);
      }
    }
  }
  
  return errors;
}
```

### LayerRecipe Validation Rules

```typescript
interface RecipeValidationRule {
  layerId: string;
  checks: ('asset' | 'blend' | 'ordering' | 'compatibility')[];
}

// Validate layer ordering (no circular dependencies)
function validateLayerOrdering(recipe: LayerRecipe): string[] {
  const errors = [];
  const layerIds = recipe.layers.map(l => l.id);
  
  for (const layer of recipe.layers) {
    if (layer.lowerLayer && !layerIds.includes(layer.lowerLayer)) {
      errors.push(`Layer "${layer.id}" references non-existent lowerLayer "${layer.lowerLayer}"`);
    }
  }
  
  return errors;
}

// Validate asset compatibility with blend mode
function validateBlendMode(layer: LayerRecipe['layers'][0], assetDef: OMEGA_Asset): string[] {
  const errors = [];
  
  const VALID_BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'hard-light'];
  if (layer.blendMode && !VALID_BLEND_MODES.includes(layer.blendMode)) {
    errors.push(`Invalid blendMode "${layer.blendMode}" for layer "${layer.id}"`);
  }
  
  return errors;
}
```

## Consequences

### Positive

- **Runtime Safety**: Invalid behavior configurations are caught at validation time
- **Clear Error Messages**: Users get actionable feedback about what's wrong
- **Documentation**: Validation rules serve as implicit specification for valid configurations
- **Backward Compatibility**: Default behavior unchanged (validation runs unless explicitly skipped)

### Negative

- **Validation Overhead**: Third phase adds processing time for complex blueprints
- **Catalog Dependency**: Must have asset definitions to validate behavior compatibility
- **Complexity Increase**: BlueprintValidator becomes more complex

### Trade-offs

The behavioral validation adds overhead but prevents runtime failures. The cost is justified by the improved user experience.

## Validation Criteria

1. **Behavioral Errors Block**: Invalid AssetBehavior configurations cause validation failure
2. **Recipe Errors Block**: Invalid LayerRecipe configurations cause validation failure  
3. **Warnings for Soft Issues**: Deprecated presets, missing optional fields generate warnings
4. **Backward Compatible**: Existing valid blueprints continue to pass validation

### Scope Clarification

**Behavioral validation applies to:**
- `BlueprintDefinition` instances (templates for instantiation)
- `StructuralModule` instances composed within blueprints

**Behavioral validation does NOT apply to:**
- Standalone `CompositeCell` instances (validated at composition time in CellStudio)
- `PrimitiveNode` instances (no behavior, only rendering)

This means the Phase 3 validation in `BlueprintValidator` runs when validating a complete blueprint, not when authoring individual cells in CellStudio. CellStudio uses composition-time validation (ADR-045) for cell behavior.

## Implementation Notes

### Opt-in Behavioral Validation

```typescript
// Default: validate behavior
const result = BlueprintValidator.validateQuietly(nodes, manifest);

// Skip behavior validation (legacy mode)
const result = BlueprintValidator.validateQuietly(nodes, manifest, {
  validateBehavior: false,
  validateRecipes: false
});
```

### Phase 3 Integration with validateQuietly

```typescript
// In validateQuietly, after semantic validation:
if (options?.validateBehavior !== false) {
  const behaviorResult = validateBehavior(nodes, manifest);
  if (!behaviorResult.valid) {
    result.errors.push(...behaviorResult.errors);
  }
  result.warnings.push(...behaviorResult.warnings);
  result.behavior = behaviorResult;
}
```

---

**Certified by:** OMEGA Engineering  
**Standards:** Era 7.2.3 - UCA Phase 27.1