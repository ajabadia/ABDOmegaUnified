# ADR-045: CellStudioContainer Architecture Refactor

**Status:** ACCEPTED  
**Date:** 2026-06-01  
**Supersedes:** ADR-015 (Unified Cell Studio)  
**Related:** ADR-043 (Unified Governance), ADR-046 (Cell Philosophy Redesign)

**Depends on:** ADR-046 (Cell Philosophy Redesign) must be completed before ADR-045 implementation can begin. The stepper-based workflow depends on the new Primitive/Composite/Structural types.

## Context

The current `CellStudioContainer` implementation has grown organically and now exhibits several architectural issues:

### Current Problems

1. **Conflated State Management**
   - Single component manages: cell data, behavior, recipe, mock manifest, UI state
   - ~300 lines of state update logic with deeply nested object manipulation
   - Difficult to test individual pieces

2. **Fragmented Governance**
   - `IndustrialGovernanceConsole` for styling
   - `OMEGA_ELEMENT_CATALOG` for element selection
   - `ThemePaletteGovernance` for theme management
   - No unified API

3. **Mock Manifest Coupling**
   - Uses a mock manifest for preview rendering
   - Creates disconnect between "what you see" and "what you get"
   - Preview may not reflect actual manifest styles

4. **Tabs-based Navigation Confusion**
   - 4 tabs: fragments, behavior, recipes, properties
   - "properties" is actually "governance/styling"
   - "behavior" and "recipes" are related but separated
   - User mental model doesn't match tab structure

5. **Export/Freeze Ambiguity**
   - Multiple export paths: `handleExport`, `handleFreeze`, `onSave`
   - User doesn't understand difference between "Export Entity", "Freeze as DNA Template", "Finalize Cell"

## Decision

Refactor `CellStudioContainer` to follow a **clear separation of concerns** and **user-centric workflow**:

### Proposed Architecture

```
CellStudioContainer
├── State Manager (useCellStudioState)
│   ├── cellData: ManifestEntity
│   ├── behavior: AssetBehavior
│   ├── recipe: LayerRecipe
│   └── validation: ValidationResult
├── Preview Panel (CellPreviewCanvas)
│   └── Real-time rendering with actual manifest
├── Workflow Steps (Stepper-based UI)
│   ├── Step 1: COMPOSE (add primitives + decorations)
│   ├── Step 2: BEHAVIOR (configure asset behavior)
│   ├── Step 3: STYLE (apply visual governance)
│   └── Step 4: REVIEW (preview + validate)
└── Action Bar (Save/Cancel)
```

### User Workflow Redesign

Instead of tabs, use a **stepper-based workflow**:

```
┌─────────────────────────────────────────────────────┐
│  1. COMPOSE    2. BEHAVIOR    3. STYLE    4. REVIEW │
│  ════════════  ────────────   ──────────  ───────── │
│                                                     │
│        [ Preview Canvas with live cell ]            │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Composition Tree / Behavior Config /        │   │
│  │  Governance Panel / Validation Results       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│         [ CANCEL ]          [ SAVE CELL ]          │
└─────────────────────────────────────────────────────┘
```

### Clear State Separation

```typescript
// Hook-based state management
function useCellStudioState(initialCell?: ManifestEntity) {
  const [cellData, setCellData] = useState<ManifestEntity>(initialCell);
  const [behavior, setBehavior] = useState<AssetBehavior>(initialCell?.assetBehavior || defaultBehavior);
  const [recipe, setRecipe] = useState<LayerRecipe>(initialCell?.recipe || defaultRecipe);
  
  // Derived state
  const validationResult = useMemo(() => 
    BlueprintValidator.validateQuietly(entityToNode(cellData), { resources: manifest?.resources }),
    [cellData, manifest]
  );
  
  const previewHtml = useMemo(() => 
    CellRenderer.renderCellHTML(entityToNode(cellData), { manifest, ... }),
    [cellData, manifest, behavior, recipe]
  );
  
  return { cellData, setCellData, behavior, setBehavior, recipe, setRecipe, validationResult, previewHtml };
}
```

### Unified Governance API

```typescript
// Single governance interface for all visual aspects
interface CellGovernance {
  // From catalog
  allowedVariants: string[];
  allowedSlots: SlotDefinition[];
  
  // From manifest
  styleVariants: StyleVariant[];
  colorPalette: Record<string, string>;
  
  // Actions
  applyStyle: (updates: Partial<OmegaStyleNode>) => void;
  validateStyle: (style: Partial<OmegaStyleNode>) => ValidationResult;
}
```

### Eliminating Mock Manifest

```typescript
// Use actual manifest for preview
// If no manifest provided, use minimal defaults
function CellStudioContainer({ manifest, ... }) {
  // Instead of creating mockManifest, use passed manifest with fallbacks
  const previewManifest = useMemo(() => ({
    ...minimalManifest,
    ...manifest,
    // Ensure required styles exist
    ui: {
      ...minimalManifest.ui,
      ...manifest?.ui,
      styles: {
        ...minimalManifest.ui?.styles,
        ...manifest?.ui?.styles,
      }
    }
  }), [manifest]);
  
  // This ensures preview matches actual result
}
```

### Clear Action Naming

```typescript
// Single save action with clear intent
interface CellStudioActions {
  // "Save to current manifest" - immediate
  save: (cell: ManifestEntity) => void;
  
  // "Export as standalone file" - download JSON
  export: (cell: ManifestEntity) => void;
  
  // "Save as reusable template" - creates ModuleTemplate
  freeze: (template: CellTemplate) => void;
}

// Replace:
// - handleExport (confusing)
// - handleFreeze (confusing)  
// - onSave callback (overloaded)
// With single "finalize" that respects user's intent from workflow step
```

### Dependency Order

The refactor must follow this sequence:

1. **ADR-046** (Cell Philosophy) → Defines new cell types and binding model
2. **ADR-043** (Unified Governance) → Establishes catalog as single source of truth
3. **ADR-044** (Behavior Validation) → Extends BlueprintValidator for new types
4. **ADR-045** (CellStudio Refactor) → Implements new UI based on above

Attempting ADR-045 before ADR-046 will result in rebuilding the same architectural issues.

## Consequences

### Positive

- **Clear Mental Model**: Users understand "compose → behavior → style → review"
- **Testability**: State hooks can be tested in isolation
- **No Mock Disconnect**: Preview uses actual manifest styles
- **Simplified Debugging**: Clear separation means easier to find issues
- **Better UX**: Stepper prevents jumping between unrelated tabs

### Negative

- **Breaking Change**: Current CellStudioContainer users must adapt
- **Refactor Effort**: ~300 lines of current component need rewrite
- **New State Hooks**: Must be implemented and tested

### Trade-offs

The refactor improves UX and maintainability at the cost of migration effort.

## Validation Criteria

1. **Same Functionality**: All current features preserved
2. **Clearer UX**: User study shows improvement in task completion
3. **Test Coverage**: New hooks have >80% test coverage
4. **No Mock Artifacts**: Preview matches actual render output

---

**Certified by:** OMEGA Engineering  
**Standards:** Era 7.2.3 - UCA Phase 27.2