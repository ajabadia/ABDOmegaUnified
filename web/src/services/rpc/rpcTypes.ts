/**
 * @purpose Gestiona tipos para mensajes RPC y estructuras de datos utilizadas en el editor de manifesto OMEGA.
 * @purpose_en Manages types for messages RPC and data structures used in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:13,imports:1,sig:1alm51s
 * @lastUpdated 2026-06-15T17:03:19.882Z
 */

import type { OmegaNode, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

export type SyncStatus = 'disconnected' | 'syncing' | 'in-sync' | 'degraded' | 'error';

export interface ConflictDescriptor {
  path: string;
  source: 'UI' | 'ENGINE' | 'CANONICAL';
  previousValue: number | string | boolean;
  incomingValue: number | string | boolean;
  resolvedValue: number | string | boolean;
  resolutionPolicy: 'LAST_WRITE_WINS' | 'STRICT_BLOCKING' | 'MANUAL_RECOVERY';
  revisionToken: string;
}

export interface RPCBaseMessage {
  jsonrpc: '2.0';
  id?: string | number;
  sessionId: string; // Anti-crosstalk session identifier
  seq: number; // Sequence number for ordering
  timestamp: number;
}

export interface RPCRequest<T = unknown> extends RPCBaseMessage {
  method: string;
  params: T;
}

export interface RPCResponse<T = unknown> extends RPCBaseMessage {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Snapshot Payload
 * Complete state reconstruction.
 */
export interface SnapshotParams {
  manifestVersion: string;
  documentId: string;
  graph: OmegaNode; // Serialized UCA tree
  modulations: OMEGA_Modulation[];
}

/**
 * Delta Payload
 * Minimal, typed patches for real-time updates.
 */
export interface DeltaPatch {
  targetId: string; // Fully resolved UCA path (e.g. voice_1/osc_1/freq)
  value: unknown;
  type: 'parameter' | 'structural' | 'modulation';
}

export interface HealthStatus {
  status: SyncStatus;
  engineLatency: number;
  lastSeq: number;
  version: string;
}

export enum RPCErrors {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  OUT_OF_SEQUENCE = 1001,
  VERSION_MISMATCH = 1002
}

// ─── P11: Pipeline Integrity Types ───────────────────────────────────

/**
 * Result of materialization via instantiateBlueprint.
 */
export interface MaterializationResult {
  success: boolean;
  error?: string | undefined;
  /** Total nodes traversed in the tree */
  nodeCount: number;
  /** Nodes in the tree that have a `bind` attribute */
  bindingCount: number;
  /** Nodes whose `bind` does NOT exist in the provided contract */
  orphanBindings: Array<{ nodeId: string; bind: string }>;
  /** All bound nodes with resolution status against contract */
  boundNodes: Array<{ nodeId: string; bind: string; resolved: boolean }>;
  /** IDs of all materialized nodes */
  materializedNodeIds: string[];
}

/**
 * Result of a full reconciliation cycle.
 */
export interface ReconciliationResult {
  /** True if UI and engine states match exactly */
  inSync: boolean;
  /** Number of divergent paths */
  divergenceCount: number;
  /** Paths that differ between UI and engine */
  divergences: string[];
  /** Resolved conflict descriptors */
  conflicts: ConflictDescriptor[];
  /** Engine state snapshot */
  engineState: Record<string, number>;
}

/**
 * Summary of binding verification for reporting.
 */
export interface BindingVerification {
  totalNodes: number;
  totalBinds: number;
  resolvedBinds: number;
  orphanBinds: number;
  contractParamCount: number;
  contractPortCount: number;
  /** IDs of all nodes traversed in the tree (including nodes without binds) */
  nodeIds: string[];
  details: Array<{ nodeId: string; bind: string; status: 'resolved' | 'orphan' | 'unchecked' }>;
}

/**
 * Extended deployment result with integrity metrics.
 */
export interface DeploymentResult {
  success: boolean;
  hash: string;
  materialization?: MaterializationResult | undefined;
  verification?: BindingVerification | undefined;
}
