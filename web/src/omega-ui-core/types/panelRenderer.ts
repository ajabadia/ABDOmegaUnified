/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Define el contrato canónico de renderizado de paneles OMEGA: tipos de geometría, opciones de render, bindings DOM y transporte bidireccional UI→C++.
 * @purpose_en Defines the canonical OMEGA panel rendering contract: geometry types, render options, DOM bindings and bidirectional UI→C++ transport.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:8,imports:1,sig:5xqq4l
 * @lastUpdated 2026-08-02T00:00:00.000Z
 */

import type { OMEGA_Manifest, OmegaNode, ManifestEntity } from './manifest';

/* ─── Panel Geometry (derived from hardware metadata, NOT hardcoded) ─── */

/** Unidades rack soportadas por el hardware OMEGA (Eurorack). */
export type RackUnit = '1U' | '3U' | string;

/**
 * PanelGeometry — Geometría resuelta de un módulo, derivada exclusivamente de
 * `manifest.metadata.rack.{hp,units,height}`. Erradica las 5 constantes/heurísticas
 * hardcodeadas que residían en ManifestRenderer (widthPx=hp*15, heightPx 144/436,
 * knobSize 32, jackSize 22, isUpper por substring del título).
 */
export interface PanelGeometry {
  /** Ancho del módulo en HP (Eurorack). */
  hp: number;
  /** Unidades rack declaradas por el hardware. */
  units: RackUnit;
  /** Ancho en px derivado: `max(hp * RACK_HP_WIDTH_PX, 120)`. */
  widthPx: number;
  /** Alto en px derivado de `units` vía `rackHeightForUnits`. */
  heightPx: number;
  /** Identificador de slot de altura: '1U' cuando la cara es de media altura. */
  slotType: '1U' | '3U';
  /**
   * Slot físico del módulo en el rack (opcional). NO se infiere del título:
   * solo `manifest.metadata.rack` o el flag `forceUpper` del llamador lo determinan.
   */
  rackSlot?: 'upper' | 'lower' | undefined;
  /** `true` cuando la cara es de 1U (chassis-1u) — única derivación permitida. */
  isUpper: boolean;
}

/* ─── Panel Binding (DOM ↔ parámetro) ─── */

export type PanelBindingKind = 'knob' | 'slider' | 'stepper' | 'select' | 'display' | 'jack';

export interface PanelBindingRange {
  min: number;
  max: number;
  default?: number | undefined;
  step?: number | undefined;
}

/**
 * PanelBinding — Describe una celda interactiva del panel: su identidad de nodo
 * (`data-node-id`), su identidad de entidad/parámetro (`data-id`) y el tipo de
 * control que aloja. Es el mapa que InteractionManager usa para enlazar DOM→RPC.
 */
export interface PanelBinding {
  /** Identidad canónica del nodo (data-node-id) — NO re-hidratar árbol. */
  nodeId: string;
  /** Identidad de la entidad de registro / parámetro (data-id). */
  entityId: string;
  /** Tipo de control alojado por la celda. */
  kind: PanelBindingKind;
  /** Nombre de la entidad en el registro (para telemetría). */
  name?: string | undefined;
  /** Rango del parámetro (opcional, espejo de `entity.meta.range` / `node.meta.range`). */
  range?: PanelBindingRange | undefined;
}

/* ─── Render Options & Result ─── */

/**
 * RenderPanelOptions — Opciones para renderizar un panel completo.
 * Opcionalmente permite override explícito de slot (útil para UPPER/LOWER),
 * sin recurrir a heurísticas de nombre.
 */
export interface RenderPanelOptions {
  /** Forzar slot superior (1U). Prevalece sobre `metadata.rack`. */
  forceUpper?: boolean | undefined;
  /** Skin de render (por defecto: manifest.ui.skin o 'industrial'). */
  skin?: string | undefined;
  /** Zoom de render (por defecto: manifest.ui.layout.zoom o 1). */
  zoom?: number | undefined;
  /** Valor runtime inicial para todas las celdas (default 0.5). */
  runtimeValue?: number | undefined;
  /** Pasos de cuantización de los controles (default 100). */
  steps?: number | undefined;
  /** Tab activa a renderizar (default: la primera con presentation.tab). */
  activeTab?: string | undefined;
  /** Resolver de assets (host: rutas estáticas; editor: mapa de refs). */
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
}

/**
 * Defined<T> — Elimina `undefined` de una unión de forma distributiva.
 * `Required<Pick<...>>` NO basta: solo quita el modificador `?`, pero deja
 * intacto el `| undefined` explícito de las propiedades opcionales
 * (p.ej. `skin?: string | undefined`). `Defined` lo erradica de raíz.
 */
type Defined<T> = T extends undefined ? never : T;

/**
 * ResolvedRenderOptions — `RenderPanelOptions` con los campos críticos de render
 * ya resueltos a valores concretos SIN `undefined` (skin/zoom/runtimeValue/steps),
 * lista para spread directo en `CellOptions`. `resolveRenderOptions` la produce
 * con defaults canónicos; el host/editor ya no maneja opcionales en el render.
 */
export type ResolvedRenderOptions = {
  [K in 'skin' | 'zoom' | 'runtimeValue' | 'steps']: Defined<RenderPanelOptions[K]>;
} &
  Omit<RenderPanelOptions, 'skin' | 'zoom' | 'runtimeValue' | 'steps'>;

/**
 * PanelRenderResult — Contrato único de salida del render de un panel.
 * `html` se inyecta vía innerHTML; `geometry` alimenta el contenedor/chassis;
 * `bindings` alimenta a InteractionManager (o al editor React) sin re-render.
 */
export interface PanelRenderResult {
  html: string;
  geometry: PanelGeometry;
  bindings: PanelBinding[];
}

/* ─── Panel Transport (UI→C++) ─── */

export interface SetParamPayload {
  /** Target global `instanceId.paramId` (host) o `nodeId` (editor). */
  target: string;
  /** Valor normalizado 0-1 (o en rango de la entidad). */
  value: number;
}

/**
 * PanelTransport — Canal bidireccional UI→C++ inyectado por el entorno.
 * El host lo implementa con `rpc.send('setParameter', ...)`; el editor con el
 * store local (`runtimeStore.reduceEvent`). InteractionManager es agnóstico del
 * transporte: nunca conoce la topología del host.
 */
export interface PanelTransport {
  /** Empuja un cambio de parámetro al destino (C++ / store). */
  sendParamChange(payload: SetParamPayload): void;
}

/* ─── Panel Events (C++→UI) ─── */

export type PanelEventType = 'param-change' | 'telemetry' | 'control-update' | 'display' | 'active-tab' | string;

/**
 * PanelEvent — Evento normalizado que llega del destino (C++ o store).
 * Espejo de la ventana de eventos `omega:<tipo>` que RuntimeEventHub consume.
 */
export interface PanelEvent<T = unknown> {
  type: PanelEventType;
  target: string;
  payload: T;
  timestamp?: number | undefined;
}

/* ─── Selectores canónicos (DOM) ─── */

/**
 * Selectores DOM canónicos que InteractionManager y los renderers usan.
 * Fuente de verdad para el enlace de interacción (antes en ControlBinder).
 */
export const PANEL_SELECTORS = {
  /** Atributo de identidad de nodo inyectado por CellRenderer. */
  NODE_ID_ATTR: 'data-node-id',
  /** Atributo de identidad de entidad/parámetro. */
  ENTITY_ID_ATTR: 'data-id',
  KNOB: '.knob-container',
  SLIDER: '.slider-wrapper',
  SLIDER_HORIZONTAL: 'slider-h',
  STEPPER: '.stepper-container, .display-btn',
  SELECT: '.mini-select, .industrial-select-wrapper',
  DIR_ATTR: 'data-dir',
  BIND_ATTR: 'data-bind',
} as const;

/* ─── Convenience: resolver bindings del árbol ─── */

/** Kinds estructurales de `OmegaNode` que NO producen binding interactivo. */
const STRUCTURAL_NODE_KINDS: ReadonlySet<string> = new Set([
  'rack',
  'face',
  'container',
  'group',
  'layer',
  'asset-layer',
  'patch',
  'root',
]);

/**
 * collectBindingsFromTree — Recorre el `ui.tree` y extrae los bindings de cada
 * celda primitiva interactiva. Es el único punto donde el render del panel
 * produce su mapa de interacción (sin duplicar selectores en el host).
 *
 * Espeja exactamente la salida de CellRenderer: `data-node-id` = `node.id`,
 * `data-source` = `node.id`, y la identidad de parámetro = `node.bind` (DSP
 * contract ID) o `node.id` como fallback.
 */
export function collectBindingsFromTree(
  node: OmegaNode | undefined,
  manifest: OMEGA_Manifest | undefined,
  out: PanelBinding[] = [],
): PanelBinding[] {
  if (!node) return out;

  const kind = resolveBindingKind(node);
  if (kind) {
    const entityId = node.bind || node.id;
    if (entityId) {
      const entity = lookupEntity(manifest, entityId);
      out.push({
        nodeId: node.id,
        entityId,
        kind,
        name: readBindingLabel(node, entity),
        range: extractBindingRange(node, entity),
      });
    }
  }

  for (const child of node.children || []) {
    collectBindingsFromTree(child, manifest, out);
  }
  return out;
}

function resolveBindingKind(node: OmegaNode): PanelBindingKind | null {
  const compType = node.cellRef || node.kind || 'knob';
  if (STRUCTURAL_NODE_KINDS.has(compType)) return null;
  if (compType === 'jack' || compType === 'port') return 'jack';
  if (compType === 'slider' || compType === 'fader' || compType === 'slider-v' || compType === 'slider-h') return 'slider';
  if (compType === 'select' || compType === 'dropdown') return 'select';
  if (compType === 'display' || compType === 'readout' || compType === 'scope' || compType === 'terminal') return 'display';
  if (compType === 'stepper' || compType === 'button' || compType === 'push' || compType === 'switch') return 'stepper';
  return 'knob';
}

function lookupEntity(manifest: OMEGA_Manifest | undefined, id: string): ManifestEntity | undefined {
  return (manifest?.entities || []).find((e) => e.id === id || e.bind === id);
}

function readBindingLabel(node: OmegaNode, entity: ManifestEntity | undefined): string | undefined {
  const metaLabel = typeof node.meta?.label === 'string' ? node.meta.label : undefined;
  return metaLabel || entity?.label || entity?.name || undefined;
}

function extractBindingRange(node: OmegaNode, entity: ManifestEntity | undefined): PanelBindingRange | undefined {
  const raw = entity?.meta?.range ?? node.meta?.range;
  if (raw && typeof raw === 'object' && 'min' in raw && 'max' in raw) {
    const r = raw as Record<string, unknown>;
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    return {
      min: num(r.min) ?? 0,
      max: num(r.max) ?? 1,
      default: num(r.default),
      step: num(r.step),
    };
  }
  return undefined;
}
