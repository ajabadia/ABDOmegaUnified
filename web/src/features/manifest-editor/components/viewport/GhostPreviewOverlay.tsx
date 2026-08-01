'use client';

/**
 * @purpose Renderiza una capa de fantasma interactiva para detección de colisiones en tiempo real y inyección de plantillas en el editor de manifesto OMEGA en la ventana de visualización.
 * @purpose_en Renders an interactive ghost layer for real-time collision detection and blueprint injection in the OMEGA manifest editor's viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:1vtjnmg
 * @lastUpdated 2026-06-15T13:00:55.193Z
 */

import React from 'react';

interface GhostPreviewOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isCollision: boolean;
}

/**
 * GhostPreviewOverlay (v9.2.1)
 *
 * Interactive ghost layer that follows the mouse over the rack, providing
 * real-time collision detection feedback and the ability to click to confirm
 * blueprint injection at the exact grid-snapped position.
 *
 * Visual states:
 * - **Free zone**: Semi-transparent cyan/green tint + [CLICK TO INJECT] badge
 * - **Collision**: Red tint + [COLLISION DETECTED] badge + injection disabled
 */
export const GhostPreviewOverlay: React.FC<GhostPreviewOverlayProps> = ({
  x,
  y,
  width,
  height,
  isCollision,
}) => {
  const BADGE_HEIGHT = 22;

  return (
    <div
      className="absolute pointer-events-none z-[60]"
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
      }}
    >
      {/* Ghost bounding box */}
      <div
        className={`absolute inset-0 border-2 rounded-[4px] transition-all duration-150 ${
          isCollision
            ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(255,0,0,0.3)]'
            : 'border-cyan-400 bg-cyan-400/15 shadow-[0_0_20px_rgba(0,242,255,0.25)]'
        }`}
      />

      {/* Fill pattern (semi-transparent grid lines for depth) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`ghost-fill-${isCollision ? 'collision' : 'free'}`}
            x="0"
            y="0"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="12"
              height="12"
              fill={isCollision ? 'rgba(255,0,0,0.08)' : 'rgba(0,242,255,0.06)'}
            />
            <path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke={isCollision ? 'rgba(255,0,0,0.15)' : 'rgba(0,242,255,0.12)'}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#ghost-fill-${isCollision ? 'collision' : 'free'})`}
        />
      </svg>

      {/* Corner handles (subtle indicators) */}
      <div
        className={`absolute -top-[2px] -left-[2px] w-[12px] h-[12px] border-t-2 border-l-2 rounded-tl-[6px] transition-colors duration-150 ${
          isCollision ? 'border-red-400' : 'border-cyan-400'
        }`}
      />
      <div
        className={`absolute -top-[2px] -right-[2px] w-[12px] h-[12px] border-t-2 border-r-2 rounded-tr-[6px] transition-colors duration-150 ${
          isCollision ? 'border-red-400' : 'border-cyan-400'
        }`}
      />
      <div
        className={`absolute -bottom-[2px] -left-[2px] w-[12px] h-[12px] border-b-2 border-l-2 rounded-bl-[6px] transition-colors duration-150 ${
          isCollision ? 'border-red-400' : 'border-cyan-400'
        }`}
      />
      <div
        className={`absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] border-b-2 border-r-2 rounded-br-[6px] transition-colors duration-150 ${
          isCollision ? 'border-red-400' : 'border-cyan-400'
        }`}
      />

      {/* Position coordinates (top-left corner) */}
      <div
        className="absolute -top-[18px] left-0 px-[4px] py-[1px] font-mono font-bold rounded-[2px] transition-colors duration-150 text-[7px] leading-tight whitespace-nowrap"
        style={{
          backgroundColor: isCollision ? 'rgba(255,0,0,0.7)' : 'rgba(0,242,255,0.7)',
          color: '#000',
        }}
      >
        {Math.round(x)}, {Math.round(y)}
      </div>

      {/* Status badge (centered below the ghost) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 px-[8px] font-black uppercase tracking-[0.15em] rounded-[3px] transition-all duration-150 animate-pulse shadow-lg text-[7px] leading-none whitespace-nowrap"
        style={{
          top: height + 6,
          height: BADGE_HEIGHT,
          backgroundColor: isCollision
            ? 'rgba(220, 38, 38, 0.85)'
            : 'rgba(0, 200, 83, 0.85)',
          color: '#fff',
        }}
      >
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{
            backgroundColor: isCollision ? '#ff6b6b' : '#00ff9d',
            boxShadow: isCollision
              ? '0 0 6px rgba(255,107,107,0.8)'
              : '0 0 6px rgba(0,255,157,0.8)',
          }}
        />
        {isCollision ? 'COLLISION: CLICK OR ENTER TO FORCE' : 'LEFT-CLICK / ENTER TO PLACE'}
      </div>

      {/* Control Help (subtle details below badge) */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 font-sans font-bold uppercase tracking-widest text-[5px] text-white/45 whitespace-nowrap"
        style={{ top: height + 6 + BADGE_HEIGHT + 4 }}
      >
        Right-Click / ESC to Cancel
      </div>
    </div>
  );
};
