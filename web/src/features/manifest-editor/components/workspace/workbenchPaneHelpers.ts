'use client';

/**
 * @purpose Helpers de construcción de window-states y props de panes para WorkbenchContainer (extraído en Fase 4).
 * @purpose_en WorkbenchContainer window-states and pane-props construction helpers (extracted in Fase 4).
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @lastUpdated 2026-07-31
 */

import type { WorkbenchState } from '@/features/manifest-editor/types/workbench';
import type { WorkbenchRenderPaneProps } from './WorkbenchRenderPane';

export interface WorkbenchWindowStates {
  window_layers: boolean;
  window_properties: boolean;
  window_rack_properties: boolean;
  window_blueprints: boolean;
  window_compliance: boolean;
  window_info: boolean;
  window_history: boolean;
  window_logs: boolean;
}

/** Construye el mapa window_* a partir del estado del workbench. */
export function createWindowStates(state: WorkbenchState): WorkbenchWindowStates {
  return {
    window_layers: state.window_layers,
    window_properties: state.window_properties,
    window_rack_properties: state.window_rack_properties,
    window_blueprints: state.window_blueprints,
    window_compliance: state.window_compliance,
    window_info: state.window_info,
    window_history: state.window_history,
    window_logs: state.window_logs,
  };
}

/** Props compartidas por los panes (WorkbenchRenderPane menos paneId). */
export type WorkbenchRenderPaneData = Omit<WorkbenchRenderPaneProps, 'paneId'>;

/** Construye las props compartidas de los panes a partir de los datos del contenedor. */
export function createRenderPaneProps(data: WorkbenchRenderPaneData): WorkbenchRenderPaneData {
  return { ...data };
}
