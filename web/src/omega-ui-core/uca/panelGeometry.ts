/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-08-02 11:27:40
   ================================================================= */

/**
 * @purpose Deriva la geometría canónica de un panel OMEGA desde metadata de hardware (units/hp), erradicando las constantes y heurísticas hardcodeadas del host.
 * @purpose_en Derives canonical OMEGA panel geometry from hardware metadata (units/hp), eradicating the host's hardcoded constants and heuristics.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:2,sig:8um0k2
 * @lastUpdated 2026-08-02T00:00:00.000Z
 */

import type { OMEGA_Manifest, OmegaNode } from '../types/manifest.js';
import type { PanelGeometry, RackUnit, RenderPanelOptions, ResolvedRenderOptions } from '../types/panelRenderer.js';
import { getNodeSize } from './spatialConstraints.js';
import { resolveLayout } from './layoutResolver.js';

/* ─── Constantes canónicas de hardware (única fuente) ─── */

/** Altura de un tile de rack en px (1U = 48px de tiling Eurorack). */
export const RACK_UNIT_HEIGHT_PX = 48;

/** Ancho de un HP en px a escala de edición (1 HP = 5.08mm ≈ 15px). */
export const RACK_HP_WIDTH_PX = 15;

/** Altura mínima de cara para no romper el layout del chassis. */
export const MIN_CHASSIS_WIDTH_PX = 120;

/**
 * rackHeightForUnits — Altura real de una cara según sus unidades.
 * Única derivación: unidades declaradas → tiles → px. Sin literales 144/436.
 */
export function rackHeightForUnits(units: RackUnit | undefined): number {
  const u = String(units || '3U');
  if (u.startsWith('1U')) return RACK_UNIT_HEIGHT_PX * 3; // half-height face
  if (u.startsWith('2U')) return RACK_UNIT_HEIGHT_PX * 4;
  if (u.startsWith('3U')) return RACK_UNIT_HEIGHT_PX * 9; // full-height face
  if (u.startsWith('4U')) return RACK_UNIT_HEIGHT_PX * 12;
  if (u.startsWith('5U')) return RACK_UNIT_HEIGHT_PX * 15;
  if (u.startsWith('6U')) return RACK_UNIT_HEIGHT_PX * 18;
  if (u.startsWith('7U')) return RACK_UNIT_HEIGHT_PX * 21;
  if (u.startsWith('8U')) return RACK_UNIT_HEIGHT_PX * 24;
  return RACK_UNIT_HEIGHT_PX * 9;
}

/* ─── Derivación de geometría ─── */

/**
 * resolvePanelGeometry — Deriva PanelGeometry del manifiesto.
 * Única derivación permitida: `metadata.rack` + opción `forceUpper`. Sin heurística de nombre.
 */
export function resolvePanelGeometry(manifest: OMEGA_Manifest | undefined, options: RenderPanelOptions = {}): PanelGeometry {
  const rack = manifest?.metadata?.rack;
  const hp = Number(rack?.hp ?? 8);
  const units: RackUnit = rack?.units ?? '3U';
  const declaredUpper = units.startsWith('1U');
  const isUpper = options.forceUpper === true || declaredUpper;
  const widthPx = Math.max(hp * RACK_HP_WIDTH_PX, MIN_CHASSIS_WIDTH_PX);
  const heightPx = isUpper ? rackHeightForUnits('1U') : rackHeightForUnits(units);

  return {
    hp,
    units,
    widthPx,
    heightPx,
    slotType: isUpper ? '1U' : '3U',
    rackSlot: rack ? (isUpper ? 'upper' : 'lower') : undefined,
    isUpper,
  };
}

/**
 * resolvePanelContentSize — Tamaño efectivo del contenido renderizado de la cara
 * (bbox del `ui.tree` resuelto). Consume `resolveLayout`/`getNodeSize`: si el árbol
 * declara size explícito se respeta; si no, se mide el contenido apilado.
 */
export function resolvePanelContentSize(tree: OmegaNode | undefined): { width: number; height: number } {
  if (!tree) return { width: 0, height: 0 };
  const resolved = resolveLayout(tree);
  const size = getNodeSize(resolved);
  return { width: size.width, height: size.height };
}

/**
 * resolveRenderOptions — Deriva opciones de render del manifiesto con defaults
 * canónicos, en el mismo formato que esperan los renderers de omega-ui-core.
 */
export function resolveRenderOptions(manifest: OMEGA_Manifest | undefined, options: RenderPanelOptions = {}): ResolvedRenderOptions {
  return {
    skin: options.skin ?? manifest?.ui?.skin ?? 'industrial',
    zoom: options.zoom ?? manifest?.ui?.layout?.zoom ?? 1,
    runtimeValue: options.runtimeValue ?? 0.5,
    steps: options.steps ?? 100,
    activeTab: options.activeTab ?? resolveActiveTab(manifest),
    resolveAsset: options.resolveAsset,
    forceUpper: options.forceUpper,
  };
}

function resolveActiveTab(manifest: OMEGA_Manifest | undefined): string | undefined {
  const items = [
    ...((manifest?.ui?.controls as unknown[]) || []),
    ...((manifest?.ui?.jacks as unknown[]) || []),
  ] as Array<{ presentation?: { tab?: string } }>;
  const firstWithTab = items.find((i) => i.presentation?.tab);
  return firstWithTab?.presentation?.tab;
}
