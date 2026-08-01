/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona tipos para componentes y configuraciones de bastidores en el editor de manifesto OMEGA.
 * @purpose_en Defines types for components and configurations of racks in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:12,imports:1,sig:j00s29
 * @lastUpdated 2026-06-15T16:10:34.612Z
 */

import type { Position, Dimensions, GridConfig } from './manifest';

export type ComponentType =
  | 'knob'
  | 'slider'
  | 'switch'
  | 'button'
  | 'port'
  | 'led'
  | 'display'
  | 'label'
  | 'select'
  | 'illustration'
  | 'scope'
  | 'terminal';

export type SliderOrientation = 'vertical' | 'horizontal';
export type PortOrientation = 'top' | 'bottom' | 'left' | 'right';
export type PortPolarity = 'unipolar' | 'bipolar';
export type LedPolarity = 'normal' | 'inverted';
export type SwitchStateCount = 2 | 3;

export interface ComponentStyle {
  variant?: string | undefined;
  color?: string | undefined;
  indicatorColor?: string | undefined;
  glowColor?: string | undefined;
  asset?: string | undefined;
  frames?: number | undefined;
  orientation?: 'v' | 'h' | SliderOrientation | PortOrientation | undefined;
  font?: string | undefined;
  fontSize?: number | undefined;
  fontColor?: string | undefined;
  opacity?: number | undefined;
  label?: string | undefined;
  polarity?: PortPolarity | LedPolarity | undefined;
  states?: SwitchStateCount | undefined;
}

export interface BindConfig {
  target: string;
  min?: number | undefined;
  max?: number | undefined;
  default?: number | undefined;
  polarity?: PortPolarity | undefined;
}

export interface ComponentNode {
  id: string;
  type: ComponentType;
  label: string;
  pos: Position;
  size: Dimensions;
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  locked?: boolean | undefined;
  visible?: boolean | undefined;
}

export interface GroupNode {
  id: string;
  label: string;
  pos: Position;
  children: ComponentNode[];
  locked?: boolean | undefined;
  visible?: boolean | undefined;
}

export interface GridGuide {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface RackManifest {
  id: string;
  name: string;
  author?: string | undefined;
  version: string;
  width: number;
  height: number;
  grid: GridConfig;
  skin?: string | undefined;
  children: Array<ComponentNode | GroupNode>;
  metadata?: Record<string, unknown> | undefined;
}
