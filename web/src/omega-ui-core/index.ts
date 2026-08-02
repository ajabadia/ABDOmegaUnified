/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-08-02 11:27:41
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
export { ColorResolver } from './utils/ColorResolver.js';

/* ─── Design Tokens ─── */
export { DESIGN_TOKENS } from './constants/design-tokens.js';
export type { DesignTokens } from './constants/design-tokens.js';

/* ─── Hooks ─── */
export { useDesignTokens } from './hooks/useDesignTokens.js';

/* ─── Panel Contract (render + interacción + geometría) ─── */
export { collectBindingsFromTree, PANEL_SELECTORS } from './types/panelRenderer.js';
export type {
  PanelGeometry,
  PanelBinding,
  PanelBindingKind,
  PanelBindingRange,
  RenderPanelOptions,
  ResolvedRenderOptions,
  RenderPanelResult,
  SetParamPayload,
  PanelTransport,
  PanelEvent,
  PanelEventType,
  RackUnit,
} from './types/panelRenderer.js';

export {
  RACK_UNIT_HEIGHT_PX,
  RACK_HP_WIDTH_PX,
  MIN_CHASSIS_WIDTH_PX,
  rackHeightForUnits,
  resolvePanelGeometry,
  resolvePanelContentSize,
  resolveRenderOptions,
} from './uca/panelGeometry.js';

export { InteractionManager, KNOB_SENSITIVITY_PX } from './interaction/InteractionManager.js';

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
} from './types/manifest.js';
