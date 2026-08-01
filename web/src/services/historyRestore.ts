/**
 * @purpose Gestiona el restaurado de estados manifestos históricos cargando una revisión, validándola y preparando nodos para su promoción.
 * @purpose_en Manages the restoration of historical manifest states by loading a revision, validating it, and preparing nodes for promotion.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:new
 * @lastUpdated 2026-06-22
 */

import { historyService } from './historyService';
import { BlueprintValidator } from '@/omega-ui-core/utils/blueprintValidator';
import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA ERA 8.0.0 - TIME TRAVEL RESTORE (Phase 21.4)
 * Orchestrates the safe restoration of historical manifest states.
 */
export class HistoryRestoreEngine {
  private static eventBus: IEventBus | undefined;

  static setEventBus(bus: IEventBus | undefined) {
    HistoryRestoreEngine.eventBus = bus;
  }

  /**
   * prepareRestore
   * Loads a revision and validates it before promotion.
   */
  static async prepareRestore(revisionId: string, _manifest: Partial<OMEGA_Manifest>): Promise<OmegaNode[] | null> {
    const startTime = Date.now();
    const entry = historyService.getRevision(revisionId);
    
    if (!entry) {
      console.error(`[HISTORY RESTORE] Revision not found: ${revisionId}`);
      return null;
    }

    try {
      // Gatekeeping: Historical data must pass validation before activation
      const nodesToRestore = entry.manifest.ui?.tree?.children || [];
      
      if (entry.manifest.ui?.tree) {
         BlueprintValidator.validate(entry.manifest.ui.tree, entry.manifest);
      }
      
      const durationMs = Date.now() - startTime;

      HistoryRestoreEngine.eventBus?.emit('system:log', {
        level: 'SUCCESS',
        message: `[HISTORY RESTORE] Validated revision ${revisionId} (${durationMs}ms)`,
      });

      return nodesToRestore as OmegaNode[];
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.error(`[HISTORY RESTORE] Validation failed for revision ${revisionId}:`, err);

      HistoryRestoreEngine.eventBus?.emit('system:error', {
        source: 'HISTORY_RESTORE',
        message: `Revision ${revisionId} failed validation (${durationMs}ms): ${err instanceof Error ? err.message : String(err)}`,
      });

      return null;
    }
  }
}

