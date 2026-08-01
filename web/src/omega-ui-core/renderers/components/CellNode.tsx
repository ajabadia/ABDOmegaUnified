/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Gestiona un nodo de célula en el editor de manifesto OMEGA, maneja arrastre y soltar, renderiza componentes y muestra información de depuración.
 * @purpose_en Renders a cell node in the OMEGA manifest editor, handling drag and drop, rendering components, and displaying debug information.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:14,sig:1cwugwo
 * @lastUpdated 2026-06-15T15:18:28.933Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, CellTemplate } from '../../types/manifest';
import type { ComponentNode, ComponentType } from '../../types/rack';
import { renderComponentNode } from '../primitives';
import { CellRenderer } from '../CellRenderer';
import { useUCADrag } from '../hooks/useUCADrag';
import { UCADebugHUD } from './UCADebugHUD';
import { CADOverlay } from './CADOverlay';
import { GovernedOverlay } from './GovernedOverlay';
import { UniversalRenderer } from '../UniversalRenderer';
import type { UCADebugContext } from '../ucaTypes';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { useA11y } from '../hooks/useA11y';
import { IntegrityOverlay } from '@/features/manifest-editor/components/viewport/IntegrityOverlay';
import { ReorderIndicator } from './ReorderIndicator';
import { ResizeHandles } from './ResizeHandles';

const COMP_TYPE_MAP: Record<string, ComponentType> = {
  'knob': 'knob',
  'slider-v': 'slider',
  'slider-h': 'slider',
  'slider': 'slider',
  'switch': 'switch',
  'button': 'button',
  'push': 'button',
  'stepper': 'button',
  'port': 'port',
  'led': 'led',
  'display': 'display',
  'label': 'label',
  'select': 'select',
  'illustration': 'illustration',
  'scope': 'scope',
  'terminal': 'terminal',
};

function omegaNodeToComponentNode(node: OmegaNode): ComponentNode {
  const compType = node.cellRef || node.kind || 'knob';
  const type = COMP_TYPE_MAP[compType] || 'knob';
  return {
    id: node.id,
    type,
    label: (node.meta?.label as string) || node.id || '',
    pos: { x: node.layout?.pos?.x || 0, y: node.layout?.pos?.y || 0 },
    size: node.layout?.size ? { width: node.layout.size.width || 48, height: node.layout.size.height || 48 } : { width: 48, height: 48 },
    style: (node.style || {}) as ComponentNode['style'],
    bind: node.bind ? { target: node.bind } : undefined,
    visible: node.visible,
    locked: node.locked,
  };
}

interface CellNodeProps {
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
  audit?: import('@/services/auditService').AuditResult | undefined;
}

export function CellNode({
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
}: CellNodeProps) {
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

  const runtimeValue = debugContext?.runtimeValues?.[node.id] ?? 0;

  const isSelected = debugContext?.selectedId === node.id;
  const isMultiSelected = !isSelected && (debugContext?.multiSelectedIds?.includes(node.id) ?? false);
  const isResizeMode = isSelected && debugContext?.activeTool === 'transform';

  const componentNode = omegaNodeToComponentNode(node);
  const renderedComponent = renderComponentNode(componentNode, {
    value: runtimeValue,
    assetUrl: resolveAsset ? resolveAsset(node.style?.asset) : node.style?.asset,
  });
  const rawHTML = !renderedComponent ? CellRenderer.renderCellHTML(node, {
    skin: 'default',
    zoom: 1,
    steps: 128,
    runtimeValue,
    manifest,
    resolveAsset,
    isSelected
  }) : null;

  // LIVE mode knob rotation: transparent overlay with vertical drag → 0-1 value
  const isKnob = (node.cellRef || node.kind) === 'knob';
  const knobDragRef = React.useRef<HTMLDivElement>(null);
  const knobStartY = React.useRef<number>(0);
  const knobStartValue = React.useRef<number>(0);

  const handleKnobDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    knobStartY.current = e.clientY;
    knobStartValue.current = runtimeValue;
    knobDragRef.current?.setPointerCapture(e.pointerId);
  };

  const handleKnobDragMove = (e: React.PointerEvent) => {
    if (debugContext?.isLiveMode && isKnob && debugContext?.onUpdateRuntimeValue) {
      const dy = knobStartY.current - e.clientY;
      const newValue = Math.max(0, Math.min(1, knobStartValue.current + dy / 150));
      debugContext.onUpdateRuntimeValue(node.id, newValue);
    }
  };

  const handleKnobDragEnd = (e: React.PointerEvent) => {
    knobDragRef.current?.releasePointerCapture(e.pointerId);
  };

  const { cssVars } = useDesignTokens(manifest);

  const a11y = useA11y(
    node,
    runtimeValue,
    debugContext?.onUpdateRuntimeValue
      ? (id: string, val: number) => debugContext.onUpdateRuntimeValue!(id, val)
      : undefined,
  );

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
  const currentW = isBeingResized ? activeResizeOffset.width : (node.layout?.size?.width ?? 48);
  const currentH = isBeingResized ? activeResizeOffset.height : (node.layout?.size?.height ?? 48);
  const currentX = isBeingResized ? ((node.layout?.pos?.x || 0) + activeResizeOffset.x) : ((node.layout?.pos?.x || 0) + offsetToApply.x);
  const currentY = isBeingResized ? ((node.layout?.pos?.y || 0) + activeResizeOffset.y) : ((node.layout?.pos?.y || 0) + offsetToApply.y);

  // Check if we are currently being rotated
  const activeRotationOffset = debugContext?.activeRotationOffset;
  const isBeingRotated = activeRotationOffset && activeRotationOffset.rotatedNodeId === node.id;
  const currentAngle = isBeingRotated 
    ? activeRotationOffset.angle 
    : (node.layout?.transform ? parseFloat((node.layout.transform.match(/rotate\(?([-\d.]+)deg\)/) || [])[1] || '0') : 0);
  const currentTransform = currentAngle === 0 ? undefined : `rotate(${currentAngle}deg)`;



  // Compute visual scale for primitive elements to stretch them in real-time
  const kind = node.cellRef || node.kind || 'knob';
  const isScaledPrimitive = kind === 'knob' || kind === 'button' || kind === 'push' || kind === 'stepper' || kind === 'switch' || kind === 'port' || kind === 'led';
  const BASE_SIZES: Record<string, { width: number; height: number }> = {
    'knob': { width: 36, height: 36 },
    'slider-v': { width: 20, height: 64 },
    'slider-h': { width: 64, height: 20 },
    'button': { width: 24, height: 24 },
    'switch': { width: 24, height: 40 },
    'led': { width: 14, height: 14 },
    'display': { width: 80, height: 40 },
    'label': { width: 60, height: 16 }
  };
  const baseSize = BASE_SIZES[kind] || { width: 48, height: 48 };
  const scaleX = isScaledPrimitive ? currentW / baseSize.width : 1;
  const scaleY = isScaledPrimitive ? currentH / baseSize.height : 1;

  return (
    <motion.div
      id={`uca-${node.id}`}
      className="uca-node uca-cell group"
      onClick={handleDebugClick}
      onTap={(e) => handleDebugClick(e as unknown as React.MouseEvent)}
      onPointerDown={(e) => {
        // Select on pointerdown BEFORE framer-motion pan gesture can suppress click
        handleDebugClick(e as unknown as React.MouseEvent);
        // Block propagation in resize mode so the event doesn't bubble to the rack's
        // onClick handler (which calls onSelectItem(null) and deselects the node).
        if (isDraggable || isResizeMode) {
          e.stopPropagation();
        }
      }}
      {...panHandlers}
      {...a11y}
      style={{
        position: 'absolute',
        left: `${currentX}px`,
        top: `${currentY}px`,
        width: `${currentW}px`, 
        height: `${currentH}px`,
        transform: currentTransform,
        zIndex: isSelected ? 100 : (node.layout?.zIndex || 0),
        ...cssVars,
        pointerEvents: debugContext?.isLiveMode ? 'none' : 'auto',
        outline: (!debugContext?.isLiveMode && isSelected) 
          ? (debugContext?.activeTool === 'transform' ? '2px dashed #00f2ff' : '2px solid #00f2ff') 
          : (!debugContext?.isLiveMode && isMultiSelected) ? '1.5px dashed #a855f7' : 'none',
        outlineOffset: '2px',
        boxShadow: (!debugContext?.isLiveMode && isSelected) ? '0 0 15px rgba(0, 242, 255, 0.4)' : (!debugContext?.isLiveMode && isMultiSelected) ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none',
      }}
    >
      {!debugContext?.isLiveMode && (
        <UCADebugHUD 
          node={node} 
          debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
          worldPos={worldPos}
          audit={audit}
        />
      )}

      {!debugContext?.isLiveMode && <IntegrityOverlay node={node} audit={audit} />}

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

      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          transform: `scale(${scaleX}, ${scaleY})`,
          transformOrigin: 'center center'
        }}
      >
        {renderedComponent || (rawHTML && (
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: rawHTML }} 
          />
        ))}
      </div>

      {/* LIVE mode KnobDragOverlay — vertical drag controls 0–1 value */}
      {debugContext?.isLiveMode && isKnob && debugContext?.onUpdateRuntimeValue && (
        <div
          ref={knobDragRef}
          className="absolute inset-0 cursor-ns-resize pointer-events-auto"
          onPointerDown={handleKnobDragStart}
          onPointerMove={handleKnobDragMove}
          onPointerUp={handleKnobDragEnd}
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
