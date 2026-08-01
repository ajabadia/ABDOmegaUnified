/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona interfaces para metadatos y estructuras de datos de plantillas V2 Blueprints en el panel de biblioteca de Blueprint del editor OMEGA manifest y el flujo de pipeline de inserción de dock derecho.
 * @purpose_en Manages interfaces for metadata and data structures of V2 Blueprints in the OMEGA manifest editor's Blueprint Library panel and Right Dock insertion pipeline.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:p90s96
 * @lastUpdated 2026-06-15T16:10:15.734Z
 */

/**
 * V2 Blueprint Types — Simplified GroupNode format
 *
 * These types represent the simplified blueprint format used by the
 * Blueprint Library panel and the Right Dock insertion pipeline.
 * Previously duplicated between BlueprintLibraryPanel and RightDockContainer.
 */

export interface V2BlueprintMeta {
  id: string;
  label: string;
  family?: string;
  version: string;
  category: string;
  description?: string;
  path: string;
}

export interface V2BlueprintData {
  id: string;
  label: string;
  pos: { x: number; y: number };
  children: Array<{
    id: string;
    type: string;
    label: string;
    pos: { x: number; y: number };
    size?: { width: number; height: number };
    style?: Record<string, unknown>;
    bind?: { target: string };
  }>;
}
