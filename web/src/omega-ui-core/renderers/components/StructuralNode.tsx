/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Gestiona un nodo estructural en el editor de manifesto OMEGA, maneja arrastre y soltar, muestra información de depuración y renderiza nodos hijos.
 * @purpose_en Renders a structural node in the OMEGA manifest editor, handling drag and drop, displaying debug information, and rendering child nodes.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:12,sig:10bzuhu
 * @lastUpdated 2026-06-20T11:09:14.333Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, CellTemplate } from '../../types/manifest';
import { useUCADrag } from '../hooks/useUCADrag';
import { UCADebugHUD } from './UCADebugHUD';
import { CADOverlay } from './CADOverlay';
import { GovernedOverlay } from './GovernedOverlay';
import { UniversalRenderer } from '../UniversalRenderer';
import type { UCADebugContext } from '../ucaTypes';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { ReorderIndicator } from './ReorderIndicator';
import { ResizeHandles } from './ResizeHandles';

interface StructuralNodeProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  depth: number;
  catalog: Record<string, CellTemplate>;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  debugContext?: UCADebugContext | undefined;
  worldPos: { x: number, y: number };
  isLayoutGoverned: boolean;
  parentNode?: OmegaNode | null | undefined;
  handleDebugClick: (e: React.MouseEvent) => void;
  audit?: import('@/omega-ui-core/types/audit').AuditResult | undefined;
}

export function StructuralNode({
  node,
  manifest,
  depth,
  catalog,
  resolveAsset,
  debugContext,
  worldPos,
  isLayoutGoverned,
  parentNode,
  handleDebugClick,
  audit
}: StructuralNodeProps) {
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const localLabelRef = React.useRef<HTMLSpanElement>(null);

  const { dragOffset, targetIndex, isDraggable, panHandlers } = useUCADrag({
    node,
    manifest,
    debugContext,
    worldPos,
    labelRef,
    localLabelRef,
    isLayoutGoverned,
    parentNode
  });

  const isSelected = debugContext?.selectedId === node.id;
  const isMultiSelected = !isSelected && (debugContext?.multiSelectedIds?.includes(node.id) ?? false);
  const isResizeMode = isSelected && debugContext?.activeTool === 'transform';
  const { cssVars } = useDesignTokens(manifest);

  const handleClick = (e: React.MouseEvent) => {
    // Skip selection when tap originates from a child interactive node
    const target = e.target as HTMLElement;
    if (target.closest('.uca-cell')) {
      return;
    }
    handleDebugClick(e);
  };

  const isSelectedElsewhere = debugContext?.activeDragOffset && 
    debugContext.activeDragOffset.draggedNodeId !== node.id && 
    (isSelected || isMultiSelected);

  const offsetToApply = isSelectedElsewhere
    ? debugContext!.activeDragOffset!
    : (dragOffset || { x: 0, y: 0 });

  // Check if we are currently being resized
  const activeResizeOffset = debugContext?.activeResizeOffset;
  const isBeingResized = activeResizeOffset && activeResizeOffset.resizedNodeId === node.id;
  
  // Calculate dynamic dimensions and positions
  const currentW = isBeingResized ? activeResizeOffset.width : (node.layout?.size?.width ?? 100);
  const currentH = isBeingResized ? activeResizeOffset.height : (node.layout?.size?.height ?? 100);
  const currentX = isBeingResized ? ((node.layout?.pos?.x || 0) + activeResizeOffset.x) : ((node.layout?.pos?.x || 0) + offsetToApply.x);
  const currentY = isBeingResized ? ((node.layout?.pos?.y || 0) + activeResizeOffset.y) : ((node.layout?.pos?.y || 0) + offsetToApply.y);

  return (
    <motion.div
      id={`uca-${node.id}`}
      className={`uca-node uca-${node.kind} group`}
      onClick={handleClick}
      onTap={(e) => handleClick(e as unknown as React.MouseEvent)}
      onPointerDown={(e) => {
        // Select on pointerdown BEFORE framer-motion pan gesture can suppress click
        handleClick(e as unknown as React.MouseEvent);
        // Block propagation in resize mode so the event doesn't bubble to the rack's
        // onClick handler (which calls onSelectItem(null) and deselects the node).
        if (isDraggable || isResizeMode) {
          e.stopPropagation();
        }
      }}
      {...panHandlers}
      style={{
        position: 'absolute',
        left: `${currentX}px`,
        top: `${currentY}px`,
        width: node.layout?.size?.width || isBeingResized ? `${currentW}px` : 'auto',
        height: node.layout?.size?.height || isBeingResized ? `${currentH}px` : 'auto',
        zIndex: isSelected ? 101 : (node.layout?.zIndex || 0),
        ...cssVars,
        // Semantic overrides for structural types
        backgroundColor: node.kind === 'rack' 
          ? 'var(--omega-color-surface)' 
          : (node.kind === 'face' 
              ? 'var(--omega-color-background)' 
              : (!debugContext?.isLiveMode ? 'rgba(16, 185, 129, 0.05)' : 'transparent')),
        border: !debugContext?.isLiveMode 
          ? `1px dashed ${node.kind === 'rack' ? '#9333ea' : node.kind === 'face' ? '#3b82f6' : '#10b981'}` 
          : `${node.style?.borderWidth || 0}px solid rgba(255,255,255,0.05)`,
        backdropFilter: node.kind === 'face' ? 'var(--omega-blur-global)' : 'none',
        padding: '2px',
        boxSizing: 'border-box',
        pointerEvents: (node.kind !== 'rack' && !debugContext?.isLiveMode) ? 'auto' : 'none',
        outline: (!debugContext?.isLiveMode && isSelected) 
          ? (debugContext?.activeTool === 'transform' ? '2px dashed #00f2ff' : '2px solid #00f2ff') 
          : (!debugContext?.isLiveMode && isMultiSelected) ? '1.5px dashed #a855f7' : 'none',
        outlineOffset: '4px',
        boxShadow: (!debugContext?.isLiveMode && isSelected) ? '0 0 20px rgba(0, 242, 255, 0.5)' : (!debugContext?.isLiveMode && isMultiSelected) ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'none'
      }}
    >
      {!debugContext?.isLiveMode && (
        <UCADebugHUD 
          node={node} 
          debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
          worldPos={worldPos}
          labelRef={labelRef}
          localLabelRef={localLabelRef}
        />
      )}
      
      {!debugContext?.isLiveMode && <GovernedOverlay enabled={!!isLayoutGoverned} />}

      {!debugContext?.isLiveMode && isSelected && debugContext?.activeTool === 'transform' && !debugContext?.lockedNodeIds?.includes(node.id) && (
        <ResizeHandles
          node={node}
          manifest={manifest}
          debugContext={debugContext}
        />
      )}

      {/* Visual reorder indicator — shows insertion point during drag in governed layouts */}
      {isLayoutGoverned && targetIndex !== null && parentNode?.layout?.mode && (
        <ReorderIndicator 
          targetIndex={targetIndex}
          mode={parentNode.layout.mode as 'stack-v' | 'stack-h'}
        />
      )}

      {(dragOffset || debugContext?.showCADOverlay) && debugContext?.enabled && !debugContext?.isLiveMode && (
         <CADOverlay 
           node={node} 
           manifest={manifest} 
           dragOffset={dragOffset} 
           parent={parentNode || undefined} 
           targetIndex={targetIndex}
         />
      )}

      {node.children?.map((child, index) => (
        <UniversalRenderer 
          key={`${child.id}-${index}`}
          node={child}
          manifest={manifest}
          depth={depth + 1} 
          debugContext={debugContext}
          catalog={catalog}
          resolveAsset={resolveAsset}
          parentWorldPos={worldPos}
          parentNode={node}
          audit={audit}
        />
      ))}
    </motion.div>
  );
}
