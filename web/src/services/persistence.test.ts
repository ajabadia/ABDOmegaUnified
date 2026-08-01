/**
 * @jest-environment jsdom
 *
 * PHASE 20.6 - PERSISTENCE TEST
 * Verifies deterministic session saving and error handling.
 */
import { persistenceService } from './persistenceService';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

describe('PersistenceService', () => {
  const docId = 'test_doc';
  const dummyGraph: OmegaNode = { id: 'root', kind: 'group', layout: { pos: { x: 0, y: 0 } }, children: [] };
  const correlationId = 'tx_test_123';
  const hash = 'HASH_VALID_1';

  it('should save and load canonical state correctly', () => {
    persistenceService.saveCanonicalState(docId, dummyGraph, correlationId, hash);
    const loaded = persistenceService.loadCanonicalState();

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(docId);
    expect(loaded!.metadata.syncHash).toBe(hash);
  });

  it('should link correlation ID in metadata', () => {
    persistenceService.saveCanonicalState(docId, dummyGraph, correlationId, hash);
    const loaded = persistenceService.loadCanonicalState();
    expect(loaded?.metadata.lastCorrelationId).toBe(correlationId);
  });

  it('should clear persisted state on clearPersistedState', () => {
    persistenceService.saveCanonicalState(docId, dummyGraph, correlationId, hash);
    persistenceService.clearPersistedState();
    const cleared = persistenceService.loadCanonicalState();
    expect(cleared).toBeNull();
  });
});
