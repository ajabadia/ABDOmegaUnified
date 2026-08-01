/**
 * @purpose Re-export canonical history types from omega-ui-core.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:4,imports:0,sig:deprecated
 * @lastUpdated 2026-06-22
 * @deprecated Import directly from '@/omega-ui-core/types/history'
 */

export type {
  HistoryEventType,
  HistoryEntry,
  HistoryState,
} from '@/omega-ui-core/types/history';

export { INITIAL_HISTORY_STATE } from '@/omega-ui-core/types/history';
