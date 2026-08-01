/**
 * @purpose Inicializa el contenedor DI y conecta servicios al bus de eventos
 * @purpose_en Initializes the DI container and wires services to the event bus
 * @refactorable false
 * @classification Infrastructure
 * @complexity Low
 * @fingerprint exports:3,imports:6,sig:new
 * @lastUpdated 2026-06-22
 */

import { ServiceContainer } from '@/omega-ui-core/di/ServiceContainer';
import { EventBus } from '@/omega-ui-core/di/EventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';
import { setGlobalEventBus, setGlobalContainer } from './globalEventBus';
import { observabilityService } from './observabilityService';
import { historyService } from './historyService';
import { persistenceService } from './persistenceService';
import { reconciliationService } from './reconciliationService';
import { wasmRuntime } from './wasmRuntime';
import { inputSignalService } from './inputSignalService';
import { HistoryRestoreEngine } from './historyRestore';

let initialized = false;

export function initializeServiceContainer(): ServiceContainer {
  if (initialized) {
    throw new Error('Service container already initialized');
  }

  const container = new ServiceContainer();
  const eventBus = new EventBus();

  setGlobalEventBus(eventBus);
  setGlobalContainer(container);

  container.register(SERVICE_TOKENS.EVENT_BUS, eventBus);
  container.register(SERVICE_TOKENS.OBSERVABILITY_SERVICE, observabilityService);
  container.register(SERVICE_TOKENS.HISTORY_SERVICE, historyService);
  container.register(SERVICE_TOKENS.PERSISTENCE_SERVICE, persistenceService);
  container.register(SERVICE_TOKENS.RECONCILIATION_SERVICE, reconciliationService);
  container.register(SERVICE_TOKENS.WASM_RUNTIME, wasmRuntime);
  container.register(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE, inputSignalService);

  // Static classes that use event bus
  HistoryRestoreEngine.setEventBus(eventBus);

  initialized = true;
  return container;
}

export function isServiceContainerInitialized(): boolean {
  return initialized;
}

export function resetServiceContainer(): void {
  initialized = false;
}
