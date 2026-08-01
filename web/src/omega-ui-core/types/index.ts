/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona tipos unificados para OMEGA UI Core, incluyendo formatos Blueprint V2, entidades y nodos del Manifest, componentes Rack, y problemas de validación, con alias para evitar conflictos.
 * @purpose_en Manages unified types for OMEGA UI Core, including formats Blueprint V2, entities and nodes of the Manifest, components Rack, and validation issues, with aliases to avoid conflict.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1t4kucx
 * @lastUpdated 2026-06-15T16:10:23.054Z
 */

/**
 * Unified type exports for OMEGA UI Core.
 *
 * Re-exports from:
 * - blueprints.ts  (V2 Blueprint formats)
 * - manifest.ts    (OMEGA Manifest, entities, nodes, styles)
 * - rack.ts        (Rack components, groups, guides)
 * - validation.ts  (Validation issues)
 *
 * Note: Both manifest.ts and rack.ts export `ComponentType`.
 * The rack-specific `ComponentType` is re-exported as `RackComponentType`
 * to avoid ambiguity.
 */

export * from './blueprints';
export * from './manifest';

// Rack exports — alias ComponentType to avoid collision with manifest's ComponentType
export type {
  ComponentType as RackComponentType,
  SliderOrientation,
  PortOrientation,
  PortPolarity,
  LedPolarity,
  SwitchStateCount,
  ComponentStyle,
  BindConfig,
  ComponentNode,
  GroupNode,
  GridGuide,
  RackManifest,
} from './rack';

export * from './validation';
