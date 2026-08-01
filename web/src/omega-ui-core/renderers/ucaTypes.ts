/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Proporciona tipos para UCADebugContext y UniversalRendererProps utilizados en el editor de manifesto OMEGA renderers.
 * @purpose_en Defines types for UCADebugContext and UniversalRendererProps used in the OMEGA manifest editor renderers.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:p9zc1z
 * @lastUpdated 2026-06-15T16:09:34.265Z
 */

import type { OmegaNode, OMEGA_Manifest, CellTemplate, Position } from '../types/manifest';

export interface UCADebugContext {
  enabled: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  multiSelectedIds?: string[] | undefined;
  onSelectMultiple?: ((ids: string[]) => void) | undefined;
  onUpdateNode?: ((id: string, updates: Partial<OmegaNode>) => void) | undefined;
  /** Batch update multiple nodes atomically (Bug 1 fix — avoids race conditions in multi-drag) */
  onUpdateNodes?: ((updatesMap: Record<string, Partial<OmegaNode>>) => void) | undefined;
  showLabels: boolean;
  hideDecorative: boolean;
  showCADOverlay?: boolean | undefined;
  runtimeValues?: Record<string, number> | undefined;
  lockedNodeIds?: string[] | undefined;
  isLiveMode?: boolean | undefined;
  onUpdateRuntimeValue?: ((id: string, value: number) => void) | undefined;
  zoom?: number | undefined;
  pan?: { x: number; y: number } | undefined;
  activeDragOffset?: { x: number; y: number; draggedNodeId: string } | null | undefined;
  onUpdateDragOffset?: ((offset: { x: number; y: number; draggedNodeId: string } | null) => void) | undefined;
  activeResizeOffset?: { x: number; y: number; width: number; height: number; resizedNodeId: string } | null | undefined;
  onUpdateResizeOffset?: ((offset: { x: number; y: number; width: number; height: number; resizedNodeId: string } | null) => void) | undefined;
  activeRotationOffset?: { angle: number; rotatedNodeId: string } | null | undefined;
  onUpdateRotationOffset?: ((offset: { angle: number; rotatedNodeId: string } | null) => void) | undefined;
  /** Wraps resize operations in an undo/redo transaction */
  startTransaction?: ((label: string) => void) | undefined;
  commitTransaction?: (() => void) | undefined;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null | undefined;
}

export interface UniversalRendererProps {
  key?: string | number | undefined;
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  depth?: number | undefined;
  catalog?: Record<string, CellTemplate> | undefined; 
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  debugContext?: UCADebugContext | undefined;
  parentWorldPos?: Position | undefined;
  parentNode?: OmegaNode | null | undefined;
  audit?: import('@/services/auditService').AuditResult | undefined;
}
