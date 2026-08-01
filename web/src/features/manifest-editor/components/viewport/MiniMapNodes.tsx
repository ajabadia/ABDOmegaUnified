'use client';

/**
 * @purpose Renderiza rectángulos coloreados representando nodos en un mini-map para el editor de manifesto OMEGA.
 * @purpose_en Renders colored rectangles representing nodes in a mini-map for the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:1itoq4k
 * @lastUpdated 2026-06-19T18:48:58.024Z
 */

import { memo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

export interface FlattenedNode {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MiniMapNodesProps {
  nodes: FlattenedNode[];
  scale: number;
  selectedItemId?: string | null | undefined;
  lockedNodeIds: string[];
  onSelectItem: ((id: string | null) => void) | undefined;
  miniW: number;
  miniH: number;
  offsetX: number;
  offsetY: number;
}

// ── Colors ────────────────────────────────────────────────────────────

const NODE_KIND_COLORS: Record<string, { bg: string; border: string }> = {
  cell:        { bg: 'rgba(0, 242, 255, 0.30)', border: 'rgba(0, 242, 255, 0.18)' },
  group:       { bg: 'rgba(74, 222, 128, 0.30)', border: 'rgba(74, 222, 128, 0.18)' },
  container:   { bg: 'rgba(251, 191, 36, 0.30)', border: 'rgba(251, 191, 36, 0.18)' },
  port:        { bg: 'rgba(192, 132, 252, 0.30)', border: 'rgba(192, 132, 252, 0.18)' },
  rack:        { bg: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.04)' },
  face:        { bg: 'rgba(248, 113, 113, 0.25)', border: 'rgba(248, 113, 113, 0.15)' },
  layer:       { bg: 'rgba(251, 146, 60, 0.25)', border: 'rgba(251, 146, 60, 0.15)' },
  'asset-layer': { bg: 'rgba(251, 146, 60, 0.20)', border: 'rgba(251, 146, 60, 0.12)' },
  patch:       { bg: 'rgba(167, 243, 208, 0.25)', border: 'rgba(167, 243, 208, 0.15)' },
  root:        { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.03)' },
};

const SELECTED_COLOR = 'rgba(0, 242, 255, 0.55)';
const SELECTED_BORDER = 'rgba(0, 242, 255, 0.80)';

export function getNodeColor(kind: string) {
  return NODE_KIND_COLORS[kind] || { bg: 'rgba(156, 163, 175, 0.25)', border: 'rgba(156, 163, 175, 0.15)' };
}

// ── Component ─────────────────────────────────────────────────────────

function MiniMapNodesInner({
  nodes,
  scale,
  selectedItemId,
  lockedNodeIds,
  onSelectItem,
  miniW,
  miniH,
  offsetX,
  offsetY,
}: MiniMapNodesProps) {
  return (
    <div
      data-testid="mini-map-rack"
      className="absolute rounded-[1px]"
      style={{
        top: 8 + offsetY,
        left: 8 + offsetX,
        width: miniW,
        height: miniH,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {nodes.map((node) => {
        const isSelected = selectedItemId === node.id;
        const isLocked = lockedNodeIds.includes(node.id);
        const colors = getNodeColor(node.kind);
        const safeScale = Number.isNaN(scale) || !scale ? 1 : scale;
        const nodeX = Number.isNaN(node.x) ? 0 : node.x;
        const nodeY = Number.isNaN(node.y) ? 0 : node.y;
        const nodeW = Number.isNaN(node.w) ? 10 : node.w;
        const nodeH = Number.isNaN(node.h) ? 10 : node.h;
        const computedWidth = Math.max(nodeW * safeScale, 2);
        const computedHeight = Math.max(nodeH * safeScale, 2);

        return (
          <div
            key={node.id}
            className={`absolute rounded-[1px] transition-all duration-150 ${
              isSelected ? 'z-[5]' : ''
            }`}
            title={`${isLocked ? '🔒 ' : ''}${node.label} (${node.kind})`}
            style={{
              top: nodeY * safeScale,
              left: nodeX * safeScale,
              width: Number.isNaN(computedWidth) ? 2 : computedWidth,
              height: Number.isNaN(computedHeight) ? 2 : computedHeight,
              background: isSelected ? SELECTED_COLOR : colors.bg,
              border: `1px solid ${isSelected ? SELECTED_BORDER : colors.border}`,
              boxShadow: isSelected
                ? '0 0 4px rgba(0, 242, 255, 0.4)'
                : 'none',
              opacity: isLocked ? 0.45 : 1,
              cursor: onSelectItem ? 'pointer' : 'default',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(node.id);
            }}
          >
            {isLocked && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ fontSize: Math.max(node.h * scale * 0.35, 4) }}
              >
                🔒
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const MiniMapNodes = memo(MiniMapNodesInner);
export default MiniMapNodes;
