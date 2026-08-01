# ADR-033: Semantic Diff (Phase 21.2)

## Status
PROPOSED

## Context
The History Engine needs a way to explain changes between revisions. Textual diffs are insufficient for manifest nodes as they don't capture the structural meaning of additions, removals, or property updates within the tree.

## Decision
The system will implement a Semantic Diff Engine that performs a node-by-node comparison of manifest trees.

### Key Mechanisms:
1. **Node Flattening**: Both revision graphs are flattened into ID-indexed maps for efficient lookup.
2. **Structural Categorization**: Changes are classified as `ADD`, `REMOVE`, `UPDATE`, or `MOVE`.
3. **Property Comparison**: Nodes with the same ID are compared for property changes to detect fine-grained updates.
4. **Isolations**: The diff engine is a pure utility that does not mutate any state.

## Consequences
- Users can see meaningful summaries of changes between any two points in history.
- The system can automate audit reports based on structural differences.
- Reduces cognitive load when reviewing complex manifest evolutions.

## Done When
- A diff can be generated between any two `HistoryEntry` items.
- The diff accurately identifies added/removed nodes.
- The diff detects property updates in existing nodes.
