/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona tipos y interfaces para los renderizadores de células en el editor de manifesto OMEGA.
 * @purpose_en Defines types and interfaces for cell renderers in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:3,imports:2,sig:vax9db
 * @lastUpdated 2026-06-19T18:56:58.302Z
 */

import type { OMEGA_Manifest, OmegaStyleNode, OMEGA_Asset } from '../types/manifest';
import type { LayerRecipe } from '../types/assetBehavior';

export interface CellOptions {
  skin: string;
  zoom: number;
  runtimeValue: number;
  steps: number;
  isSelected?: boolean | undefined;
  isLiveMode?: boolean | undefined;
  isError?: boolean | undefined;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  activeTab?: string | undefined;
  forceFrame?: number | undefined;
  recipe?: LayerRecipe | undefined;
}

export interface RendererExtraOptions {
  assetUrl?: string | undefined;
  assetDef?: OMEGA_Asset | undefined;
  steps: number;
  runtimeValue: number;
  inherited: Record<string, unknown>;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  forceFrame?: number | undefined;
}

export interface MasterRendererProps {
  size: string;
  colorId: string;
  value: number;
  id: string;
  isSelected: boolean;
  isMain: boolean;
  style: Partial<OmegaStyleNode>;
}
