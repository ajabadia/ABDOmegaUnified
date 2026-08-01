/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Gestiona visualización espacial de alta precisión para diseño y depuración en un editor de manifesto OMEGA.
 * @purpose_en Manages high-precision spatial visualization for design and debugging in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:1dj870i
 * @lastUpdated 2026-06-15T15:18:23.181Z
 */

import type { OmegaNode, OMEGA_Manifest, GridConfig } from '../../types/manifest';
import { getParentRect, getNodeSize, snapToGrid, clampChildToParent } from '../../uca/spatialConstraints';

export interface CADOverlayProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  dragOffset?: { x: number, y: number } | null | undefined;
  parent?: OmegaNode | undefined;
  targetIndex?: number | null | undefined;
}

/**
 * CADOverlay (Phase 4.3.2)
 * High-precision spatial visualization for design and debugging.
 */
export function CADOverlay({ 
  node, 
  manifest, 
  dragOffset, 
  parent,
  targetIndex
}: CADOverlayProps) {
  if (!parent || !node.layout) return null;

  const parentRect = getParentRect(parent, manifest);
  const size = getNodeSize(node);
  const rawX = (node.layout.pos?.x || 0) + (dragOffset?.x || 0);
  const rawY = (node.layout.pos?.y || 0) + (dragOffset?.y || 0);
  
  const gridConfig = manifest.ui?.layout?.grid as GridConfig | undefined;
  const snappedPos = gridConfig?.enabled ? snapToGrid({ x: rawX, y: rawY }, gridConfig) : { x: rawX, y: rawY };

  const clamped = clampChildToParent(
    { x: snappedPos.x, y: snappedPos.y, width: size.width, height: size.height },
    parentRect,
    node.constraints?.margin || 0
  );

  const isClamped = clamped.x !== snappedPos.x || clamped.y !== snappedPos.y;
  const isSnapped = snappedPos.x !== rawX || snappedPos.y !== rawY;

  return (
    <div className="absolute top-0 left-0 pointer-events-none z-[100]" style={{ width: parentRect.width, height: parentRect.height }}>
      {/* Grid Visualization */}
      {gridConfig?.enabled && (
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: `${gridConfig.spacingX}px ${gridConfig.spacingY}px`
          }} 
        />
      )}

      {/* Parent Bounding Box */}
      <div 
        className="absolute border border-dashed border-blue-500/50 bg-blue-500/5"
        style={{ left: 0, top: 0, width: parentRect.width, height: parentRect.height }}
      >
        <span className="absolute -top-3 left-0 text-[5px] font-black uppercase text-blue-400 bg-black/80 px-1 rounded-xs">
          Parent: {parent.id} ({parentRect.width}x{parentRect.height})
        </span>
      </div>

      {/* Proposed Box (Ghost) */}
      {dragOffset && (isClamped || isSnapped) && (
        <div 
          className="absolute border border-dashed border-red-500/40"
          style={{ left: rawX, top: rawY, width: size.width, height: size.height }}
        >
          <span className="absolute -top-2 left-0 text-[4px] font-bold uppercase text-red-400">Proposed</span>
        </div>
      )}

      {/* Reorder Slot Indicator (Phase 4.4.3) */}
      {targetIndex !== null && targetIndex !== undefined && parent.children && (
        (() => {
          const mode = parent.layout?.mode || 'absolute';
          if (mode === 'absolute') return null;

          const axis = mode === 'stack-v' ? 'y' : 'x';
          const otherSiblings = (parent.children || []).filter(s => s.id !== node.id);
          
          let slotPos = 0;
          if (targetIndex !== null && targetIndex !== undefined && targetIndex < otherSiblings.length) {
            const targetSibling = otherSiblings[targetIndex];
            slotPos = (targetSibling && targetSibling.layout?.pos?.[axis]) || 0;
          } else if (otherSiblings.length > 0) {
            const lastSibling = otherSiblings[otherSiblings.length - 1];
            if (lastSibling) {
              slotPos = (lastSibling.layout?.pos?.[axis] || 0) + 
                (mode === 'stack-v' ? (lastSibling.layout?.size?.height || 48) : (lastSibling.layout?.size?.width || 48)) + 
                (parent.layout?.gap || 0);
            }
          } else {
            slotPos = parent.layout?.padding || 0;
          }

          return (
            <div 
              className="absolute bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] z-[110] animate-pulse"
              style={{
                left: mode === 'stack-h' ? `${slotPos}px` : '0',
                top: mode === 'stack-v' ? `${slotPos}px` : '0',
                width: mode === 'stack-h' ? '2px' : '100%',
                height: mode === 'stack-v' ? '2px' : '100%',
                transform: mode === 'stack-h' ? 'translateX(-50%)' : 'translateY(-50%)'
              }}
            >
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[5px] font-black uppercase px-1 rounded-xs whitespace-nowrap">
                  Insert at {targetIndex}
               </div>
            </div>
          );
        })()
      )}

      {/* Clamped / Final Box */}
      <div 
        className={`absolute border-1 ${isClamped ? 'border-emerald-400' : isSnapped ? 'border-amber-400' : 'border-white/20'} ${dragOffset ? 'bg-emerald-500/10' : ''}`}
        style={{ left: clamped.x, top: clamped.y, width: size.width, height: size.height }}
      >
        <span className="absolute -bottom-3 left-0 text-[5px] font-mono font-bold text-white bg-black/80 px-1 rounded-xs">
          {Math.round(clamped.x)},{Math.round(clamped.y)} [{size.width}x{size.height}]
        </span>
      </div>
    </div>
  );
}
