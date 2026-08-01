# ADR-027: Transactional Editing (Phase 20.7)

## Status
PROPOSED

## Context
In previous phases, the OMEGA Manifest Editor processed changes as immediate, granular updates. While this works for simple parameter tweaks, complex structural operations (like adding a multi-node module or refactoring a sub-graph) can leave the system in inconsistent intermediate states if any part of the multi-step operation fails. To ensure industrial-grade reliability, operations must be treated as atomic transactions.

## Decision
The system will implement a Transactional Editing layer to group multiple mutations into single, atomic units of work.

### Key Mechanisms:
1. **Transaction Context**: Introduce a `startTransaction(label)` and `commitTransaction()` pattern in the `useDocumentOrchestrator`. 
2. **Buffer-and-Flush Mutation**: During an active transaction, mutations are collected in a temporary buffer. The active manifest state is NOT updated until the transaction is committed.
3. **Atomic Validation & Sync**: Upon `commitTransaction()`, the final resulting state is validated via `BlueprintValidator`. If valid, the entire block is synchronized to the bridge in a single `syncSnapshot` operation.
4. **Automatic Rollback**: If validation fails or the bridge rejects the committed state, the transaction is discarded, and the system reverts to the state prior to `startTransaction()`.
5. **Observability Integration**: Transactions will carry a unique `correlationId` and log `TRANSACTION_START`, `TRANSACTION_COMMIT`, or `TRANSACTION_ABORT` events.

## Consequences
- Complex structural changes become atomic (all-or-nothing).
- The bridge receives fewer, but more meaningful, synchronization bursts.
- Intermediate inconsistent states are never visible to the runtime or persisted.
- Error handling is simplified by allowing total revert of a failed complex operation.

## Done When
- Orchestrator supports named transactions.
- Mutations within a transaction do not trigger immediate bridge sync.
- Committing a transaction performs a single atomic validation and sync.
- Aborting or failing a transaction restores the pre-transaction state.
- Transaction events are traceable in observability logs.

## Functional Contract
### Input
- `startTransaction(label: string)`
- Multiple granular updates (`updateDocument`, `updateItem`)
- `commitTransaction()` or `abortTransaction()`

### Output
- Single `syncSnapshot` on commit.
- Updated `Persistence` state on success.
- Logged transaction outcome.

## Non-Goals
- This phase does not replace the granular update system for simple, high-frequency parameter tweaks (like a slider movement).
- This phase does not implement nested transactions.

## Acceptance Criteria
1. Performing a multi-step edit (Add node + Bind it) inside a transaction results in only one bridge sync.
2. Failing the second step of a transaction and calling `abortTransaction()` leaves the manifest exactly as it was before the first step.
3. High-frequency parameter updates can still function outside of transactions for low-latency feedback.
