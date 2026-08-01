/**
 * @purpose Gestiona contratos de datos y interfaces para comparar manifestos estructurales en el editor de manifesto OMEGA.
 * @purpose_en Defines data contracts and interfaces for managing structural manifest comparisons in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:4,imports:0,sig:1ku1xv7
 * @lastUpdated 2026-06-15T15:16:27.928Z
 */

/**
 * OMEGA Diff System (Phase 9.2)
 * Data contracts for structural manifest comparison.
 */

export type DiffChangeType = 'added' | 'removed' | 'modified';
export type DiffEntityKind = 'control' | 'jack' | 'container' | 'uca-node';

export interface DiffEntry {
  /** The unique ID of the entity (canonical key) */
  entityId: string;
  
  /** The type of entity being compared */
  entityKind: DiffEntityKind;
  
  /** The nature of the change */
  changeType: DiffChangeType;
  
  /** 
   * Dot-notation path to the specific field (only for 'modified' types) 
   * Example: 'presentation.label', 'pos.x'
   */
  fieldPath?: string;
  
  /** The value before the change */
  before?: unknown;
  
  /** The value after the change */
  after?: unknown;
  
  /** Parent container context for UI grouping */
  parentContainerId?: string;
  
  /** Human readable description of the change */
  description?: string;
}

export interface ManifestDiffResult {
  entries: DiffEntry[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
  timestamp: number;
  baseHash: string;
  targetHash: string;
}
