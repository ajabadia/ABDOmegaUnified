/**
 * @purpose Gestiona y actualiza las configuraciones del grid en el editor de manifesto OMEGA mientras se preservan los valores de diseño existentes con valores de seguridad por defecto.
 * @purpose_en Manages and updates grid configurations in the OMEGA manifest editor while preserving existing layout values with safe defaults.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:qbhwww
 * @lastUpdated 2026-06-15T15:17:17.877Z
 */

import type { OMEGA_Manifest, GridConfig, GridGuide } from '@/omega-ui-core/types/manifest';

/**
 * Build a Partial<OMEGA_Manifest> that updates the grid config
 * while preserving all existing layout values with safe defaults.
 */
export function buildGridManifestUpdate(
  manifest: OMEGA_Manifest,
  gridPatch: Partial<GridConfig>,
): Partial<OMEGA_Manifest> {
  const ui = manifest.ui;
  const layout = ui?.layout;
  const grid = layout?.grid;

  return {
    ui: {
      ...ui,
      layout: {
        ...layout,
        width: layout?.width ?? 800,
        height: layout?.height ?? 600,
        containers: layout?.containers || [],
        grid: {
          ...grid,
          enabled: grid?.enabled ?? false,
          visible: grid?.visible ?? false,
          showGuides: grid?.showGuides ?? false,
          spacingX: grid?.spacingX ?? 24,
          spacingY: grid?.spacingY ?? 24,
          snapMode: grid?.snapMode ?? 'center',
          guides: grid?.guides,
          ...gridPatch,
        },
      },
    },
  };
}

/** Toggle a boolean grid field and return the manifest patch. */
export function toggleGridField<K extends 'visible' | 'showGuides' | 'enabled'>(
  manifest: OMEGA_Manifest,
  field: K,
): Partial<OMEGA_Manifest> {
  const current = manifest.ui?.layout?.grid?.[field] ?? false;
  return buildGridManifestUpdate(manifest, { [field]: !current } as Partial<GridConfig>);
}

/** Replace the guides array and return the manifest patch. */
export function updateGuides(
  manifest: OMEGA_Manifest,
  guides: GridGuide[],
): Partial<OMEGA_Manifest> {
  return buildGridManifestUpdate(manifest, { guides });
}
