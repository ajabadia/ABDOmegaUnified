'use client';

/**
 * @purpose Renderiza una previsualización miniatura de un layout GroupNode con rectángulos coloreados representando diferentes tipos de componentes.
 * @purpose_en Renders a miniature SVG preview of a GroupNode layout with colored rectangles representing different types of components.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:p4m0cu
 * @lastUpdated 2026-06-15T11:05:49.548Z
 */

import type { V2BlueprintData } from '@/omega-ui-core/types';

/**
 * Color palette for component types in the thumbnail.
 * Each type gets a distinct color for visual differentiation.
 */
const TYPE_COLORS: Record<string, string> = {
  knob: '#00d4aa',
  slider: '#3b82f6',
  'slider-v': '#3b82f6',
  'slider-h': '#3b82f6',
  port: '#f59e0b',
  led: '#ef4444',
  switch: '#a855f7',
  button: '#ec4899',
  display: '#06b6d4',
  label: '#6b7280',
  illustration: '#8b5cf6',
  scope: '#10b981',
  terminal: '#f97316',
};

const DEFAULT_COLOR = '#4b5563';

interface BlueprintThumbnailProps {
  data: V2BlueprintData;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a miniature SVG preview of a GroupNode layout.
 * Each child is represented as a small colored rectangle positioned
 * according to its relative position within the group.
 */
export default function BlueprintThumbnail({
  data,
  width = 64,
  height = 40,
  className = '',
}: BlueprintThumbnailProps) {
  if (!data.children || data.children.length === 0) return null;

  // Calculate bounding box of all children
  const defaultChildSize = { width: 12, height: 12 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const child of data.children) {
    const cw = child.size?.width ?? defaultChildSize.width;
    const ch = child.size?.height ?? defaultChildSize.height;
    if (child.pos.x < minX) minX = child.pos.x;
    if (child.pos.y < minY) minY = child.pos.y;
    if (child.pos.x + cw > maxX) maxX = child.pos.x + cw;
    if (child.pos.y + ch > maxY) maxY = child.pos.y + ch;
  }

  const contentW = maxX - minX || 1;
  const contentH = maxY - minY || 1;

  // Add padding
  const padding = 4;
  const viewBox = `${minX - padding} ${minY - padding} ${contentW + padding * 2} ${contentH + padding * 2}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      className={`rounded-xs ${className}`}
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      {/* Render each child as a small colored shape */}
      {data.children.map((child) => {
        const cw = child.size?.width ?? defaultChildSize.width;
        const ch = child.size?.height ?? defaultChildSize.height;
        const color = TYPE_COLORS[child.type] ?? DEFAULT_COLOR;

        // Use different shapes based on type
        if (child.type === 'knob' || child.type === 'led') {
          // Circle for knobs and LEDs
          const r = Math.min(cw, ch) / 2;
          return (
            <circle
              key={child.id}
              cx={child.pos.x + cw / 2}
              cy={child.pos.y + ch / 2}
              r={r}
              fill={color}
              opacity={0.8}
            />
          );
        }

        if (child.type === 'port') {
          // Small circle with border for ports
          const r = Math.min(cw, ch) / 2;
          return (
            <circle
              key={child.id}
              cx={child.pos.x + cw / 2}
              cy={child.pos.y + ch / 2}
              r={r * 0.7}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={0.9}
            />
          );
        }

        // Rectangle for everything else (sliders, switches, buttons, displays, labels)
        return (
          <rect
            key={child.id}
            x={child.pos.x}
            y={child.pos.y}
            width={cw}
            height={ch}
            rx={1}
            fill={color}
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}
