/**
 * @purpose Gestiona la persistencia y ciclo de vida de los bocetos de CellStudio en sessionStorage para la recuperación en el flujo medio.
 * @purpose_en Manages the persistence and lifecycle of CellStudio drafts in sessionStorage for mid-workflow recovery.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:11hnkmz
 * @lastUpdated 2026-06-15T12:47:20.156Z
 */

/**
 * Phase 0: Draft Persistence for CellStudio Mid-Workflow Recovery
 * 
 * Persists CellStudio state to sessionStorage to prevent data loss
 * when users navigate away or refresh mid-creation.
 */

import type { ManifestEntity } from '@/omega-ui-core/types/manifest';
import type { AssetBehavior, LayerRecipe } from '@/omega-ui-core/types/assetBehavior';

export interface CellStudioDraft {
  step: number;
  cellData: ManifestEntity;
  behavior: AssetBehavior;
  recipe: LayerRecipe;
  savedAt: number;
}

const STORAGE_KEY = 'omega_cellstudio_draft';

/**
 * Hook for managing CellStudio draft persistence.
 */
export function useCellStudioDraft() {
  const saveDraft = (data: Omit<CellStudioDraft, 'savedAt'>): void => {
    try {
      const draft: CellStudioDraft = {
        ...data,
        savedAt: Date.now()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('[CellStudioDraft] Failed to save draft:', e);
    }
  };

  const loadDraft = (): CellStudioDraft | null => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CellStudioDraft;
    } catch {
      return null;
    }
  };

  const hasDraft = (): boolean => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  };

  const clearDraft = (): void => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[CellStudioDraft] Failed to clear draft:', e);
    }
  };

  const getDraftAge = (): number | null => {
    const draft = loadDraft();
    if (!draft) return null;
    return Date.now() - draft.savedAt;
  };

  const isDraftStale = (maxAgeMs: number = 30 * 60 * 1000): boolean => {
    const age = getDraftAge();
    if (age === null) return false;
    return age > maxAgeMs;
  };

  return {
    saveDraft,
    loadDraft,
    hasDraft,
    clearDraft,
    getDraftAge,
    isDraftStale
  };
}

export { STORAGE_KEY as CELL_STUDIO_DRAFT_KEY };