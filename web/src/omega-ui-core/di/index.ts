/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Barril de exportación del módulo DI
 * @purpose_en DI module barrel export
 * @refactorable false
 * @classification Barrel
 * @complexity Low
 * @fingerprint exports:10,imports:3,sig:new
 * @lastUpdated 2026-06-22
 */

export { ServiceContainer, createToken } from './ServiceContainer';
export type { IServiceContainer, ServiceToken } from './ServiceContainer';
export { EventBus } from './EventBus';
export type { IEventBus } from './EventBus';
export type { OmegaEventMap, OmegaEventName, OmegaEventHandler } from './eventTypes';

// ── Service Tokens ─────────────────────────────────────────────────────
import { createToken } from './ServiceContainer';
import type { IEventBus } from './EventBus';

// Service singleton types — kept as inline typeof import() to avoid runtime coupling.
// These are compile-time only; no runtime import is created.
type HistoryServiceT = typeof import('@/services/historyService').historyService;
type PersistenceServiceT = typeof import('@/services/persistenceService').persistenceService;
type ReconciliationServiceT = typeof import('@/services/reconciliationService').reconciliationService;
type ObservabilityServiceT = typeof import('@/services/observabilityService').observabilityService;
type WasmRuntimeT = typeof import('@/services/wasmRuntime').wasmRuntime;
type InputSignalServiceT = typeof import('@/services/inputSignalService').inputSignalService;

export const EVENT_BUS = createToken<IEventBus>('EVENT_BUS');
export const HISTORY_SERVICE = createToken<HistoryServiceT>('HISTORY_SERVICE');
export const PERSISTENCE_SERVICE = createToken<PersistenceServiceT>('PERSISTENCE_SERVICE');
export const RECONCILIATION_SERVICE = createToken<ReconciliationServiceT>('RECONCILIATION_SERVICE');
export const OBSERVABILITY_SERVICE = createToken<ObservabilityServiceT>('OBSERVABILITY_SERVICE');
export const WASM_RUNTIME = createToken<WasmRuntimeT>('WASM_RUNTIME');
export const INPUT_SIGNAL_SERVICE = createToken<InputSignalServiceT>('INPUT_SIGNAL_SERVICE');

// Convenience namespace for grouped import
export const SERVICE_TOKENS = {
  EVENT_BUS,
  HISTORY_SERVICE,
  PERSISTENCE_SERVICE,
  RECONCILIATION_SERVICE,
  OBSERVABILITY_SERVICE,
  WASM_RUNTIME,
  INPUT_SIGNAL_SERVICE,
} as const;
