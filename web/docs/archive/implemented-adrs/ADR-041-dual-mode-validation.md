# ADR-041: Dual-Mode Blueprint Validation Pattern

**Status:** ACCEPTED  
**Date:** 2026-06-01  
**Supersedes:** None  
**Related:** ADR-024 (Blueprint Runtime Instantiation), ADR-012 (Design Token Governance)

## Context

During Phase 20.4 (Blueprint Runtime Instantiation), the `BlueprintValidator` class was refactored to support two distinct validation modes. Previously, the validator only offered a `validate()` method that throws on any validation error. This was appropriate for blocking/gatekeeper scenarios, but inadequate for use cases where the user needs to see all validation issues at once (e.g., import wizards, pre-flight checks, auditing).

The original design decision to use `throw` as the validation response pattern was intentional for runtime gatekeeping but created friction in non-fatal validation scenarios where exceptions should not interrupt normal program flow.

## Decision

Implement a **Dual-Mode Validation Pattern** where `BlueprintValidator` provides two complementary methods:

### 1. `validate()` — Blocking/Gatekeeper Mode

```typescript
public static validate(nodes: OmegaNode | OmegaNode[], manifest: Partial<OMEGA_Manifest>): void
```

**Behavior:**
- Returns `void` on success
- Throws `Error` with joined error messages on failure
- Use for: Gatekeeper scenarios where failure must block materialization

**Use Cases:**
- `omegaRPCBridge.syncSnapshot()` — Invalid blueprints must never reach the engine
- `historyRestore.ts` — Prevents restoration of corrupted snapshots
- `useDocumentOrchestrator.ts` — Ensures manifest integrity before save

**Example:**
```typescript
// Validation fails → throws → caught by caller → structured error return
BlueprintValidator.validate(canonicalGraph, manifest);
// If valid: continues
// If invalid: throws [BLUEPRINT VALIDATION FAILED]\n<errors joined>
```

### 2. `validateQuietly()` — Non-Fatal/Informational Mode

```typescript
public static validateQuietly(nodes: OmegaNode | OmegaNode[], manifest: Partial<OMEGA_Manifest>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Behavior:**
- Returns structured result object (never throws)
- Separates errors (blocking) from warnings (non-blocking)
- Use for: User-facing validation where all issues should be displayed

**Return Type:**
```typescript
interface ValidationResult {
  valid: boolean;       // true only if errors.length === 0
  errors: string[];     // Blocking issues (must fix)
  warnings: string[];   // Non-blocking issues (informational)
}
```

**Use Cases:**
- Import wizard showing all validation problems at once
- Pre-flight checks before submission
- Auditing/logging with full issue details
- User-facing feedback in UI (e.g., BlueprintLibraryPanel)

**Example:**
```typescript
// Validation never throws — returns all issues
const result = BlueprintValidator.validateQuietly(userBlueprint, manifest);
if (!result.valid) {
  displayAllErrors(result.errors);
}
if (result.warnings.length > 0) {
  displayWarnings(result.warnings);
}
```

### 3. Internal Refactoring

Both methods share the same traversal logic via a private `traverseAndValidate()` helper:

```typescript
private static traverseAndValidate(
  node: OmegaNode, 
  manifest: Partial<OMEGA_Manifest>, 
  ids: Set<string>, 
  errors: string[],
  warnings: string[],
  path: string[]
): void
```

**Validation Rules:**
1. **Uniqueness** (ERROR) — Duplicate IDs detected
2. **Cycle Detection** (ERROR) — Structural cycles
3. **Cell Integrity** (ERROR) — Missing `cellRef`/`templateRef`, missing `bind` for control cells
4. **Asset Resources** (ERROR) — Missing asset references
5. **Style** (WARNING) — Cells without style defined may render with defaults
6. **Container** (WARNING) — Containers with no children

## Consequences

### Positive

- **Flexibility**: Different callers choose the appropriate mode for their context
- **User Experience**: Non-fatal validation shows ALL issues at once instead of failing on first error
- **Backward Compatibility**: Existing `validate()` callers continue to work unchanged
- **Testability**: `validateQuietly()` returns structured data easily assertable in unit tests
- **Warnings**: Non-blocking issues are now captured and potentially displayed

### Negative

- **Additional Method**: Two methods instead of one increases API surface
- **Documentation Burden**: Developers must understand when to use which mode
- **Warnings May Be Ignored**: Callers using `validateQuietly()` might not handle warnings — consider logging warnings even when `valid=true` to ensure they're captured

### Trade-offs

The dual-mode pattern trades API simplicity for flexibility. A single method that always throws would be simpler but insufficient for user-facing validation. A single method that never throws would be inappropriate for gatekeeper scenarios.

## Validation Criteria

1. **Backward Compatibility**: All existing `validate()` callers work unchanged (omegaRPCBridge, historyRestore, useDocumentOrchestrator)
2. **Unit Test Coverage**: 35 tests in `src/omega-ui-core/uca/blueprintValidator.test.ts` covering success, error, and warning cases
3. **ESLint Compliance**: Zero errors or warnings in blueprintValidator.ts
4. **Observability**: Errors and warnings are distinguishable in returned structure

## Implementation Notes

### When to Use `validate()` (Blocking)
- Runtime validation before critical operations
- Gatekeeper scenarios (engine communication, persistence)
- When errors must prevent further processing

### When to Use `validateQuietly()` (Non-Fatal)
- User-facing validation (imports, forms)
- Pre-flight checks
- Auditing and logging
- Scenarios where all issues should be visible at once

### Anti-Pattern
Do NOT use `validateQuietly()` then manually throw based on `result.valid` — this adds complexity without benefit:

```typescript
// ANTI-PATTERN: Unnecessary complexity
const result = BlueprintValidator.validateQuietly(nodes, manifest);
if (!result.valid) {
  throw new Error(result.errors.join('\n')); // Just use validate()!
}

// CORRECT: Use validate() directly for gatekeeper scenarios
BlueprintValidator.validate(nodes, manifest); // Simpler, same effect
```

---

**Certified by:** Phase 20.4 Blueprint Runtime Instantiation  
**Approved as:** Standard Validation Pattern for OMEGA UCA