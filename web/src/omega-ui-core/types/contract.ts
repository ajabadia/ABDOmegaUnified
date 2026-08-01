/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Tipos canónicos para contratos OMEGA extraídos de módulos WASM
 * @purpose_en Canonical types for OMEGA contracts extracted from WASM modules
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:new
 * @lastUpdated 2026-06-22
 */

export interface OmegaContract {
  omega_version: string;
  id: string;
  name?: string;
  family?: string;
  parameters: Array<{
    id: string;
    name: string;
    min: number;
    max: number;
    default: number;
    unit?: string | undefined;
  }>;
  ports: Array<{
    id: string;
    type: 'audio' | 'cv' | 'midi' | 'gate';
    direction: 'input' | 'output';
  }>;
  firmwareHash?: string;
}
