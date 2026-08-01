/**
 * @purpose Gestiona el estado persistente del gráfico canónico del editor de manifestaciones OMEGA en localStorage.
 * @purpose_en Manages the persistence of the OMEGA manifest editor's canonical graph state in localStorage.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:3sci5j
 * @lastUpdated 2026-06-22
 */

import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { emitEvent } from './globalEventBus';

export interface PersistedState {
  id: string;
  graph: OmegaNode;
  metadata: {
    schemaVersion: string;
    lastCorrelationId: string;
    timestamp: number;
    syncHash: string;
  };
}

const STORAGE_KEY = 'omega_canonical_session';

class PersistenceService {
  constructor(private eventBus?: IEventBus) {}

  /**
   * saveCanonicalState
   * Persists the validated canonical graph to disk.
   */
  saveCanonicalState(id: string, graph: OmegaNode, correlationId: string, hash: string, version: string = '7.2.3') {
    try {
      const state: PersistedState = {
        id,
        graph,
        metadata: {
          schemaVersion: version,
          lastCorrelationId: correlationId,
          timestamp: Date.now(),
          syncHash: hash
        }
      };

      const payload = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, payload);

      emitEvent(this.eventBus, 'persistence:save', {
        documentId: id,
        correlationId,
        success: true,
      });
    } catch {
      emitEvent(this.eventBus, 'persistence:save', {
        documentId: id,
        correlationId,
        success: false,
      });
    }
  }

  /**
   * loadCanonicalState
   * Retrieves the raw persisted state.
   */
  loadCanonicalState(): PersistedState | null {
    try {
      const payload = localStorage.getItem(STORAGE_KEY);
      if (!payload) return null;
      return JSON.parse(payload) as PersistedState;
    } catch {
      console.error('[OMEGA PERSISTENCE] Corrupt state found in storage.');
      return null;
    }
  }

  /**
   * clearPersistedState
   * Explicitly wipes the session (used for migrations or corruption).
   */
  clearPersistedState() {
    localStorage.removeItem(STORAGE_KEY);
    emitEvent(this.eventBus, 'persistence:save', {
      documentId: 'system',
      correlationId: 'system',
      success: true,
      cleared: true,
    });
  }
}

export const persistenceService = new PersistenceService();
