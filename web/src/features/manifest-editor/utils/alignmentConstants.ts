'use client';

/**
 * @purpose Gestiona constantes y tipos para alineación en ViewportToolbar y utiliza el hook useAlignment en el editor de manifesto OMEGA.
 * @purpose_en Manages constants and types for alignment in ViewportToolbar and utilizes the hook useAlignment in the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:15,imports:1,sig:kzdlsb
 * @lastUpdated 2026-06-15T15:16:47.930Z
 */

import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * Shared alignment constants and types for ViewportToolbar and useAlignment hook.
 * Consolidated from ViewportToolbar.tsx to eliminate duplication and centralize
 * shortcut definitions.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type DistType = 'dist-h' | 'dist-v' | 'dist-both';
export type AlignTarget = 'selection' | 'canvas';

export interface GhostItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Function form for manifest updates.
 * Matches the signature used by `history.updateManifestWithHistory` in
 * useHistoryActions.ts (which is what WorkbenchContainer wires in).
 */
export type UpdateManifestFn = (
  updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>),
  label?: string,
) => void;

// ── Keyboard shortcut map ──────────────────────────────────────────────
// Maps a lowercase letter (pressed with Ctrl+Shift) to an align/distribute type.
export const SHORTCUT_TO_ALIGN: Record<string, AlignType | DistType> = {
  'l': 'left',
  'h': 'center-h',
  'r': 'right',
  't': 'top',
  'm': 'center-v',
  'b': 'bottom',
  'd': 'dist-h',
  'v': 'dist-v',
  'e': 'dist-both',
};

// Human-readable shortcut labels for tooltips.
export const SHORTCUT_LABELS: Record<string, string> = {
  'l': 'Ctrl+Shift+L',
  'h': 'Ctrl+Shift+H',
  'r': 'Ctrl+Shift+R',
  't': 'Ctrl+Shift+T',
  'm': 'Ctrl+Shift+M',
  'b': 'Ctrl+Shift+B',
  'd': 'Ctrl+Shift+D',
  'v': 'Ctrl+Shift+V',
  'e': 'Ctrl+Alt+E',
};

// Maps align/distribute type keys to human-readable labels for the ghost overlay badge.
export const GHOST_TYPE_MAP: Record<string, string> = {
  'left': 'Align left',
  'center-h': 'Align center H',
  'right': 'Align right',
  'top': 'Align top',
  'center-v': 'Align center V',
  'bottom': 'Align bottom',
  'dist-h': 'Distribute H',
  'dist-v': 'Distribute V',
  'dist-both': 'Distribute evenly',
};

// ── Rack root detection ────────────────────────────────────────────────
// Production uses RACK_MASTER (see VirtualRack.tsx). Tests and synthetic
// fixtures often use root or MAIN_RACK. We accept all three.
export const RACK_ROOT_IDS = new Set(['RACK_MASTER', 'root', 'MAIN_RACK', 'MAIN_RACK_ROOT']);

export function isRackRootNode(node: OmegaNode | undefined): boolean {
  if (!node) return false;
  if (node.kind !== 'rack') return false;
  return RACK_ROOT_IDS.has(node.id);
}

// ── Eurorack constants ─────────────────────────────────────────────────
export const EURORACK_MM_PER_HP = 5.08;
export const EURORACK_3U_MM = 128.5;
export const DEFAULT_PX_PER_HP = 24;

// ── Eurorack presets ───────────────────────────────────────────────────
export const EURORACK_PRESETS: { label: string; hp: number }[] = [
  { label: '1HP', hp: 1 },
  { label: '2HP', hp: 2 },
  { label: '4HP', hp: 4 },
  { label: '8HP', hp: 8 },
  { label: '12HP', hp: 12 },
  { label: '16HP', hp: 16 },
  { label: '20HP', hp: 20 },
  { label: '42HP', hp: 42 },
];

export function mmFromHP(hp: number): string {
  return (hp * EURORACK_MM_PER_HP).toFixed(1);
}
