# ADR-024: Blueprint Runtime Instantiation (Phase 20.4)

## Status
ACCEPTED

## Context
After closing Phase 20.3, the bridge now guarantees confirmed synchronization, heartbeat monitoring, and delta buffering between the editor and the C++/WASM runtime.
The remaining challenge is to ensure that every Blueprint reaching the runtime is instantiated as a deterministic, complete, and valid runtime object, without partial states or ambiguous structural interpretation.

## Decision
The system will introduce a Blueprint Runtime Instantiation layer between the editable Blueprint representation and the executable runtime instance.

### Key Mechanisms:
1. **Canonical Resolution**: Every Blueprint must first be resolved into a canonical form before runtime materialization. The resolver performs structural normalization (defaults, deep-cloning) but DOES NOT correct semantic errors.
2. **Blocking Pre-Instantiation Validation**: Validation occurs as a hard gate before transmission to the runtime. Any violation (Duplicate IDs, Missing Bindings, Missing Assets, Cycles) blocks the entire synchronization. This is a permanent architectural mandate: no malformed Blueprint shall ever reach the execution engine.
3. **Deterministic Materialization**: Given the same canonical Blueprint input, the runtime must produce the same logical instance every time.
4. **Atomic Construction & Soft Rollback**: If instantiation fails, a soft rollback is triggered to clear partial handles and bindings, ensuring no residue remains in the engine memory.
5. **Traceability & Diagnostics**: Errors include the exact hierarchical path of the offending node to enable rapid developer remediation.
6. **Stable Diagnostic Contract**: Reported errors MUST include a deterministic `path`, a unique error `code`, and a descriptive `reason` to ensure reproducibility and unambiguous diagnostics in high-pressure engineering scenarios.


## Consequences
- The runtime no longer depends on implicit interpretation of the editor state.
- Partial or incomplete structures are prevented from entering execution.
- Debugging becomes more reliable because every instance has a traceable source.
- Blueprints can evolve without breaking runtime predictability.

## Done When
- Blueprints are resolved into a canonical form before instantiation.
- Validation blocks incomplete or inconsistent Blueprints.
- Instantiation is reproducible across equivalent executions.
- Failed instantiation leaves no partial runtime residue.
- Runtime instances expose minimal provenance metadata.

## Functional Contract
### Input
- Editable or serialized Blueprint.
- Bridge state already synchronized and operational.

### Output
- Valid, complete, deterministic runtime instance.
- Explicit error if resolution or validation fails.

## Non-Goals
- This phase does not alter Blueprint musical semantics.
- This phase does not add new real-time control logic.
- This phase does not replace the live bridge established in Phase 20.3.

## Acceptance Criteria
- The same input Blueprint produces the same runtime instance.
- Partial instances are never exposed to the engine.
- The runtime only receives validated structures.
- Errors are observable, explicit, and reproducible.

## Rule of Thumb
> A Blueprint does not exist in runtime until it has been validated, canonicalized, and materialized as a complete instance.
