# ADR-018: Canonical Contract Transition & Organic Migration

## Status
**ACCEPTED** — 2026-05-13

## Context
With the introduction of the **Phase 18: Canonical UCA Contract**, the OMEGA manifest structure now prioritizes a hierarchical UCA tree (`nodes` and `links`) over the legacy flat projection (`ui.controls` and `ui.jacks`). However, a vast fleet of existing instruments still operates on the legacy format. 

A "Big Bang" migration (batch conversion) poses significant integration risks and potential breaking changes across the entire instrument library.

## Decision
We adopt a **Strangler Fig** pattern for the transition to the Canonical Contract.

### 1. Bilingual Auditor
The `StructuralAuditor.ts` is refactored to support both models simultaneously:
- **Sovereign Mode**: Activated when `manifest.nodes` is present. The UCA tree is the source of truth. Legacy data checks are downgraded to **Shadow Audits** (Warnings).
- **Legacy Mode**: Active for older instruments. Legacy checks remain **Critical Errors** to preserve stability.

### 2. Organic Migration Strategy
Instead of a batch process, migration will occur incrementally:
- **Trigger**: Conversion happens when an instrument is opened, edited, or saved in the Manifest Editor.
- **Mechanism**: The `ucaBridge.ts` (Legacy Migration Bridge) performs the 1:1 translation from planar to hierarchical on-demand.
- **Validation**: Each organic migration is validated by the real-time auditor and the user, reducing the blast radius of potential conversion errors.

### 3. Progressive "Strangling"
The use of `ManifestEntity` and planar models in UI components (Inspector, Clipboard) will be gradually replaced by direct `OmegaNode` manipulation.

## Consequences
- **Positive**: Zero risk of breaking the existing fleet of instruments.
- **Positive**: Immediate benefits of Phase 18 (OmegaLinks, signalPath validation) for all new and updated instruments.
- **Positive**: Clear upgrade path for legacy instruments through the "Open-Save" workflow.
- **Neutral**: Temporary technical debt of maintaining "bilingual" logic in the core and auditor.
- **Negative**: The full decommissioning of legacy planar logic will be delayed until the majority of the fleet has been organically migrated.

## Compliance
- All new instruments **MUST** be created in Sovereign Mode (using `nodes`).
- The `StructuralAuditor` must maintain the `[SHADOW AUDIT]` prefix for legacy warnings to encourage migration without blocking workflows.
