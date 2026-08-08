/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
