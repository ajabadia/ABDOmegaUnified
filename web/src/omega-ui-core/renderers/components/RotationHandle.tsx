/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Renderiza un componente de manija de rotación para nodos en el editor de manifesto OMEGA, proporcionando una interfaz visual para rotar elementos.
 * @purpose_en Renders a rotation handle component for nodes in the OMEGA manifest editor, providing a visual interface for rotating elements.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:9wnai9
 * @lastUpdated 2026-06-20T11:09:07.942Z
 */

import React from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { computeRotationUpdates, getNodeRotation } from '../utils/scaleUtils';

interface RotationHandleProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  debugContext?: UCADebugContext | undefined;
  currentW: number;
  currentH: number;
  hpValue: string;
}

export function RotationHandle({
  node,
  manifest,
  debugContext,
  currentW,
  currentH,
  hpValue,
}: RotationHandleProps) {
  const [rotationAngle, setRotationAngle] = React.useState(0);
  const [isRotating, setIsRotating] = React.useState(false);
  const rotationStartAngleRef = React.useRef(0);
  const rotationAngleRef = React.useRef(0);

  // ── Rotation handle handlers ────────────────────────────────────────
  const handleRotationStart = () => {
    const ctx = debugContext;
    if (ctx?.startTransaction) {
      ctx.startTransaction('Rotate Element');
    }
    setIsRotating(true);
    rotationStartAngleRef.current = getNodeRotation(node);
    setRotationAngle(rotationStartAngleRef.current);
    rotationAngleRef.current = rotationStartAngleRef.current;
  };

  const handleRotationMove = (e: MouseEvent | TouchEvent, info: PanInfo) => {
    const zoom = debugContext?.zoom ?? 1;
    const dx = info.offset.x / zoom;
    const dy = info.offset.y / zoom;
    const mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    let angle = rotationStartAngleRef.current + mouseAngle;
    if ('shiftKey' in e && e.shiftKey) {
      angle = Math.round(angle / 15) * 15;
    }
    const clamped = ((angle % 360) + 360) % 360;
    setRotationAngle(clamped);
    rotationAngleRef.current = clamped;
    debugContext?.onUpdateRotationOffset?.({ angle: clamped, rotatedNodeId: node.id });
  };

  const handleRotationEnd = () => {
    setIsRotating(false);
    debugContext?.onUpdateRotationOffset?.(null);
    const ctx = debugContext;
    const finalAngle = rotationAngleRef.current;
    if (ctx && finalAngle !== getNodeRotation(node)) {
      const updates = computeRotationUpdates(node.id, finalAngle, manifest);
      if (ctx.onUpdateNodes) {
        ctx.onUpdateNodes(updates);
      } else {
        const upd = updates[node.id];
        if (upd && ctx.onUpdateNode) {
          ctx.onUpdateNode(node.id, upd);
        }
      }
    }
    if (ctx?.commitTransaction) {
      ctx.commitTransaction();
    }
  };

  const handleRotationDoubleClick = () => {
    setRotationAngle(0);
    rotationAngleRef.current = 0;
    const ctx = debugContext;
    if (ctx) {
      const updates = computeRotationUpdates(node.id, 0, manifest);
      if (ctx.onUpdateNodes) {
        ctx.onUpdateNodes(updates);
      } else if (ctx.onUpdateNode) {
        const upd = updates[node.id];
        if (upd) ctx.onUpdateNode(node.id, upd);
      }
    }
  };

  return (
    <>
      {/* Rotation real-time glassmorphic tooltip — dimensions + angle */}
      {isRotating && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-9 px-2 py-1 rounded-[3px] z-[210] pointer-events-none whitespace-nowrap backdrop-blur-md"
          style={{
            background: 'rgba(14, 14, 15, 0.65)',
            border: '1px solid rgba(240, 160, 0, 0.35)',
            boxShadow: '0 0 12px rgba(240, 160, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            WebkitFontSmoothing: 'none',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-[#f0a000] font-mono font-black tracking-wider">
              {Math.round(rotationAngle)}°
            </span>
            <div className="w-[1px] h-3 bg-white/10" />
            <span className="text-[6px] text-white/40 font-mono tracking-wider">
              {currentW}×{currentH}
            </span>
            <span className="text-[5px] text-white/20 font-mono">
              {hpValue}HP
            </span>
          </div>
        </div>
      )}

      {/* Center pivot crosshair — glassmorphic ring + glow */}
      <div
        className="absolute pointer-events-none z-[199]"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '24px',
          height: '24px',
        }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1px solid rgba(0, 240, 255, 0.2)',
            background: 'rgba(0, 240, 255, 0.04)',
            backdropFilter: 'blur(2px)',
          }}
        />
        {/* Crosshair lines — horizontal */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: '-6px',
            right: '-6px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.6) 30%, rgba(0,240,255,0.6) 70%, transparent 100%)',
          }}
        />
        {/* Crosshair lines — vertical */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '-6px',
            bottom: '-6px',
            width: '1px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.6) 30%, rgba(0,240,255,0.6) 70%, transparent 100%)',
          }}
        />
        {/* Center dot with glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: '4px',
            height: '4px',
            background: '#00f0ff',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.9), 0 0 20px rgba(0, 240, 255, 0.3)',
          }}
        />
        {/* Pulsing ring animation */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(0, 240, 255, 0.15)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Rotation handle — SVG curved arrow above top-center */}
      <motion.div
        aria-label="Rotation handle - drag to rotate"
        role="slider"
        aria-valuenow={Math.round(rotationAngle)}
        aria-valuemin={0}
        aria-valuemax={360}
        tabIndex={0}
        style={{
          position: 'absolute',
          left: '50%',
          top: '-26px',
          transform: 'translateX(-50%)',
          width: '18px',
          height: '18px',
          zIndex: 201,
          cursor: 'grab',
          touchAction: 'none',
        }}
        whileHover={{ scale: 1.25 }}
        onPanStart={handleRotationStart}
        onPan={handleRotationMove}
        onPanEnd={handleRotationEnd}
        onDoubleClick={handleRotationDoubleClick}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          style={{ display: 'block' }}
        >
          {/* Outer glow circle */}
          <circle
            cx="9" cy="9" r="8"
            fill="none"
            stroke="rgba(240, 160, 0, 0.15)"
            strokeWidth="1"
          />
          {/* Curved arrow — circular rotation icon */}
          <g transform="translate(9,9)">
            {/* Arc path (270° clockwise arc) */}
            <path
              d="M 0,-6 A 6,6 0 1,1 -6,0"
              fill="none"
              stroke="#f0a000"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Arrow head — tip connects at arc end (-6,0) */}
            <polygon
              points="-6,0 -7.5,1.8 -8,1.5"
              fill="#f0a000"
              stroke="none"
            />
            {/* Center dot */}
            <circle
              cx="0" cy="0" r="1.2"
              fill="#ffd700"
            />
          </g>
        </svg>
      </motion.div>

      {/* Connector line from rotation handle to top-center of node — amber glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '-14px',
          transform: 'translateX(-50%)',
          width: '1.5px',
          height: '14px',
          background: 'linear-gradient(180deg, rgba(240,160,0,0.5) 0%, rgba(240,160,0,0.15) 100%)',
          boxShadow: '0 0 6px rgba(240, 160, 0, 0.2)',
          zIndex: 199,
        }}
      />
    </>
  );
}
