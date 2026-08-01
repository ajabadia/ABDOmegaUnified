/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Renderiza y proporciona manejadores de tamaño y rotación para nodos en el editor de manifesto OMEGA, con una flecha curva de SVG, un cruz de pivote centrado y una tooltip real-time transparente.
 * @purpose_en Renders resize and rotation handles for nodes in the OMEGA manifest editor, with SVG curved arrow, center pivot crosshair, and glassmorphic real-time tooltip.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:1atobo6
 * @lastUpdated 2026-06-20T11:09:02.215Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { useUCAResize } from '../hooks/useUCAResize';
import { RotationHandle } from './RotationHandle';

interface ResizeHandlesProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  debugContext?: UCADebugContext | undefined;
}

export function ResizeHandles({ node, manifest, debugContext }: ResizeHandlesProps) {
  const {
    resizeOffset,
    isResizing,
    isShiftActive,
    handleResizeStart,
    handleResizePan,
    handleResizeEnd
  } = useUCAResize({ node, manifest, debugContext });

  if (debugContext?.isLiveMode) return null;

  // Double-click reset size mapping
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Start transaction for resetting
    if (debugContext?.startTransaction) {
      debugContext.startTransaction('Reset Size');
    }

    let defaultW = 48;
    let defaultH = 48;
    const kind = node.cellRef || node.kind || 'knob';
    
    // Primitives default sizing
    if (kind === 'knob') {
      defaultW = 36;
      defaultH = 36;
    } else if (kind === 'slider-v') {
      defaultW = 20;
      defaultH = 64;
    } else if (kind === 'slider-h') {
      defaultW = 64;
      defaultH = 20;
    } else if (kind === 'button') {
      defaultW = 24;
      defaultH = 24;
    } else if (kind === 'switch') {
      defaultW = 24;
      defaultH = 40;
    } else if (kind === 'led') {
      defaultW = 14;
      defaultH = 14;
    } else if (kind === 'display') {
      defaultW = 80;
      defaultH = 40;
    } else if (kind === 'label') {
      defaultW = 60;
      defaultH = 16;
    } else if (node.kind === 'group' || node.kind === 'container' || node.kind === 'face') {
      // For structural nodes, restore to standard 200x120 or calculate bounding box
      defaultW = 200;
      defaultH = 120;
    }

    // Reset size update
    debugContext?.onUpdateNode?.(node.id, {
      layout: {
        pos: node.layout?.pos ?? { x: 0, y: 0 },
        size: { width: defaultW, height: defaultH }
      }
    });

    if (debugContext?.commitTransaction) {
      debugContext.commitTransaction();
    }
  };

  const currentW = Math.round(resizeOffset?.width ?? node.layout?.size?.width ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100));
  const currentH = Math.round(resizeOffset?.height ?? node.layout?.size?.height ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100));

  const gridConfig = manifest.ui?.layout?.grid;
  const spacingX = gridConfig?.spacingX ?? 24;
  const hpValue = (currentW / spacingX).toFixed(1);

  // Tech-Noir aesthetics for handles
  const handleStyle = {
    width: '6px',
    height: '6px',
    backgroundColor: '#0e0e0f',
    border: '1px solid #00f0ff',
    position: 'absolute' as const,
    zIndex: 200,
    boxShadow: '0 0 4px rgba(0, 240, 255, 0.4)',
    transition: 'transform 0.15s, border-color 0.15s',
  };

  return (
    <>
      {/* Real-time glassmorphic HUD showing dimensions */}
      {isResizing && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 rounded-[3px] z-[210] pointer-events-none whitespace-nowrap backdrop-blur-md"
          style={{
            background: 'rgba(14, 14, 15, 0.65)',
            border: '1px solid rgba(0, 240, 255, 0.35)',
            boxShadow: '0 0 12px rgba(0, 240, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
            WebkitFontSmoothing: 'none',
          }}
        >
          <span className="text-[7px] text-[#00f0ff] font-mono font-bold tracking-wider">
            {currentW} × {currentH} px
          </span>
          <span className="text-[6px] text-white/40 font-mono ml-1.5">
            {hpValue} HP
          </span>
          {isShiftActive && (
            <span 
              className="text-[7px] text-[#00f0ff] font-bold animate-pulse ml-1.5"
              title="Proportional scaling locked"
            >
              🔒
            </span>
          )}
        </div>
      )}

      <RotationHandle
        node={node}
        manifest={manifest}
        debugContext={debugContext}
        currentW={currentW}
        currentH={currentH}
        hpValue={hpValue}
      />

      {/* NW Corner Handle */}
      <motion.div
        aria-label="NW resize handle - drag to scale from top-left"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, left: '-4px', top: '-4px', cursor: 'nwse-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('nw', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* NE Corner Handle */}
      <motion.div
        aria-label="NE resize handle - drag to scale from top-right"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, right: '-4px', top: '-4px', cursor: 'nesw-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('ne', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* SW Corner Handle */}
      <motion.div
        aria-label="SW resize handle - drag to scale from bottom-left"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, left: '-4px', bottom: '-4px', cursor: 'nesw-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('sw', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* SE Corner Handle */}
      <motion.div
        aria-label="SE resize handle - drag to scale from bottom-right"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, right: '-4px', bottom: '-4px', cursor: 'nwse-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('se', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />
    </>
  );
}
