'use client';

/**
 * @purpose Renderiza rectángulos semitransparentes fantasma para cada elemento seleccionado en su posición proyectada después de alinearlos en el viewport del editor de manifesto OMEGA.
 * @purpose_en Renders semi-transparent ghost rectangles for each selected element at their projected position after alignment in the OMEGA manifest editor viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:lxtk2u
 * @lastUpdated 2026-06-15T13:00:43.485Z
 */

import type { GhostItem } from '@/features/manifest-editor/utils/alignmentConstants';

interface AlignGhostOverlayProps {
  items: GhostItem[];
  /** Human-readable label (e.g., "Align left", "Distribute H") */
  alignType: string;
}

/**
 * AlignGhostOverlay — renders semi-transparent ghost rectangles for each
 * selected element at their projected position after alignment.
 *
 * Rendered inside the rack-viewport container so coordinates are in the
 * same transformed space as the UCA tree nodes — no extra math needed.
 *
 * Visual language:
 * - Dashed cyan/blue border with subtle fill
 * - Small label badge at top-left
 * - Subtle dot indicators at the center of each ghost
 */
export default function AlignGhostOverlay({ items, alignType }: AlignGhostOverlayProps) {
  if (items.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[50]">
      {/* Ghost rectangles */}
      {items.map(item => (
        <div key={item.id}>
          {/* Ghost bounding box */}
          <div
            className="absolute border-[1.5px] border-dashed border-cyan-400/70 rounded-[3px] 
                       transition-all duration-100"
            style={{
              left: item.x,
              top: item.y,
              width: Math.max(item.w, 4),
              height: Math.max(item.h, 4),
              backgroundColor: 'rgba(34, 211, 238, 0.08)',
              boxShadow: '0 0 12px rgba(34, 211, 238, 0.12), inset 0 0 12px rgba(34, 211, 238, 0.04)',
            }}
          >
            {/* Center dot */}
            <div
              className="absolute w-[4px] h-[4px] rounded-full bg-cyan-400/50"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Hover hint — shows original position faintly */}
          </div>

          {/* Position label (above each ghost) */}
          <div
            className="absolute font-mono font-bold text-[6px] leading-none px-[3px] py-[1px] rounded-[1px]
                       text-cyan-300/70 bg-cyan-500/20 border border-cyan-400/30 whitespace-nowrap"
            style={{
              left: item.x,
              top: item.y - 12,
            }}
          >
            {item.x},{item.y}
          </div>
        </div>
      ))}

      {/* Label badge — top-left corner of the rack */}
      <div
        className="absolute top-2 left-2 px-2 py-[3px] rounded-[3px] backdrop-blur-sm
                   text-[8px] font-bold uppercase tracking-[0.12em] 
                   border border-cyan-400/40 shadow-lg shadow-cyan-500/10
                   select-none"
        style={{
          backgroundColor: 'rgba(8, 145, 178, 0.25)',
          color: 'rgb(103, 232, 249)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
          {alignType}
        </div>
      </div>
    </div>
  );
}
