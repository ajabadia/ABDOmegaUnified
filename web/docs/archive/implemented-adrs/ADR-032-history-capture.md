# ADR-032: History Capture (Phase 21.1)

## Status
PROPOSED

## Context
The History Engine requires a first concrete layer for capturing meaningful evolution. We need to record transaction commits, structural snapshots, and recovery points as durable history events with lineage metadata.

## Decision
The system will implement a History Capture layer as the first submodule of the History Engine.

### Key Mechanisms:
1. **Capture on Significant Events**: Record history entries on transaction commit, validated structural snapshot, and recovery point creation.
2. **Stable Revision Identity**: Each entry receives a unique revision ID, timestamp, and schema version.
3. **Lineage Metadata**: Entries include correlation IDs and parent revision references to reconstruct the evolution chain.
4. **Append-Only Log**: History is stored as a queryable, append-only record separate from live state.

## Consequences
- Significant changes become inspectable after the fact.
- Reconstructable revision lineage.
- Isolation from live execution logic.

## Done When
- Transaction commits produce history entries.
- Validated snapshots are captured as history events.
- Recovery points are recorded with lineage metadata.
