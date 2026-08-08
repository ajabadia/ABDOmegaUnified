/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Tipos de eventos del sistema OMEGA
 * @purpose_en OMEGA system event types
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:new
 * @lastUpdated 2026-06-22
 */

export interface OmegaEventMap {
  'history:captured': { entryId: string; type: string; label: string; timestamp: number };
  'history:undo': { targetIndex: number };
  'history:redo': { targetIndex: number };
  'history:branch': { parentId: string; branchId: string };
  'persistence:save': { documentId: string; correlationId: string; success: boolean; cleared?: boolean };
  'persistence:load': { key: string };
  'persistence:clear': { key: string };
  'reconciliation:conflict': { path: string; policy: string; resolved: unknown };
  'reconciliation:resolved': { path: string; resolution: string };
  'wasm:connected': { transport: string };
  'wasm:disconnected': Record<string, never>;
  'wasm:delta:applied': { count: number; latency: number };
  'wasm:deploy': { status: string };
  'audit:completed': { manifestId: string; errors: number; warnings: number };
  'system:error': { source: string; message: string; stack?: string };
  'system:log': { level: string; message: string };
}

export type OmegaEventName = keyof OmegaEventMap & string;

export type OmegaEventHandler<E extends OmegaEventName = OmegaEventName> =
  E extends keyof OmegaEventMap ? (payload: OmegaEventMap[E]) => void : (payload: unknown) => void;
