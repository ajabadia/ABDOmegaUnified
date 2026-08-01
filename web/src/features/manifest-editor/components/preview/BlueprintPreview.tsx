'use client';

/**
 * @purpose Renderiza una vista de mini-bastidor con previsualización de la plantilla de un plan antes de su inyección.
 * @purpose_en Renders a mini-rack SVG previewing the layout of an architecture blueprint before injection.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1yxbk44
 * @lastUpdated 2026-06-15T12:59:19.409Z
 */

import { useMemo } from 'react';
import type { OmegaBlueprintNode } from '@/omega-ui-core/types/manifest';

interface BlueprintPreviewProps {
  children: OmegaBlueprintNode[] | undefined;
  /** Optional explicit width/height for the SVG viewBox */
  width?: number;
  height?: number;
}

/** Map component type to a short label for rendering */
function getShortLabel(kind: string, cellRef?: string): string {
  const ref = cellRef || kind;
  const map: Record<string, string> = {
    knob: 'KN',
    'slider-v': 'SL',
    'slider-h': 'SL',
    slider: 'SL',
    switch: 'SW',
    button: 'BT',
    port: 'PT',
    led: 'LD',
    display: 'DP',
    label: 'LB',
    container: 'CT',
    group: 'GR',
  };
  return map[ref] || ref.slice(0, 2).toUpperCase();
}

/** Compute bounding box from child positions + sizes, return expanded rect */
function computeBounds(
  nodes: OmegaBlueprintNode[],
  fallbackW = 400,
  fallbackH = 300,
) {
  if (!nodes || nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: fallbackW, maxY: fallbackH, w: fallbackW, h: fallbackH };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const px = n.layout?.pos?.x ?? 0;
    const py = n.layout?.pos?.y ?? 0;
    const pw = n.layout?.size?.width ?? 48;
    const ph = n.layout?.size?.height ?? 48;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px + pw > maxX) maxX = px + pw;
    if (py + ph > maxY) maxY = py + ph;
  }
  // Add padding
  const pad = 16;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX += pad;
  maxY += pad;
  const w = Math.max(maxX - minX, fallbackW);
  const h = Math.max(maxY - minY, fallbackH);
  return { minX, minY, maxX, maxY, w, h };
}

/**
 * BlueprintPreview — Renders an SVG mini-rack showing the blueprint's
 * component layout before injection.
 *
 * Each child node is drawn as a simple shape:
 * - knob/port/led → circle
 * - slider → rectangle with knob track
 * - switch/button → rounded rect
 * - display → dark rect with text lines
 * - label → text only
 * - container/group → outline rect with label
 */
export default function BlueprintPreview({
  children,
  width = 300,
  height: explicitHeight,
}: BlueprintPreviewProps) {
  const { viewBox, scaledNodes, h } = useMemo(() => {
    if (!children || children.length === 0) {
      return { viewBox: `0 0 ${width} 200`, scaledNodes: [], h: 200 };
    }

    const bounds = computeBounds(children);
    const bw = bounds.w || width;
    const bh = bounds.h || 200;

    // Scale to fit width, maintaining aspect ratio
    const scale = Math.min(width / bw, explicitHeight ? explicitHeight / bh : 1, 1.5);
    const sw = bw * scale;
    const sh = bh * scale;
    const padX = (width - sw) / 2;
    const finalH = explicitHeight || Math.max(sh + 40, 160);

    const scaled = children.map((n) => {
      const px = n.layout?.pos?.x ?? 0;
      const py = n.layout?.pos?.y ?? 0;
      const pw = n.layout?.size?.width ?? 48;
      const ph = n.layout?.size?.height ?? 48;
      return {
        node: n,
        x: (px - bounds.minX) * scale + padX,
        y: (py - bounds.minY) * scale + 20,
        w: pw * scale,
        h: ph * scale,
      };
    });

    return { viewBox: `0 0 ${width} ${finalH}`, scaledNodes: scaled, h: finalH };
  }, [children, width, explicitHeight]);

  if (!children || children.length === 0) {
    return (
      <div className="flex items-center justify-center h-full wb-text-muted opacity-40 text-[8px] uppercase tracking-widest">
        No components
      </div>
    );
  }

  const renderChild = (
    node: OmegaBlueprintNode,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    const kind = node.kind || 'cell';
    const ref = node.cellRef || kind;
    const label = node.bind || node.id.slice(0, 8);
    const color = node.style?.color || '#00f2ff';
    const isDim = node.style?.opacity !== undefined && node.style.opacity < 0.5;

    // Common group styling
    const commonProps = {
      opacity: isDim ? 0.4 : 0.8,
      transition: 'all 0.15s ease',
    };

    switch (ref) {
      case 'knob': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = Math.min(w, h) * 0.35;
        return (
          <g key={node.id} {...commonProps}>
            {/* Knob body */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
            {/* Knob indicator */}
            <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.7} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            {/* Label */}
            <text x={cx} y={cy + r + 8} textAnchor="middle" fill={color} fontSize={5} fontFamily="monospace" opacity={0.5}>
              {label}
            </text>
          </g>
        );
      }
      case 'slider':
      case 'slider-v': {
        const cx = x + w / 2;
        const trackH = h * 0.6;
        const trackY = y + h * 0.2;
        const thumbY = trackY + trackH * 0.4;
        return (
          <g key={node.id} {...commonProps}>
            {/* Track */}
            <rect x={cx - 1.5} y={trackY} width={3} height={trackH} rx={1.5} fill={color} opacity={0.3} />
            {/* Thumb */}
            <rect x={cx - 4} y={thumbY - 3} width={8} height={6} rx={2} fill={color} opacity={0.7} />
            <text x={cx} y={y + h} textAnchor="middle" fill={color} fontSize={5} fontFamily="monospace" opacity={0.5}>
              {label}
            </text>
          </g>
        );
      }
      case 'slider-h': {
        const cy = y + h / 2;
        const trackW = w * 0.6;
        const trackX = x + w * 0.2;
        const thumbX = trackX + trackW * 0.4;
        return (
          <g key={node.id} {...commonProps}>
            <rect x={trackX} y={cy - 1.5} width={trackW} height={3} rx={1.5} fill={color} opacity={0.3} />
            <rect x={thumbX - 3} y={cy - 4} width={6} height={8} rx={2} fill={color} opacity={0.7} />
            <text x={x + w / 2} y={cy + 10} textAnchor="middle" fill={color} fontSize={5} fontFamily="monospace" opacity={0.5}>
              {label}
            </text>
          </g>
        );
      }
      case 'port': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = Math.min(w, h) * 0.25;
        return (
          <g key={node.id} {...commonProps}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.25} stroke={color} strokeWidth={1} />
            <circle cx={cx} cy={cy} r={r * 0.4} fill={color} opacity={0.6} />
          </g>
        );
      }
      case 'led': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = Math.min(w, h) * 0.25;
        return (
          <g key={node.id} {...commonProps}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.4} stroke={color} strokeWidth={0.5} />
            <circle cx={cx - r * 0.15} cy={cy - r * 0.15} r={r * 0.3} fill="white" opacity={0.15} />
          </g>
        );
      }
      case 'display': {
        const pad = 3;
        return (
          <g key={node.id} {...commonProps}>
            <rect x={x + pad} y={y + pad} width={w - pad * 2} height={h - pad * 2} rx={2} fill="#0a0a0a" stroke={color} strokeWidth={0.5} opacity={0.6} />
            <text x={x + w / 2} y={y + h / 2 + 2} textAnchor="middle" fill={color} fontSize={6} fontFamily="monospace" opacity={0.7}>
              {label}
            </text>
          </g>
        );
      }
      case 'button': {
        return (
          <g key={node.id} {...commonProps}>
            <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={3} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
            <text x={x + w / 2} y={y + h / 2 + 2} textAnchor="middle" fill={color} fontSize={5} fontFamily="monospace" opacity={0.7}>
              {getShortLabel(kind, node.cellRef)}
            </text>
          </g>
        );
      }
      case 'switch': {
        const cx = x + w / 2;
        const swY = y + h * 0.25;
        const swH = h * 0.35;
        return (
          <g key={node.id} {...commonProps}>
            <rect x={cx - 4} y={swY} width={8} height={swH} rx={2} fill={color} opacity={0.5} />
            <rect x={cx - 3} y={swY + swH * 0.6} width={6} height={swH * 0.35} rx={1} fill={color} opacity={0.8} />
          </g>
        );
      }
      case 'container':
      case 'group': {
        return (
          <g key={node.id} {...commonProps}>
            <rect x={x} y={y} width={w} height={h} rx={4} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />
            <text x={x + 4} y={y + 8} fill={color} fontSize={5} fontFamily="monospace" opacity={0.6}>
              {node.cellRef === 'group' ? 'GR' : 'CT'}
            </text>
          </g>
        );
      }
      default:
        // Generic cell fallback
        return (
          <g key={node.id} {...commonProps}>
            <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={2} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
            <text x={x + w / 2} y={y + h / 2 + 2} textAnchor="middle" fill={color} fontSize={5} fontFamily="monospace" opacity={0.5}>
              {getShortLabel(kind, node.cellRef)}
            </text>
          </g>
        );
    }
  };

  return (
    <div className="w-full h-full wb-surface-subtle rounded-xs border wb-outline bg-black/20 overflow-hidden">
      <div className="text-[6px] font-black uppercase tracking-widest wb-text-muted px-3 py-1.5 border-b wb-outline opacity-40 flex items-center justify-between">
        <span>Preview ({children.length} cells)</span>
        <span className="font-mono text-[5px]">{h}px</span>
      </div>
      <svg
        viewBox={viewBox}
        className="w-full"
        style={{ height: Math.max(h, 160) }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Subtle background grid */}
        <defs>
          <pattern id="bp-grid" width={20} height={20} patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth={0.5} opacity={0.04} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-grid)" />

        {/* Node count badge */}
        <text x={width - 8} y={14} textAnchor="end" fill="currentColor" fontSize={5} fontFamily="monospace" opacity={0.2}>
          {children.length} nodes
        </text>

        {/* Render each child */}
        {scaledNodes.map(({ node, x, y, w, h }) => renderChild(node, x, y, w, h))}
      </svg>
    </div>
  );
}
