'use client';

/**
 * @purpose Gestiona una sección colapsable para ajustes espaciales y estructurales en componentes de editor de manifesto, incluyendo control de tamaño, posición y índice z basado en capacidades disponibles.
 * @purpose_en Manages a collapsible section for spatial and structural adjustments in manifest editor components, including size, position, and z-index controls based on available capabilities.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:009kux
 * @lastUpdated 2026-06-20T09:17:57.174Z
 */

import { Maximize, Move, Layers } from 'lucide-react';
import type { OmegaStyleNode } from '@/types/manifest';
import InspectorCollapsible from '../InspectorCollapsible';

interface SpatialGovernanceProps {
  values: Partial<OmegaStyleNode>;
  capabilities: string[];
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

export default function SpatialGovernance({ values, capabilities, onChange }: SpatialGovernanceProps) {
  return (
    <InspectorCollapsible 
      title="Spatial & Structural" 
      icon={Maximize}
      defaultOpen={true}
    >
      <div className="space-y-4">
        {/* SIZE (WIDTH / HEIGHT) */}
        {capabilities.includes('size') && (
          <div className="space-y-3 p-3 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[7px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1.5">
                <Maximize className="w-3 h-3 text-accent" />
                Physical Size & Scale (PX)
              </label>
              <div className="flex items-center gap-2">
                 <span className="text-[7px] font-mono text-accent">{values.width || 48}x{values.height || 48}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[5px] font-black uppercase wb-text-muted italic">Width</span>
                </div>
                <input 
                  type="range" min="4" max="256" step="1"
                  value={values.width || 48}
                  onChange={(e) => onChange({ width: parseInt(e.target.value) })}
                  className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
                  aria-label="Width in pixels"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[5px] font-black uppercase wb-text-muted italic">Height</span>
                </div>
                <input 
                  type="range" min="4" max="256" step="1"
                  value={values.height || 48}
                  onChange={(e) => onChange({ height: parseInt(e.target.value) })}
                  className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
                  aria-label="Height in pixels"
                />
              </div>
            </div>
          </div>
        )}

        {/* POSITION (OFFSET X / OFFSET Y) */}
        {capabilities.includes('position') && (
          <div className="space-y-3 p-3 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[7px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1.5">
                <Move className="w-3 h-3 text-accent" />
                Spatial Positioning & Offsets
              </label>
              <div className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-accent">{values.offsetX || 0}, {values.offsetY || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[5px] font-black uppercase wb-text-muted italic">Offset X</span>
                </div>
                <input 
                  type="range" min="-100" max="100" step="1"
                  value={values.offsetX || 0}
                  onChange={(e) => onChange({ offsetX: parseInt(e.target.value) })}
                  className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
                  aria-label="Offset X position"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[5px] font-black uppercase wb-text-muted italic">Offset Y</span>
                </div>
                <input 
                  type="range" min="-100" max="100" step="1"
                  value={values.offsetY || 0}
                  onChange={(e) => onChange({ offsetY: parseInt(e.target.value) })}
                  className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
                  aria-label="Offset Y position"
                />
              </div>
            </div>
          </div>
        )}

        {/* Z-INDEX (LAYER ORDER) */}
        {capabilities.includes('zIndex') && (
          <div className="space-y-1.5 p-3 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[7px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-accent" />
                Layer Stack Order
              </label>
              <span className="text-[7px] font-mono text-accent">L{(values.zIndex || 1)}</span>
            </div>
            <input 
              type="range" min="1" max="50" step="1"
              value={values.zIndex || 1}
              onChange={(e) => onChange({ zIndex: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Layer stack order (z-index)"
            />
          </div>
        )}
      </div>
    </InspectorCollapsible>
  );
}
