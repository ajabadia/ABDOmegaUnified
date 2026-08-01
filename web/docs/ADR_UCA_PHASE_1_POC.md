# ADR: UCA Phase 1 - Additive PoC

## Context
The OMEGA legacy manifest uses a flat structure of arrays (`controls`, `jacks`, `containers`). This structure suffers from limitations in composition (e.g., nested macro-cells like a Knob with an embedded LED) and makes reasoning about z-indexes and coordinates harder.

To migrate to a hierarchical `Composite` pattern without breaking the existing stability, we decided to perform an *Additive Proof of Concept (PoC)*.

## Decisions

### 1. The `OmegaNode` Contract
We introduced `OmegaNode`, a recursive data structure to represent all interface elements uniformly (`rack`, `face`, `container`, `cell`, `layer`). This serves as the new canonical blueprint.

### 2. Forward Projection (`manifestToTree`)
Instead of rewriting the entire JSON manifest at once, we implemented an additive bridge (`ucaBridge.ts`) that projects the legacy flat arrays into an `OmegaNode` tree dynamically at runtime.

### 3. Experimental `UniversalRenderer`
We implemented a recursive rendering engine (`UniversalRenderer`) placed behind a strict UI toggle ("UCA Architecture"). When disabled, the legacy rendering pipeline is used, ensuring 100% backward compatibility. When enabled, the UCA tree is rendered and tested for 1:1 visual parity against the legacy engine.

## Consequences
- **Positive**: We successfully proved the viability of a recursive UI engine without disturbing the production system.
- **Negative**: The PoC highlighted that naive expansion of nodes without strict resolution semantics or bidirectionality is insufficient for complex nesting.

## Status
**Accepted** - Phase 1 complete. Proved the viability of the `OmegaNode` tree.
*Extended by ADR_UCA_PHASE_2_COMPOSITION.md*
