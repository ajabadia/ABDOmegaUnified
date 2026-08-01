# ADR 005: UCA Module Templates & Governance

## Status
Proposed (Phase 5)

## Context
As the Universal Cell Architecture (UCA) transitions from manual layout editing to complex module composition, we need a system that allows users to instantiate pre-defined modules (Blueprints) while maintaining control over which parts of the module are customizable.

Additionally, we must maintain the "Aseptic Core" principle, where the core runtime is decoupled from the specific visual catalog, while ensuring that exported modules (.acepack) are fully portable.

## Decision
We will implement a **ModuleTemplate** system with the following characteristics:

### 1. Template vs. Instance Separation
- **Template**: A read-only blueprint containing a root `OmegaNode` tree, logical slots, and an `OverridePolicy`.
- **Instance**: A reference in the manifest (`templateRef`) combined with an `overrides` map and an optional `snapshot` for portability.

### 2. Genetic Merge Logic
The UCA expansion engine will resolve a `templateRef` by:
1. Fetching the template from the catalog (web layer).
2. Deep-cloning the template's `root` tree.
3. Applying `overrides` while enforcing the `OverridePolicy` (deterministic, path-based rules).
4. Mapping logical `slots` to concrete DSP bindings provided in the instance.

### 3. Portability (The Snapshot)
When a module is exported as an `.acepack`, the editor will generate a "congealed" `snapshot` of the resolved template tree.
- **Priority**: Host runtimes (ABDOmega) MUST prioritize the `snapshot`. It acts as the source of truth for deployed modules.
- **Independence**: The `snapshot` ensures that a module remains functional even if the source template in the web catalog is deleted or modified.
- **Editor Workflow**: The editor works with `templateRef + overrides` for live editing but always generates a fresh snapshot upon export.

### 4. Logical Slots & Compatibility
Templates define **Slots** (kind: parameter, port, etc.).
- **Wiring**: The instance provides the mapping from Slot ID to actual DSP binding.
- **Validation**: The system must verify that all `required` slots in a template are mapped to valid parameters in the DSP contract before allowing export.

## Consequences
- **Positive**: High reusability of UI designs, strict brand governance via locked properties, and guaranteed portability.
- **Negative**: Increased complexity in the expansion engine (`ucaSemantics.ts`) and larger manifest sizes when snapshots are included.
- **Mitigation**: Use compact path-based overrides and only snapshot the minimum required tree.
