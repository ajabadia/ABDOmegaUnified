/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Proporciona herramientas de resolución de color, tokens de diseño y tipos fundamentales para OMEGA UI CORE.
 * @purpose_en Exports color resolution utilities, design tokens, and core types for OMEGA UI CORE.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1qnjlny
 * @lastUpdated 2026-06-15T15:18:10.042Z
 */

/**
 * OMEGA UI CORE — Public API
 * Barrel exports for color system, design tokens, and core utilities.
 */

/* ─── Color Resolution ─── */
export { ColorResolver } from './utils/ColorResolver';

/* ─── Design Tokens ─── */
export { DESIGN_TOKENS } from './constants/design-tokens';
export type { DesignTokens } from './constants/design-tokens';

/* ─── Hooks ─── */
export { useDesignTokens } from './hooks/useDesignTokens';

/* ─── Panel Contract (render + interacción + geometría) ─── */
export { collectBindingsFromTree, PANEL_SELECTORS } from './types/panelRenderer';
export type {
  PanelGeometry,
  PanelBinding,
  PanelBindingKind,
  PanelBindingRange,
  RenderPanelOptions,
  ResolvedRenderOptions,
  PanelRenderResult,
  SetParamPayload,
  PanelTransport,
  PanelEvent,
  PanelEventType,
  RackUnit,
} from './types/panelRenderer';

export {
  RACK_UNIT_HEIGHT_PX,
  RACK_HP_WIDTH_PX,
  MIN_CHASSIS_WIDTH_PX,
  DEFAULT_SKIN,
  DEFAULT_ZOOM,
  DEFAULT_RUNTIME_VALUE,
  DEFAULT_STEPS,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_RACK_HP,
  rackHeightForUnits,
  resolvePanelGeometry,
  resolvePanelContentSize,
  resolveRenderOptions,
} from './uca/panelGeometry';

export { buildCellOptions } from './renderers/cellOptions';
export type { CellOptionsInput } from './renderers/cellOptions';

export { InteractionManager, KNOB_SENSITIVITY_PX } from './interaction/InteractionManager';

export { flatToTree } from './uca/converters/flatToTree';
export type { RuntimeFlatItem, RuntimeFlatContainer, RuntimeFlatManifest } from './uca/converters/flatToTree';

/* ─── Types (re-export most used) ─── */
export type {
  OMEGA_Manifest,
  ManifestEntity,
  OmegaNode,
  OmegaStyleNode,
  LayoutContainer,
  OMEGA_Contract,
  BlueprintDefinition,
  OMEGA_Modulation,
  ExtraResource,
  Presentation,
  Attachment,
  HardwareGovernance,
  FaceplateGovernance,
  LightingGovernance,
  CellTemplate,
  ModuleTemplate,
  ManifestMetadata,
  OMEGA_Asset,
  LibraryAsset,
  ComponentType,
  AttachmentType,
  NodeKind,
  NodeRole,
  HybridEntityUpdate,
  UcaDebugConfig,
  GridConfig,
} from './types/manifest';
