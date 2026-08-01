/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona tipos para manejar y reportar operaciones de inyección de plantillas en el editor de manifesto OMEGA.
 * @purpose_en Manages types for handling and reporting template injection operations in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:5,imports:1,sig:1nfqfiv
 * @lastUpdated 2026-06-15T16:10:07.546Z
 */

import type { 
  OMEGA_Manifest, 
  OmegaNode, 
  CompatibilityStatus, 
  ValidationSeverity, 
  BlueprintPlaceholderValues, 
  BlueprintInsertionMode,
  IdCollisionStrategy,
  BlueprintAutoWirePolicy,
  BlueprintAutoWireDecision
} from './manifest';

/**
 * OMEGA Phase 9.4A - Blueprint Injector Operative Types
 * (§A.6 and §A.7 of the Formal Contract)
 */

export interface BlueprintInsertionStrategy {
  /** Dónde insertar en el árbol UCA. Si null → raíz. */
  targetParentNodeId: string | null;
  /** Slot del padre donde encajar */
  targetSlotId?: string | null | undefined;
  /** Posición dentro del slot */
  insertAtIndex?: number | undefined;
  /** Cómo resolver colisiones de IDs */
  idCollisionStrategy: IdCollisionStrategy;
  /** Si true, no modifica el manifiesto real (solo previsualización) */
  dryRun: boolean;
  /** Si true, fuerza remapeo de todos los IDs. RECOMENDADO: true. */
  forceIdRemap: boolean;
  /** Sobreescritura de la política de auto-wiring */
  autoWireOverride?: Partial<BlueprintAutoWirePolicy> | undefined;
}

export interface BlueprintInjectionRequest {
  blueprintId: string;
  placeholderValues: BlueprintPlaceholderValues;
  strategy: BlueprintInsertionStrategy;
  mode: BlueprintInsertionMode;
  manifestId: string;
  triggeredBy?: string | undefined;
}

export interface BlueprintValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  affectedPath?: string | undefined;
  affectedNodeId?: string | undefined;
  suggestion?: string | undefined;
}

export interface BlueprintInjectionReport {
  blueprintId: string;
  blueprintVersion: string;
  timestamp: string;
  mode: BlueprintInsertionMode;
  dryRun: boolean;
  compatibilityStatus: CompatibilityStatus;
  validationIssues: BlueprintValidationIssue[];
  idRemapLog: Record<string, string>;
  autoWireDecisions: BlueprintAutoWireDecision[];
  insertedNodeIds: string[];
  createdWireIds: string[];
  materializedSnapshot?: Record<string, unknown> | undefined;
  durationMs: number;
}

export interface BlueprintInjectionResult {
  success: boolean;
  mode: BlueprintInsertionMode;
  resultManifest?: OMEGA_Manifest | undefined;
  injectedSubtree?: OmegaNode | undefined;
  report: BlueprintInjectionReport;
  fatalError?: {
    code: string;
    message: string;
    cause?: unknown | undefined;
  } | undefined;
}
