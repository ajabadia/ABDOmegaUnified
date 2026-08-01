# ADR-042: Two-Phase Blueprint Validation Pattern

**Status:** ACCEPTED  
**Date:** 2026-06-01  
**Supersedes:** None  
**Related:** ADR-024 (Blueprint Runtime Instantiation), ADR-041 (Dual-Mode Validation)

## Context

When users import custom JSON blueprints in the BlueprintLibraryPanel, we need to validate them thoroughly before accepting them into the system. A single validation pass is insufficient because different validation concerns operate at different levels:

1. **Structural validation** ensures the JSON is a valid BlueprintDefinition with required fields (blueprintId, rootNode, etc.)
2. **Deep validation** uses BlueprintValidator to check semantic correctness (duplicate IDs, cycles, cell integrity, asset references)

The user experience requires showing clear, specific error messages that guide users to fix their JSON. Combining both phases into one validation run would create confusing error messages and make debugging harder.

## Decision

Implement a **Two-Phase Validation Pattern** for blueprint imports:

### Phase 1: Structural Validation

```typescript
import { validateBlueprint } from '../../utils/blueprintUtils';

const { valid, errors } = validateBlueprint(blueprint);
if (!valid) {
  setImportResult({ errors: errors.map(e => `Structure: ${e}`), warnings: [] });
  return;
}
```

**Purpose:** Verify the JSON conforms to BlueprintDefinition schema
**Validator:** `validateBlueprint()` from blueprintUtils.ts
**What it checks:**
- `blueprintId` is present and valid format
- `rootNode` exists and is a valid node structure
- Required top-level fields are present
- Basic JSON schema compliance

**Failure behavior:** Blocks import entirely with specific structural errors

### Phase 2: Deep Validation

```typescript
import { BlueprintValidator } from '@/omega-ui-core/uca/blueprintValidator';

const manifestWithResources = { resources: manifest?.resources };
const validationResult = BlueprintValidator.validateQuietly(blueprint.rootNode, manifestWithResources);
```

**Purpose:** Verify semantic correctness of the blueprint graph
**Validator:** `BlueprintValidator.validateQuietly()` with manifest resources
**What it checks:**
- Uniqueness: No duplicate node IDs
- Cycles: No structural cycles in the graph
- Cell integrity: Missing cellRef/templateRef, missing bind for control cells
- Asset resources: All referenced assets exist in manifest
- Warnings: Style issues, empty containers (non-blocking)

**Failure behavior:** Depends on result
- If `errors.length > 0`: Blocks import with validation errors
- If `warnings.length > 0` only: Shows confirmation dialog (user can proceed)

### Combined Flow

```
User selects JSON file
        ↓
Phase 1: validateBlueprint() (structural)
        ↓
    ┌─ FAIL ─┐
    │        │
    │   Show "Structure: <error>" messages
    │   Block import, require Dismiss
    │
    └─ PASS ─┘
        ↓
Phase 2: BlueprintValidator.validateQuietly() (deep)
        ↓
    ┌─ FAIL (errors) ─┐
    │                 │
    │   Show "Validation: <error>" messages
    │   Block import, require Dismiss
    │
    └─ PASS ─┘
        ↓
    ┌─ WARNINGS ONLY ─┐
    │                 │
    │   Show amber warning panel
    │   User chooses Proceed or Cancel
    │
    └─ CLEAN ─┘
        ↓
    Import directly (no dialog)
```

## Implementation

### BlueprintLibraryPanel.tsx

```typescript
const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const content = await file.text();
    const blueprint: BlueprintDefinition = JSON.parse(content);

    // Phase 1: Structural validation
    const { valid, errors } = validateBlueprint(blueprint);
    if (!valid) {
      setImportResult({ errors: errors.map(e => `Structure: ${e}`), warnings: [] });
      return;
    }

    // Phase 2: Deep validation with BlueprintValidator
    const manifestWithResources = { resources: manifest?.resources };
    const validationResult = BlueprintValidator.validateQuietly(
      blueprint.rootNode, 
      manifestWithResources
    );
    
    if (!validationResult.valid) {
      // Errors block import entirely
      setImportResult({ 
        errors: validationResult.errors.map(e => `Validation: ${e}`), 
        warnings: validationResult.warnings,
        pendingBlueprint: blueprint
      });
      return;
    }

    // Warnings only: show confirmation dialog
    if (validationResult.warnings.length > 0) {
      setImportResult({ 
        errors: [], 
        warnings: validationResult.warnings,
        pendingBlueprint: blueprint
      });
      return;
    }

    // Clean: import directly
    setImportResult(null);
    onSelectBlueprint(blueprint);
  } catch (err) {
    setImportResult({ 
      errors: [`Parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`], 
      warnings: [] 
    });
  }
};
```

### Error Message Prefixes

Each phase uses a prefix to help users understand the type of issue:

| Phase | Prefix | Example |
|-------|--------|---------|
| Structural | `Structure:` | `Structure: blueprintId is required` |
| Deep | `Validation:` | `Validation: Duplicate ID detected: vco_1` |
| Parse | `Parse error:` | `Parse error: Unexpected token at line 5` |

## Consequences

### Positive

- **Clear error attribution**: Users know if their JSON is malformed (structural) vs semantically incorrect (validation)
- **Actionable feedback**: Specific error messages guide users to fix their JSON
- **User control**: Warnings allow informed decisions to proceed with imperfect blueprints
- **Security**: Invalid blueprints cannot enter the system (blocks on errors)
- **Separation of concerns**: Structural validation is fast and cheap; deep validation is thorough but slower

### Negative

- **Complexity**: Two-phase validation is more complex than single-phase
- **Performance**: Two separate validation passes (minor impact for single-file imports)
- **User confusion**: Users may not understand the difference between "Structure" and "Validation" errors without documentation

### Trade-offs

The pattern prioritizes user experience over simplicity. Showing all errors at once, with clear attribution, helps users fix their JSON more efficiently than a single validation pass that might show confusing compound errors.

## Validation Criteria

1. **Structural blocking**: Invalid JSON (missing blueprintId, etc.) is blocked with clear error
2. **Deep blocking**: Semantically invalid blueprints are blocked with validation errors
3. **Warning UX**: Blueprints with warnings only show amber confirmation panel
4. **Clean import**: Valid blueprints import without any dialog
5. **Parse error handling**: Malformed JSON shows parse error, not cryptic validation errors

## Related Patterns

- **ADR-041 (Dual-Mode Validation)**: Phase 2 uses `validateQuietly()` instead of `validate()` to enable warning handling
- **ADR-024 (Blueprint Runtime Instantiation)**: Runtime validation uses `validate()` (blocking) instead, appropriate for gatekeeper scenarios

## Anti-Pattern

Do NOT skip structural validation and only use deep validation:

```typescript
// ANTI-PATTERN: Missing structural validation
const blueprint = JSON.parse(content);
BlueprintValidator.validateQuietly(blueprint.rootNode, manifest);
// If blueprint is missing blueprintId:
// - Deep validation might fail with confusing "rootNode not found" instead of "blueprintId required"
// - Or worse, validation passes incorrectly because rootNode exists but blueprintId is missing
// This masks the actual problem and makes debugging harder for users

// CORRECT: Always validate structure first
const { valid, errors } = validateBlueprint(blueprint);
if (!valid) { /* show structural errors */ }
```

---

**Certified by:** OMEGA Phase 26.1 - Blueprint Import Validation  
**Approved as:** Standard Import Validation Pattern for OMEGA Editor