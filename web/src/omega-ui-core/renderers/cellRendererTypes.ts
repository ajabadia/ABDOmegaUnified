/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
