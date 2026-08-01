/**
 * @purpose Gestiona el porcentaje visible de un bastidor en coordenadas del rack basado en zoom, panning y dimensiones del contenedor.
 * @purpose_en Calculates the visible portion of a rack in rack coordinates based on zoom, pan, and container dimensions.
 * @refactorable false (contains only static declarations/types/constants and a simple custom hook)
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:4,imports:1,sig:390kaw
 * @lastUpdated 2026-06-20T11:07:52.899Z
 */

import { useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

export interface ViewportRectInput {
  zoom: number;
  pan: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  rackWidth: number;
  rackHeight: number;
}

export interface ViewportRectResult {
  /** Left edge of visible area in rack coordinates */
  left: number;
  /** Top edge of visible area in rack coordinates */
  top: number;
  /** Right edge of visible area in rack coordinates */
  right: number;
  /** Bottom edge of visible area in rack coordinates */
  bottom: number;
  /** Width of visible area in rack coordinates */
  width: number;
  /** Height of visible area in rack coordinates */
  height: number;
  /** Whether the entire rack is visible */
  isFullRack: boolean;
}

// ── Pure function ─────────────────────────────────────────────────────

/**
 * Given the current zoom, pan, container dimensions, and rack dimensions,
 * compute the visible portion of the rack in rack coordinates.
 *
 * The rack transform is: translate(pan.x, pan.y) scale(zoom) with
 * transform-origin: center center on the rack frame element.
 *
 * Pure function — no React dependency. Easy to unit test.
 */
export function computeViewportRect(input: ViewportRectInput): ViewportRectResult {
  const { zoom, pan, containerWidth, containerHeight, rackWidth, rackHeight } = input;

  if (containerWidth <= 0 || containerHeight <= 0 || zoom <= 0) {
    return {
      left: 0,
      top: 0,
      right: rackWidth,
      bottom: rackHeight,
      width: rackWidth,
      height: rackHeight,
      isFullRack: true,
    };
  }

  // Given transform: translate(pan.x, pan.y) scale(zoom) with origin at center of rack frame.
  // screenX = containerW/2 + (rackX - rackW/2 + pan.x) * zoom
  //
  // For screenX = 0:  rackX = rackW/2 - pan.x - containerW / (2 * zoom)
  // For screenX = containerW: rackX = rackW/2 - pan.x + containerW / (2 * zoom)
  const halfCW = containerWidth / (2 * zoom);
  const halfCH = containerHeight / (2 * zoom);
  const centerX = rackWidth / 2;
  const centerY = rackHeight / 2;

  const rawLeft = centerX - pan.x - halfCW;
  const rawTop = centerY - pan.y - halfCH;
  const rawRight = centerX - pan.x + halfCW;
  const rawBottom = centerY - pan.y + halfCH;

  // Clamp to rack bounds
  const left = Math.max(0, rawLeft);
  const top = Math.max(0, rawTop);
  const right = Math.min(rackWidth, rawRight);
  const bottom = Math.min(rackHeight, rawBottom);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    isFullRack: left <= 0 && top <= 0 && right >= rackWidth && bottom >= rackHeight,
  };
}

// ── React hook ────────────────────────────────────────────────────────

/**
 * React hook wrapping `computeViewportRect` in a `useMemo`.
 * Recomputes only when any input changes.
 */
export function useViewportRect(input: ViewportRectInput): ViewportRectResult {
  return useMemo(() => computeViewportRect(input), [input]);
}
