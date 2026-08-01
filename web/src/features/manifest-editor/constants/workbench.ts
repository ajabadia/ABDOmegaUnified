/**
 * @purpose Gestiona los tablas por defecto y las restricciones de diseño para el editor de manifestos OMEGA workbench.
 * @purpose_en Manages default tabs and layout constraints for the OMEGA manifest editor workbench.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:f9w1ke
 * @lastUpdated 2026-06-15T13:10:13.323Z
 */

import type { WorkbenchTab } from "../types/workbench";

export const DEFAULT_TABS: WorkbenchTab[] = [
  { id: "tab-orbital", type: "orbital", title: "Orbital", persistent: true, closable: false, payload: { documentId: 'primary' } },
  { id: "tab-rack", type: "rack", title: "Rack", persistent: true, closable: false, payload: { documentId: 'primary' } },
  { id: "tab-source", type: "source", title: "Source", persistent: true, closable: false, payload: { documentId: 'primary' } },
];

export const WORKBENCH_LAYOUT_CONSTRAINTS = {
  MIN_RATIO: 0.2,
  MAX_RATIO: 0.8,
  DEFAULT_RATIO: 0.62
};
