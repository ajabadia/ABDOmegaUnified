/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Contenedor DI tipado para servicios
 * @purpose_en Typed service container for the OMEGA services layer
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:new
 * @lastUpdated 2026-06-22
 */

export type ServiceToken<T> = string & { __brand: T };

export function createToken<T>(name: string): ServiceToken<T> {
  return name as ServiceToken<T>;
}

export interface IServiceContainer {
  register<T>(token: ServiceToken<T>, instance: T): void;
  resolve<T>(token: ServiceToken<T>): T;
  has(token: ServiceToken<unknown>): boolean;
  reset(): void;
}

export class ServiceContainer implements IServiceContainer {
  private registry = new Map<string, unknown>();

  register<T>(token: ServiceToken<T>, instance: T): void {
    this.registry.set(token, instance);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const instance = this.registry.get(token);
    if (!instance) {
      throw new Error(`Service not registered: ${token}`);
    }
    return instance as T;
  }

  has(token: ServiceToken<unknown>): boolean {
    return this.registry.has(token);
  }

  reset(): void {
    this.registry.clear();
  }
}
