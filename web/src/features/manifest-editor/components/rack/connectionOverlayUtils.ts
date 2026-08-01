/**
 * @purpose Gestiona constantes, tipos y funciones auxiliares para la capa de conexión en el editor de manifesto OMEGA.
 * @purpose_en Manages constants, types, and helper functions for connection overlays in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:9,imports:0,sig:1urqpzo
 * @lastUpdated 2026-06-19T18:48:21.647Z
 */

// ── Types ───────────────────────────────────────────────────────────────
export interface ConnectionLink {
  id: string;
  sourceId: string;
  targetId: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  amount: number;
  type: string;
}

export interface PortHandle {
  id: string;
  label: string;
  x: number;
  y: number;
  isInput: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────
export const MOD_TYPE_COLORS: Record<string, string> = {
  unipolar: '#00f0ff',
  bipolar: '#ff8c00',
  additive: '#22c55e',
  multiplicative: '#a855f7',
  audio: '#3b82f6',
  cv: '#f59e0b',
};

export const MOD_TYPE_LABELS: Record<string, string> = {
  unipolar: 'UNI',
  bipolar: 'BI',
  additive: 'ADD',
  multiplicative: 'MULT',
  audio: 'AUDIO',
  cv: 'CV',
};

export const DEFAULT_MOD_COLOR = '#00f0ff';
export const SNAP_RADIUS = 20;

// ── Helpers ─────────────────────────────────────────────────────────────
export function getModColor(type: string): string {
  return MOD_TYPE_COLORS[type] || DEFAULT_MOD_COLOR;
}

export function getModLabel(type: string): string {
  return MOD_TYPE_LABELS[type] || type.toUpperCase();
}

/**
 * Build the SVG path `d` attribute for a bezier curve between two points,
 * matching the original horizontal-then-vertical style used in ConnectionOverlay.
 */
export function buildConnectionPath(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  const dx = tx - sx;
  const cp1x = sx + dx * 0.3;
  const cp2x = tx - dx * 0.3;
  return `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ty}, ${tx} ${ty}`;
}
