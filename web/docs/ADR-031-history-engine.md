# ADR-031: History Engine (Phase 21)

## Status
PROPOSED

## Context
After Phase 20.9, the system is fully atomic, persistent, efficient, convergent, and observable. The remaining gap is not runtime stability, but historical understanding: the editor needs a way to record and reconstruct meaningful evolution of the manifest over time, beyond the last persisted good state.

## Decision
The system will introduce a History Engine as a dedicated layer for versioned state capture, semantic diff, and safe time-travel restore.

### Key Mechanisms:
1. **Versioned History Entries**: Significant edits, transactions, snapshots, and recovery points will be recorded as versioned history entries.
2. **Semantic Diff**: History comparisons will focus on meaning and structure (nodes, bindings) rather than raw text.
3. **Time-Travel Restore**: Historical revisions can be restored through the orchestrator, passing through the same validation gates as live state.
4. **History Separation**: The history layer is read-optimized and isolated from live orchestration to avoid performance coupling.

## Consequences
- The system can explain its own evolution.
- Restoring older revisions becomes safer and more auditable.
- The history subsystem adds value without disturbing the live runtime pipeline.

## Done When
- Meaningful edits are captured as history entries.
- Revisions can be queried and compared semantically.
- A prior version can be restored through validation.
