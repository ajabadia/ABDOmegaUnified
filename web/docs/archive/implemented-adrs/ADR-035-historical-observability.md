# ADR-035: Historical Observability (Phase 21.4)

## Status
PROPOSED

## Context
After History Capture, Semantic Diff, and Time-Travel Restore, the system can record, compare, and restore historical revisions. The remaining gap is operational visibility into the history subsystem itself: the editor needs to know when history was captured, diffed, queried, or restored, and it needs those events tied back to the same correlation and lineage model used by the live runtime.
Historical observability is required so audit trails, revision lineage, latency, and failures in the history layer can be monitored as first-class signals rather than hidden implementation details.

## Decision
The system will implement a Historical Observability layer for the History Engine.

### Key Mechanisms:
1. **History-Specific Events**: History operations will emit dedicated events for capture, diff creation, restore request, restore success, and restore failure.
2. **Correlation and Lineage**: Every history event will include correlation identifiers and revision lineage metadata so the full story of a change can be reconstructed across live and historical flows.
3. **Telemetry Separation**: History observability will be distinct from runtime observability, while still being linkable through shared trace context and revision IDs.
4. **Latency Monitoring**: Capture, diff, and restore operations will record duration metrics so slow history paths can be detected and improved.
5. **Failure Visibility**: Errors in the history subsystem must be emitted as discrete operational events, not just swallowed as UI failures.

## Consequences
- The history subsystem becomes auditable as a system of its own.
- Slow or failing history operations become visible without polluting live runtime telemetry.
- Audit trails can be correlated with actual editor behavior and revision lineage.
- Operators can distinguish live execution issues from history-layer issues.

## Done When
- History capture, diff, and restore emit structured observability events.
- Events include correlation IDs, revision IDs, and lineage metadata.
- Latency and failure signals are measurable.
- History telemetry remains distinct from live runtime telemetry.
- Historical operations can be traced end-to-end through logs and metrics.
