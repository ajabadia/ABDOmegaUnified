# ADR-034: Time-Travel Restore (Phase 21.3)

## Status
PROPOSED

## Context
After History Capture and Semantic Diff, the system can record meaningful revisions and compare them semantically. The next requirement is the ability to restore a historical revision safely, without letting history bypass the same validation and gatekeeping rules that protect live runtime state.
A time-travel restore mechanism is needed so the editor can return to a prior revision deterministically, while preserving auditability and avoiding accidental corruption or drift.

## Decision
The system will implement a Time-Travel Restore layer that restores a selected historical revision through validated orchestration.

### Key Mechanisms:
1. **Revision-Based Restore**: Restore operations will target a specific revision ID rather than an ambiguous timestamp, ensuring deterministic recovery.
2. **Pre-Restore Validation**: The candidate historical state must pass the same Blueprint validation rules used by live synchronization before it can become active.
3. **Safe Restore Path**: Restore will occur through the orchestrator, not by mutating state directly, so observability, persistence, and reconciliation remain consistent.
4. **Read-Then-Activate Flow**: The system will load the historical revision, validate it, and only then promote it into active editor state.
5. **Restore Traceability**: Restore requests and outcomes will emit observability events so the historical action is auditable and correlated with lineage.

## Consequences
- Users can return to prior states safely and deterministically.
- Historical restoration remains subject to the same structural guardrails as live edits.
- Accidental or corrupted revisions cannot silently replace the active manifest.
- Restore events become part of the system’s traceable operational history.

## Done When
- A selected revision can be restored by ID.
- The restored revision passes validation before activation.
- Invalid historical data falls back safely instead of entering the live state.
- Restore operations are observable and correlated.
- Live runtime contracts remain intact during and after restore.
