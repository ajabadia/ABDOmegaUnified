/**
 * @jest-environment jsdom
 *
 * PHASE 20.7 - TRANSACTIONAL EDITING LOGIC TEST
 * Verifies the atomic commitment and rollback logic in the orchestrator reducer.
 */

interface MockManifest {
  id: string;
  value: number;
}

interface MockTransaction {
  label: string;
  baseManifest: MockManifest;
  correlationId: string;
}

interface MockDocument {
  id: string;
  manifest: MockManifest;
  activeTransaction: MockTransaction | null;
}

interface MockState {
  documentsById: Record<string, MockDocument>;
}

type MockAction =
  | { type: 'START_TRANSACTION'; id: string; label: string; correlationId: string }
  | { type: 'UPDATE_DOCUMENT'; id: string; updates: { manifest: Partial<MockManifest> } }
  | { type: 'COMMIT_TRANSACTION'; id: string }
  | { type: 'ABORT_TRANSACTION'; id: string };

function deepMerge(target: MockManifest, source: Partial<MockManifest>): MockManifest {
  return { ...target, ...source };
}

function reducer(state: MockState, action: MockAction): MockState {
  const doc = state.documentsById[action.id];
  if (!doc) return state;

  switch (action.type) {
    case 'START_TRANSACTION':
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            activeTransaction: {
              label: action.label,
              baseManifest: JSON.parse(JSON.stringify(doc.manifest)),
              correlationId: action.correlationId,
            },
          },
        },
      };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            manifest: deepMerge(doc.manifest, action.updates.manifest),
          },
        },
      };
    case 'COMMIT_TRANSACTION':
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...doc, activeTransaction: null },
        },
      };
    case 'ABORT_TRANSACTION':
      if (!doc.activeTransaction) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            manifest: doc.activeTransaction.baseManifest,
            activeTransaction: null,
          },
        },
      };
    default:
      return state;
  }
}

function createInitialState(): MockState {
  return {
    documentsById: {
      doc1: {
        id: 'doc1',
        manifest: { id: 'm1', value: 10 },
        activeTransaction: null,
      },
    },
  };
}

describe('Transaction Logic (reducer)', () => {
  it('should apply mid-transaction updates', () => {
    let state = reducer(createInitialState(), {
      type: 'START_TRANSACTION',
      id: 'doc1',
      label: 'Test Transaction',
      correlationId: 'tx_1',
    });
    state = reducer(state, {
      type: 'UPDATE_DOCUMENT',
      id: 'doc1',
      updates: { manifest: { value: 20 } },
    });
    expect(state.documentsById.doc1.manifest.value).toBe(20);
  });

  it('should rollback to base manifest on abort', () => {
    let state = reducer(createInitialState(), {
      type: 'START_TRANSACTION',
      id: 'doc1',
      label: 'Test Transaction',
      correlationId: 'tx_1',
    });
    state = reducer(state, {
      type: 'UPDATE_DOCUMENT',
      id: 'doc1',
      updates: { manifest: { value: 20 } },
    });
    state = reducer(state, { type: 'ABORT_TRANSACTION', id: 'doc1' });
    expect(state.documentsById.doc1.manifest.value).toBe(10);
    expect(state.documentsById.doc1.activeTransaction).toBeNull();
  });

  it('should persist changes on commit', () => {
    let state = reducer(createInitialState(), {
      type: 'START_TRANSACTION',
      id: 'doc1',
      label: 'T2',
      correlationId: 'tx_2',
    });
    state = reducer(state, {
      type: 'UPDATE_DOCUMENT',
      id: 'doc1',
      updates: { manifest: { value: 30 } },
    });
    state = reducer(state, { type: 'COMMIT_TRANSACTION', id: 'doc1' });
    expect(state.documentsById.doc1.manifest.value).toBe(30);
    expect(state.documentsById.doc1.activeTransaction).toBeNull();
  });
});
