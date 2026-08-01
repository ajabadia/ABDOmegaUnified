# ADR-016: Canonical UCA Consolidation

## Status
**ACCEPTED** — 2026-05-12

## Context
Prior to Phase 16, the OMEGA Manifest Editor suffered from a "Double Materialization" anti-pattern. Blueprint expansion and placeholder resolution logic were duplicated across the legacy `BlueprintInjector` class and the modern `ucaBridge` compiler. This redundancy led to:
1. Inconsistent rendering of injected blueprints vs. standard manifest nodes.
2. Divergent support for placeholder syntax (e.g., lack of arithmetic support in one layer).
3. Complex identity governance (ID remapping) handled at the UI layer rather than the core.

## Decision
We formally decommission the `BlueprintInjector` class and consolidate all materialization and structural integration logic into the UCA core.

### 1. Single Sovereign Compiler
The `ucaBridge.ts` is now the sole authority for tree materialization. It incorporates:
- **Materialization Engine**: Advanced placeholder resolution supporting literal and arithmetic expressions.
- **Genetic Guard**: Strict structural validation (`allowedParentKinds`) during compilation.

### 2. Sovereign Injection Orchestrator
We established `ucaInjection.ts` as the canonical entry point for all state-changing blueprint operations. It manages the formal 10-step pipeline:
1. Compilation (`ucaBridge`).
2. ID Management (`IdManager`).
3. Structural Merging (`performMerge`).
4. Auto-wiring (`AutoWireResolver`).

### 3. Core Utility Centralization
Core utilities for identity and signal binding were moved from the feature layer (`src/features/manifest-editor/utils`) to the UCA core (`src/omega-ui-core/uca/utils/`).

## Consequences
- **Positive**: 100% architectural parity between authoring and runtime.
- **Positive**: Eliminated RISK-016 (Double Materialization).
- **Positive**: Zero-noise TSC/ESLint status achieved for the entire UCA pipeline.
- **Neutral**: Legacy components are "tombstoned" in the `legacy/` directory and excluded from the main build to preserve historical context without technical debt.

## Compliance
All future blueprint-related features must utilize the `ucaInjection` service. Direct manipulation of the manifest tree for blueprint-like operations is strictly prohibited (ADR-014 compliance).
