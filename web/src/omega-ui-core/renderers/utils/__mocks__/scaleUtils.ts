/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Proporciona implementaciones simuladas para funciones de utilidad relacionadas con escalabilidad para facilitar pruebas.
 * @purpose_en Provides mock implementations for scale-related utility functions to facilitate testing.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1ay608r
 * @lastUpdated 2026-06-20T12:53:08.687Z
 */

/**
 * @jest-environment node
 *
 * Manual mock for @/omega-ui-core/renderers/utils/scaleUtils
 * Used by NumericResizePopover.spec.tsx to avoid @/ path alias resolution issues.
 */

export const computeScaleUpdates = jest.fn(
  (id: string, w: number, h: number) => ({
    [id]: { layout: { size: { width: w, height: h } } },
  })
);

export const getOriginalNodeSize = jest.fn(
  (node: { layout?: { size?: { width: number; height: number } } }) => ({
    width: node.layout?.size?.width ?? 48,
    height: node.layout?.size?.height ?? 48,
  })
);
