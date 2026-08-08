/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Builder único de CellOptions: deriva defaults canónicos desde el
 * manifiesto (via resolveRenderOptions) y completa los campos específicos de
 * celda. Es el ÚNICO punto donde editor y runtime construyen CellOptions,
 * eliminando la duplicación de contratos que cada call site replicaba a mano.
 * @purpose_en Single CellOptions builder: derives canonical defaults from the
 * manifest (via resolveRenderOptions) and fills cell-specific fields. It is the
 * ONLY place where editor and runtime build CellOptions, removing the contract
 * duplication each call site used to replicate by hand.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:5,sig:cellopts1
 * @lastUpdated 2026-08-04T00:00:00.000Z
 */

import type { OMEGA_Manifest } from '../types/manifest';
import type { LayerRecipe } from '../types/assetBehavior';
import type { CellOptions } from './cellRendererTypes';
import type { RenderPanelOptions } from '../types/panelRenderer';
import {
  DEFAULT_RUNTIME_VALUE,
  DEFAULT_SKIN,
  DEFAULT_STEPS,
  DEFAULT_ZOOM,
  resolveRenderOptions,
} from '../uca/panelGeometry';

/**
 * CellOptionsInput — Entrada del builder: opciones de panel canónicas
 * (RenderPanelOptions) + campos específicos de celda que no forman parte
 * de la geometría del panel.
 */
export interface CellOptionsInput extends RenderPanelOptions {
  /** Selección visual de la celda (editor). Default: false. */
  isSelected?: boolean | undefined;
  /** Modo live del runtime. Default: false (editor). */
  isLiveMode?: boolean | undefined;
  /** Marca de error de integridad. Default: ausente. */
  isError?: boolean | undefined;
  /** Frame forzado para behaviors animados (Cell Studio). */
  forceFrame?: number | undefined;
  /** Recipe de capas (Cell Studio). */
  recipe?: LayerRecipe | undefined;
}

/**
 * buildCellOptions — Construye una CellOptions completa con defaults canónicos.
 *
 * - skin/zoom/runtimeValue/steps/activeTab se derivan vía `resolveRenderOptions`
 *   (manifest.ui o literales canónicos).
 * - isSelected/isLiveMode/isError/forceFrame/recipe se resuelven aquí con
 *   defaults de edición.
 *
 * USO OBLIGATORIO: editor (CellPreview, useCellStudioPreview, IndustrialContainer,
 * VirtualRack, previsualizadores de estilo) y runtime (templates.renderItemHTML,
 * ManifestRenderer) deben construir las CellOptions EXCLUSIVAMENTE con este
 * builder para que el test de paridad detecte cualquier drift de defaults.
 */
export function buildCellOptions(
  manifest: OMEGA_Manifest | undefined,
  input: CellOptionsInput = {},
): CellOptions {
  const base = resolveRenderOptions(manifest, input);
  // ResolvedRenderOptions elimina el `| undefined` vía Defined<T> (panelRenderer.ts),
  // así que estos campos ya están resueltos; los `??` se conservan como defensa
  // en profundidad con los MISMOS defaults canónicos de resolveRenderOptions
  // (DEFAULT_* de panelGeometry.ts — fuente única, sin literales duplicados).
  return {
    skin: base.skin ?? DEFAULT_SKIN,
    zoom: base.zoom ?? DEFAULT_ZOOM,
    runtimeValue: base.runtimeValue ?? DEFAULT_RUNTIME_VALUE,
    steps: base.steps ?? DEFAULT_STEPS,
    activeTab: base.activeTab,
    resolveAsset: base.resolveAsset,
    manifest,
    isSelected: input.isSelected ?? false,
    isLiveMode: input.isLiveMode ?? false,
    isError: input.isError,
    forceFrame: input.forceFrame,
    recipe: input.recipe,
  };
}
