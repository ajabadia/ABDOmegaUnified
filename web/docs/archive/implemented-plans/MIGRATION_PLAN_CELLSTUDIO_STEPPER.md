# Migration Plan: CellStudioContainer → Stepper Workflow

**From:** Tab-based UI (fragments/behavior/recipes/properties)  
**To:** Stepper-based workflow (Compose → Behavior → Style → Review)  
**Based on:** ADR-045, ADR-046, ADR-043

---

## Executive Summary

| Aspect | Current (Tabs) | Target (Stepper) | Effort |
|--------|---------------|------------------|--------|
| Navigation | 4 independent tabs | 4-step linear workflow | Medium |
| State Management | Single component (~300 lines) | Separated hooks | High |
| Preview | Mock manifest | Real manifest | Low |
| Governance | Fragmented (3 components) | Unified CellGovernance | Medium |
| Actions | 3 confusing options | 1 clear finalize | Low |

---

## Gap Analysis

### Gap 1: Navigation Paradigm
**Current:** 4 tabs with overlapping concerns
- `fragments` = composition
- `behavior` + `recipes` = asset behavior (related but separated)
- `properties` = styling/governance

**Target:** 4-step linear workflow
```
COMPOSE → BEHAVIOR → STYLE → REVIEW
```

**Impact:** Breaking change for UX. Users must adapt.

---

### Gap 2: State Conflation
**Current:** Single component manages:
- `activeTab`, `selectedFragmentId`, `soloLayerId`
- `isAssetSelectorOpen`, `activeLayerId`, `isTypeLocked`
- `isCommandCenterOpen`
- `cellData`, `behavior`, `recipe`
- `mockManifest`

**Target:** Separate hooks
```typescript
// useCellStudioState.ts
function useCellStudioState(initialCell) {
  const [cellData, setCellData] = useState(initialCell);
  const [behavior, setBehavior] = useState(defaultBehavior);
  const [recipe, setRecipe] = useState(defaultRecipe);
  const [currentStep, setCurrentStep] = useState(0);
  
  const validation = useMemo(() => 
    BlueprintValidator.validateQuietly(entityToNode(cellData), manifest),
    [cellData]
  );
  
  return { cellData, setCellData, behavior, setBehavior, recipe, setRecipe, currentStep, setCurrentStep, validation };
}
```

**Impact:** High refactor effort, but improves testability 10x.

---

### Gap 3: Mock Manifest Coupling
**Current:** 
```typescript
const [mockManifest, setMockManifest] = useState<OMEGA_Manifest>(manifest || {
  schemaVersion: '1.0.0',
  id: 'laboratory',
  // ...hardcoded defaults
});
```

**Target:**
```typescript
const previewManifest = useMemo(() => ({
  ...minimalManifest,      // Always provide fallbacks
  ...manifest,             // Override with provided manifest
  ui: {
    ...minimalManifest.ui,
    ...manifest?.ui,
  }
}), [manifest]);
```

**Impact:** Low effort, eliminates preview/render mismatch.

---

### Gap 4: Fragmented Governance
**Current:** 3 separate governance components
- `IndustrialGovernanceConsole` (main styling)
- `ThemePaletteGovernance` (palette/colors)
- `OMEGA_ELEMENT_CATALOG` (element selection)

**Target:** Unified `CellGovernance` interface
```typescript
interface CellGovernance {
  // From catalog (ADR-043 enrichment needed)
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

**Impact:** Medium effort. Depends on ADR-043 catalog enrichment.

---

### Gap 5: Action Confusion
**Current:** 3 actions with unclear intent
- `handleExport` → Download as JSON
- `handleFreeze` → Create CellTemplate
- `onSave` callback → Save to manifest

**Target:** Clear finalize action
```typescript
interface CellStudioActions {
  // Single save action
  save: (cell: ManifestEntity & { behavior, recipe }) => void;
  
  // Export separately if needed
  exportStandalone: (cell: ManifestEntity) => void;
}
```

**Impact:** Low effort, improves UX clarity.

---

### Gap 6: No Real-time Validation
**Current:** No validation during editing. Errors only on save.

**Target:** BlueprintValidator integration
```typescript
const validation = useMemo(() => 
  BlueprintValidator.validateQuietly(entityToNode(cellData), { resources: manifest?.resources }),
  [cellData, manifest]
);

// Show errors/warnings in REVIEW step
{!validation.valid && (
  <div className="validation-errors">
    {validation.errors.map(e => <ValidationError key={e} message={e} />)}
  </div>
)}
```

**Impact:** Medium effort. BlueprintValidator already exists.

---

### Gap 7: Missing ADR-046 Types
**Current:** Uses `ManifestEntity` directly.

**Target:** Uses new types
- `PrimitiveNode` for render-only cells
- `CompositeCell` for cell = primitive + slots + decorators + behavior
- `StructuralModule` for modules with layout

**Impact:** High effort. Depends on ADR-046 implementation (completed).

---

## Migration Phases

### Phase 1: State Separation (Week 1)
**Goal:** Extract hooks from component, maintain tabs.

1. Create `useCellStudioState.ts`:
```typescript
export function useCellStudioState(initialCell?: ManifestEntity, manifest?: OMEGA_Manifest) {
  const [cellData, setCellData] = useState<ManifestEntity>(initialCell || defaultCell);
  const [behavior, setBehavior] = useState<AssetBehavior>(initialCell?.assetBehavior || defaultBehavior);
  const [recipe, setRecipe] = useState<LayerRecipe>(initialCell?.recipe || defaultRecipe);
  // ... rest of state
  return { cellData, setCellData, behavior, setBehavior, recipe, setRecipe, ... };
}
```

2. Update `CellStudioContainer` to use hook:
```typescript
const { cellData, setCellData, behavior, setBehavior } = useCellStudioState(initialCell, manifest);
```

3. Keep tabs but refactor to use hook methods.

**Validation:** Unit tests for hook.

---

### Phase 2: Real Manifest Preview (Week 1-2)
**Goal:** Eliminate mock manifest, use actual manifest.

1. Remove `mockManifest` state from hook.
2. Use `manifest` prop directly with fallbacks:
```typescript
const previewManifest = useMemo(() => ({
  ...MINIMAL_MANIFEST,
  ...manifest,
  ui: {
    ...MINIMAL_MANIFEST.ui,
    ...manifest?.ui,
  }
}), [manifest]);
```

3. Update `CellRenderer.renderCellHTML` call to use `previewManifest`.

**Validation:** Visual test - preview matches export.

---

### Phase 3: Stepper UI (Week 2-3)
**Goal:** Replace tabs with stepper.

**⚠️ Complexity: Higher than initially estimated (5-7 days)**

1. Create `CellStudioStepper.tsx` component:
```typescript
const STEPS = [
  { id: 'compose', label: 'COMPOSE', icon: Box },
  { id: 'behavior', label: 'BEHAVIOR', icon: Activity },
  { id: 'style', label: 'STYLE', icon: Palette },
  { id: 'review', label: 'REVIEW', icon: CheckCircle },
];

function CellStudioStepper({ currentStep, onStepChange }) {
  return (
    <div className="stepper" role="navigation" aria-label="Cell creation workflow">
      {STEPS.map((step, i) => (
        <button 
          key={step.id}
          onClick={() => onStepChange(i)}
          disabled={i > currentStep} // Can't skip ahead
          className={i <= currentStep ? 'active' : 'disabled'}
          aria-current={i === currentStep ? 'step' : undefined}
        >
          <step.icon />
          {step.label}
        </button>
      ))}
    </div>
  );
}
```

2. Map current tabs to steps:
   - `compose`: fragments tab content
   - `behavior`: behavior + recipes tab content (merged)
   - `style`: properties tab (governance)
   - `review`: validation results + preview

3. Add step validation to prevent skipping:
```typescript
const canProceed = (step: number) => {
  switch(step) {
    case 0: return true; // Compose - always can proceed
    case 1: return cellData.type !== undefined; // Need type selected
    case 2: return true; // Style - always can proceed
    case 3: return validation.valid; // Review - need valid
  }
};
```

4. State persistence for mid-workflow recovery:
```typescript
// Persist to sessionStorage on every step change
useEffect(() => {
  sessionStorage.setItem('cellStudioDraft', JSON.stringify({
    step: currentStep,
    cellData,
    behavior,
    recipe
  }));
}, [currentStep, cellData, behavior, recipe]);

// Restore on mount
const savedDraft = sessionStorage.getItem('cellStudioDraft');
if (savedDraft && !initialCell) {
  // Offer to restore draft
}
```

**Validation:** UX test - users can complete workflow in < 5 minutes.

---

### Phase 4: Unified Governance (Week 3-4)
**Goal:** Integrate ADR-043 catalog enrichment.

1. Create `CellGovernance` interface:
```typescript
interface CellGovernance {
  allowedVariants: string[];
  allowedSlots: SlotDefinition[];
  styleVariants: StyleVariant[];
  colorPalette: Record<string, string>;
  applyStyle: (updates: Partial<OmegaStyleNode>) => void;
  validateStyle: (style: Partial<OmegaStyleNode>) => ValidationResult;
}
```

2. Create `useCellGovernance.ts` hook:
```typescript
export function useCellGovernance(elementType: string, manifest?: OMEGA_Manifest) {
  const catalog = OMEGA_ELEMENT_CATALOG.find(e => e.id === elementType);
  // ... enriched with ADR-043 slots and validation rules
  
  return {
    allowedVariants: catalog?.allowedVariants || [],
    allowedSlots: catalog?.slots || [],
    // ...
  };
}
```

3. Replace `IndustrialGovernanceConsole` with `CellGovernancePanel`.

**Validation:** All governance operations work through single API.

---

### Phase 5: Clear Actions (Week 4)
**Goal:** Simplify action naming.

1. Replace 3 actions with single `finalize`:
```typescript
const handleFinalize = () => {
  const completeCell = { ...cellData, assetBehavior: behavior, recipe };
  onSave(completeCell);
};
```

2. Remove `handleExport` and `handleFreeze` (or move to separate "More" menu).

3. Add step-specific guidance:
   - COMPOSE: "Add primitives and decorations"
   - BEHAVIOR: "Configure how this cell animates"
   - STYLE: "Apply visual theme"
   - REVIEW: "Verify and save"

**Validation:** User test - no confusion about save action.

---

### Phase 6: ADR-046 Integration (Week 5-6)
**Goal:** Use new cell types throughout.

1. Import new types:
```typescript
import type { PrimitiveNode, CompositeCell, StructuralModule } from '@/types/cell-types';
import { omegaNodeToCellNode, cellNodeToOmegaNode } from '@/types/cell-conversion';
```

2. Add conversion layer:
```typescript
// When editing existing cell
const cellNode = useMemo(() => 
  omegaNodeToCellNode(entityToNode(cellData)),
  [cellData]
);

// On save, convert back
const saveNode = cellNodeToOmegaNode(cellNode);
```

3. Update step components to work with new types.

**Validation:** Round-trip conversion preserves data.

---

## Implementation Order

```
Phase 0 (Feature Flag Infrastructure) ← Enable safe rollout
       ↓
Phase 1 (State Separation)
       ↓
Phase 2 (Real Manifest)
       ↓
Phase 3 (Stepper UI)
       ↓
Phase 4 (Unified Governance) ← depends on ADR-043 enrichment
       ↓
Phase 5 (Clear Actions)
       ↓
Phase 6 (ADR-046 Integration)
```

**Parallel tracks:**
- ADR-043 catalog enrichment (Phase 4 dependency)
- BlueprintValidator enhancement for ADR-044 (validation in Phase 3)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing users | Feature flag: `?mode=stepper` or `?mode=tabs` via URL param. Phase 0 implements this. |
| ADR-043 not ready | Phase 4 optional, governance works without enrichment |
| ADR-046 type mismatches | Phase 6 has conversion layer for backward compatibility |
| Complex migration | Each phase is independently deployable |
| Mid-workflow data loss | sessionStorage persistence + restore prompt |
| Accessibility issues | Keyboard navigation + ARIA labels in stepper |

### Phase 0: Feature Flag Infrastructure (Add before Phase 1)

```typescript
// src/features/manifest-editor/components/lab/useCellStudioMode.ts
export type CellStudioMode = 'tabs' | 'stepper';

export function useCellStudioMode(): CellStudioMode {
  // Default to tabs for safety (opt-in for stepper)
  if (typeof window === 'undefined') return 'tabs';
  
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode');
  
  return (mode === 'stepper') ? 'stepper' : 'tabs';
}

// Draft persistence helper
export function useCellStudioDraft() {
  const STORAGE_KEY = 'omega_cellstudio_draft';
  
  const saveDraft = (data: { step: number; cellData: any; behavior: any; recipe: any }) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  };
  
  const loadDraft = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  
  const clearDraft = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };
  
  return { saveDraft, loadDraft, clearDraft };
}

// Usage in CellStudioContainer:
const mode = useCellStudioMode();
const { saveDraft, loadDraft, clearDraft } = useCellStudioDraft();

// Save on every change
useEffect(() => {
  if (mode === 'stepper') {
    saveDraft({ step: currentStep, cellData, behavior, recipe });
  }
}, [mode, currentStep, cellData, behavior, recipe]);

// On successful save, clear draft
const handleSave = () => {
  onSave({ ...cellData, assetBehavior: behavior, recipe });
  clearDraft();
};
```

This allows gradual rollout and instant rollback.

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
- `useCellStudioState` hook: state transitions
- `useCellGovernance` hook: governance rules
- Conversion utilities: round-trip preservation
- **Target: >80% coverage on new hooks**

### Integration Tests (Playwright - already in project)
```typescript
// e2e/cell-studio.spec.ts
test('complete cell creation workflow', async ({ page }) => {
  await page.goto('/manifest-editor?mode=stepper');
  await page.click('[data-step="compose"]');
  // ... complete all steps
  await expect(page.locator('.save-success')).toBeVisible();
});

test('stepper prevents skipping validation', async ({ page }) => {
  await page.goto('/manifest-editor?mode=stepper');
  // Step 3 (review) should be disabled if validation fails
  await expect(page.locator('[data-step="review"]')).toBeDisabled();
});
```

### UX Tests
- User can complete cell creation in < 5 minutes
- No confusion about save action
- Validation errors are actionable

### Accessibility Tests
- Keyboard navigation: Tab/Shift+Tab between steps
- ARIA: stepper announces current step
- Focus: Focus moves to step content on step change

---

## Estimated Effort

| Phase | Complexity | Estimate |
|-------|------------|----------|
| Phase 0: Feature Flag | Low | 1 day |
| Phase 1: State Separation | Medium | 2 days |
| Phase 2: Real Manifest | Low | 1 day |
| Phase 3: Stepper UI | High | 5-7 days |
| Phase 4: Unified Governance | Medium | 2 days (if ADR-043 ready) |
| Phase 5: Clear Actions | Low | 1 day |
| Phase 6: ADR-046 Integration | Medium | 3 days |
| **Total** | - | **~15-16 days** |

---

## Rollback Plan

If stepper workflow causes issues:
1. Change URL param to `?mode=tabs` - instant rollback, no deployment
2. `useCellStudioState` returns tab-compatible state
3. Mock manifest can be re-enabled via prop
4. sessionStorage drafts are preserved for session recovery

**Concrete rollback procedure:**
```bash
# User reports issue
# 1. Tell user to add ?mode=tabs to URL
# 2. Or: Deploy with ?mode=tabs as default
# 3. Issue resolved, no code rollback needed
```

---

**Certified by:** OMEGA Engineering  
**Date:** 2026-06-01  
**Version:** 1.1

## Changelog

- **v1.1** (2026-06-01): Added Phase 0 (Feature Flag), increased Phase 3 estimate to 5-7 days, added sessionStorage persistence, added accessibility testing, clarified rollback procedure, added Playwright E2E tests
- **v1.0** (2026-06-01): Initial draft