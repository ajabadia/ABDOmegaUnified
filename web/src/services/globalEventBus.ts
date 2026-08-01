/**
 * @purpose Referencia global al bus de eventos para servicios singleton que no pueden usar constructor DI
 * @purpose_en Global event bus reference for singleton services that cannot use constructor DI
 * @refactorable false
 * @classification Infrastructure
 * @complexity Trivial
 * @fingerprint exports:3,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import type { OmegaEventName, OmegaEventMap } from '@/omega-ui-core/di/eventTypes';
import type { IServiceContainer, ServiceToken } from '@/omega-ui-core/di/ServiceContainer';

let _globalEventBus: IEventBus | null = null;
let _globalContainer: IServiceContainer | null = null;

export function setGlobalEventBus(bus: IEventBus): void {
  _globalEventBus = bus;
}

export function getGlobalEventBus(): IEventBus | null {
  return _globalEventBus;
}

export function setGlobalContainer(container: IServiceContainer): void {
  _globalContainer = container;
}

export function getGlobalContainer(): IServiceContainer | null {
  return _globalContainer;
}

/**
 * Convenience: resolve a service from the global DI container.
 * Throws if container is not initialized.
 */
export function getService<T>(token: ServiceToken<T>): T {
  if (!_globalContainer) {
    throw new Error(
      'Service container not initialized. Ensure omega-init.ts is imported before accessing services.'
    );
  }
  return _globalContainer.resolve(token);
}

/**
 * Helper for services that accept optional event bus via constructor.
 * Falls back to global event bus if instance-level bus is not set.
 */
export function emitEvent<K extends OmegaEventName>(
  instanceBus: IEventBus | undefined,
  event: K,
  payload: OmegaEventMap[K]
): void {
  const bus = instanceBus ?? getGlobalEventBus();
  bus?.emit(event, payload);
}
