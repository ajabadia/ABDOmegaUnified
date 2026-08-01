/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona tipos para comportamientos de activos y recetas de capas en el editor de manifesto OMEGA.
 * @purpose_en Defines types for asset behaviors and layer recipes in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:6,imports:0,sig:r3z8kh
 * @lastUpdated 2026-06-15T16:10:02.744Z
 */

/**
 * OMEGA Asset Behavior Model - Phase 12
 * Formalizes how visual assets respond to input, state, and telemetry.
 */

export type AssetBehaviorPreset =
  | 'static'
  | 'rotary'
  | 'slider'
  | 'switch'
  | 'button'
  | 'meter'
  | 'led'
  | 'display'
  | 'plate';

export type BehaviorMappingMode = 
  | 'continuous' 
  | 'stepped' 
  | 'state-map' 
  | 'bipolar' 
  | 'unipolar';

export interface BehaviorMapping {
  input: 'value' | 'state' | 'active' | 'signal' | 'telemetry' | 'manual';
  mode: BehaviorMappingMode;
  zeroAnchor?: number;
  polarity?: 'normal' | 'inverted';
  mouseResponse?: 'rotary' | 'linear' | 'button';
  stateMap?: Array<{ state: string; frameStart: number; frameEnd?: number }>;
  frameRange?: { start: number; end: number };
}

export interface AssetBehavior {
  preset: AssetBehaviorPreset;
  source: 'asset' | 'generated';
  assetId?: string;
  assetType?: 'static' | 'filmstrip' | 'svg';
  frameCount?: number;
  orientation?: 'v' | 'h';
  mapping?: BehaviorMapping;
  transform?: {
    fit?: 'stretch' | 'cover' | 'contain' | 'tile' | 'center';
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    rotationMode?: 'none' | 'rendered' | 'css';
  };
}

/**
 * Layer Recipe - Multi-asset composition model
 */
export interface LayerRecipeItem {
  id: string;
  name: string;
  role: 'base' | 'overlay' | 'indicator' | 'glare' | 'mask' | 'decor';
  assetId: string;
  assetType: 'static' | 'filmstrip' | 'svg';
  behavior?: AssetBehavior;
  opacity?: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
  visible?: boolean;
  locked?: boolean;
  zIndex: number;
  offsetX?: number;
  offsetY?: number;
}

export interface LayerRecipe {
  id: string;
  name: string;
  layers: LayerRecipeItem[];
  metadata?: Record<string, unknown>;
}
