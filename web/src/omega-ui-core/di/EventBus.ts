/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose EventBus tipado para comunicación pub-sub entre servicios
 * @purpose_en Typed event bus for pub-sub communication between services
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import type { OmegaEventMap, OmegaEventName } from './eventTypes';

export interface IEventBus {
  on<E extends OmegaEventName>(event: E, handler: (payload: OmegaEventMap[E]) => void): () => void;
  once<E extends OmegaEventName>(event: E, handler: (payload: OmegaEventMap[E]) => void): void;
  off<E extends OmegaEventName>(event: E, handler: (payload: OmegaEventMap[E]) => void): void;
  emit<E extends OmegaEventName>(event: E, payload: OmegaEventMap[E]): void;
  clear(): void;
}

export class EventBus implements IEventBus {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on<E extends OmegaEventName>(event: E, handler: (payload: OmegaEventMap[E]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (...args: unknown[]) => void);
    return () => this.off(event, handler);
  }

  once<E extends OmegaEventName>(event: E, handler: (payload: OmegaEventMap[E]) => void): void {
    const wrapper = (payload: OmegaEventMap[E]) => {
      this.off(event, wrapper as (...args: unknown[]) => void);
      handler(payload);
    };
    this.on(event, wrapper);
  }

  off<E extends OmegaEventName>(event: E, handler: (payload: OmegaEventMap[E]) => void): void {
    this.listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<E extends OmegaEventName>(event: E, payload: OmegaEventMap[E]): void {
    this.listeners.get(event)?.forEach(handler => handler(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
