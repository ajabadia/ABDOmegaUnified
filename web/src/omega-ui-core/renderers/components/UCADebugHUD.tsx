/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Renderiza una interfaz de usuario de depuración para un nodo de manifesto OMEGA, mostrando su tipo, ID, mundo y posición local, junto con un indicador de problemas de auditoría.
 * @purpose_en Renders a debug HUD for an OMEGA manifest node, displaying its type, ID, world and local positions, and optional audit issues indicator.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:yi6brq
 * @lastUpdated 2026-06-15T15:30:25.672Z
 */

import React from 'react';
import type { OmegaNode, Position } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';

interface UCADebugHUDProps {
  node: OmegaNode;
  debugContext: UCADebugContext;
  worldPos: Position | undefined;
  labelRef?: React.RefObject<HTMLSpanElement | null> | undefined;
  localLabelRef?: React.RefObject<HTMLSpanElement | null> | undefined;
  audit?: import('@/omega-ui-core/types/audit').AuditResult | undefined;
}

export function UCADebugHUD({
  node,
  debugContext,
  worldPos,
  labelRef,
  localLabelRef,
  audit
}: UCADebugHUDProps) {
  if (!debugContext.enabled || !debugContext.showLabels) return null;

  return (
    <div className="absolute -top-3 left-0 flex items-center gap-1 z-50 whitespace-nowrap pointer-events-none select-none">
      <div className={`px-1 py-0.5 rounded-xs text-[6px] font-black uppercase text-white shadow-lg ${
        node.kind === 'rack' ? 'bg-purple-600' : node.kind === 'face' ? 'bg-blue-600' : 'bg-amber-600'
      }`}>
        {node.kind}:{node.id} [<span ref={labelRef}>W: {Math.round(worldPos?.x || 0)}, {Math.round(worldPos?.y || 0)}</span>]
        {audit?.issues?.some(i => (i.path ?? '').includes(node.id)) && (
          <span className="ml-1 text-red-400 animate-pulse">●</span>
        )}
      </div>
      <div className="bg-emerald-600 px-1 py-0.5 rounded-xs text-[5px] font-bold text-white shadow-lg opacity-80">
        <span ref={localLabelRef}>L: {Math.round(node.layout?.pos?.x || 0)}, {Math.round(node.layout?.pos?.y || 0)}</span>
      </div>
    </div>
  );
}
