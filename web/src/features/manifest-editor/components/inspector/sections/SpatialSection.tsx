'use client';

/**
 * @purpose Gestiona una sección del editor de manifesto OMEGA para inspeccionar y editar propiedades espaciales de nodos, incluyendo posición, restricciones y coordenadas mundiales.
 * @purpose_en Manages a section in the OMEGA manifest editor for inspecting and editing spatial properties of nodes, including position, constraints, and world coordinates.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:wgfdbc
 * @lastUpdated 2026-06-20T09:17:13.630Z
 */

import React from 'react';
import { Move, Grid3X3, Layout, Info } from 'lucide-react';
import type { LayoutContainer, OmegaNode } from '@/omega-ui-core/types/manifest';
import { getInspectorModel, buildInspectorPatch } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';
import { calculateWorldPosition } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
import InfoBlock from '@/features/manifest-editor/components/inspector/shared/InfoBlock';
 
import { getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';
 
interface SpatialSectionProps {
  item: OmegaNode;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  onHelp?: ((sectionId: string) => void) | undefined;
  highlightPath?: (string | null) | undefined;
  containers?: LayoutContainer[] | undefined;
  rootTree?: OmegaNode | undefined;
}
 
export default function SpatialSection({ item, onUpdate, onHelp, highlightPath, rootTree }: SpatialSectionProps) {
  const model = getInspectorModel(item, rootTree);
  
  const componentType = model.component || 'knob';
  const elementDef = getElementDefinition(componentType);
  const pos = model.pos || { x: 0, y: 0 };
  const isHighlighted = (key: string) => !!highlightPath?.includes(key);

  const [localX, setLocalX] = React.useState<string>(pos.x.toString());
  const [localY, setLocalY] = React.useState<string>(pos.y.toString());
  const [focusedAxis, setFocusedAxis] = React.useState<string | null>(null);

  // Constraints State (Phase 4.3.1.b)
  const constraints = model.constraints ?? {};
  const [localClamp, setLocalClamp] = React.useState<boolean>(!!constraints.clampToParent);
  const [localMargin, setLocalMargin] = React.useState<string>((constraints.margin ?? 0).toString());

  const [prevProps, setPrevProps] = React.useState({ 
    id: item.id, 
    x: pos.x, 
    y: pos.y, 
    clamp: !!constraints.clampToParent, 
    margin: constraints.margin 
  });

  const worldPos = rootTree ? calculateWorldPosition(rootTree, item.id) : pos;
  
  // Sync local state when external item changes (selection change or drag end)
  const isExternalChange = item.id !== prevProps.id || pos.x !== prevProps.x || pos.y !== prevProps.y;
  const shouldSyncPos = isExternalChange && focusedAxis === null;
  const shouldSyncConstraints = item.id !== prevProps.id || (!!constraints.clampToParent !== prevProps.clamp || constraints.margin !== prevProps.margin);

  if (shouldSyncPos || shouldSyncConstraints) {
    setPrevProps({ 
      id: item.id, 
      x: pos.x, 
      y: pos.y, 
      clamp: !!constraints.clampToParent, 
      margin: constraints.margin 
    });
    
    if (shouldSyncPos) {
      setLocalX(Math.round(pos.x).toString());
      setLocalY(Math.round(pos.y).toString());
    }
    
    if (shouldSyncConstraints) {
      setLocalClamp(!!constraints.clampToParent);
      setLocalMargin((constraints.margin ?? 0).toString());
    }
  }

  const handleApplyConstraints = (patch: Partial<NonNullable<OmegaNode['constraints']>>) => {
    onUpdate(buildInspectorPatch(item, { 
      constraints: { ...constraints, ...patch } 
    }));
  };

  const handleCommit = (axis: 'x' | 'y', val: string) => {
    const numeric = parseFloat(val);
    if (!isNaN(numeric)) {
      onUpdate(buildInspectorPatch(item, { pos: { ...pos, [axis]: numeric } }));
    }
  };

  const isUCA = 'kind' in item;
  const isRack = isUCA && (item as OmegaNode).kind === 'rack';
  const canMove = (isUCA && !isRack) || !elementDef || elementDef.capabilities.includes('position');
  const canScale = (isUCA && !isRack) || !elementDef || elementDef.capabilities.includes('size');
 
  return (
    <div className="space-y-4 pt-2">
      {/* PARENT INFO */}
      <div className="p-3 bg-black/40 border wb-outline rounded-xs space-y-1">
        <span className="text-[8px] font-black uppercase text-foreground/40 tracking-widest">Structural Parent</span>
        <div className="flex items-center gap-2">
           <Layout className="w-3 h-3 text-primary/60" />
           <span className="text-[10px] font-bold text-foreground/80">{model.parentId || 'ROOT (Face)'}</span>
        </div>
      </div>

      {/* COORDINATES */}
      {canMove && (
        <InspectorCollapsible 
          title="Local Offset (Parent Relative)" 
          icon={Move}
          onHelp={() => onHelp?.('spatial')}
        >
          <div className="space-y-4 pt-2">
            {/* World Position Indicator */}
            <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-xs border border-dashed border-white/10 opacity-60">
               <span className="text-[6px] font-black uppercase text-foreground/40">World (Absolute):</span>
               <span className="text-[7px] font-mono font-bold">X: {worldPos?.x || 0}, Y: {worldPos?.y || 0}</span>
               <span className="text-[6px] font-bold text-accent italic ml-auto">UCA-Rel [{Math.round(pos?.x || 0)}, {Math.round(pos?.y || 0)}]</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={`text-[8px] uppercase font-bold tracking-tighter flex items-center gap-1 transition-colors ${isHighlighted('pos') ? 'text-amber-500' : 'text-foreground/60'}`}>
                  <span>Axis X (Horizontal)</span>
                </label>
                <input 
                  type="text" 
                  value={localX} 
                  onFocus={() => setFocusedAxis('x')}
                  onBlur={() => { setFocusedAxis(null); handleCommit('x', localX); }}
                  onChange={(e) => setLocalX(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCommit('x', localX); }}
                  className={`w-full bg-black/40 border ${isHighlighted('pos') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'border-outline'} rounded-sm p-2 text-[11px] font-mono text-foreground outline-none focus:border-primary/40 transition-all transition-colors duration-500`}
                  aria-label="Axis X (Horizontal)"
                />
              </div>
              <div className="space-y-1.5">
                <label className={`text-[8px] uppercase font-bold tracking-tighter flex items-center gap-1 transition-colors ${isHighlighted('pos') ? 'text-amber-500' : 'text-foreground/60'}`}>
                  <span>Axis Y (Vertical)</span>
                </label>
                <input 
                  type="text" 
                  value={localY} 
                  onFocus={() => setFocusedAxis('y')}
                  onBlur={() => { setFocusedAxis(null); handleCommit('y', localY); }}
                  onChange={(e) => setLocalY(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCommit('y', localY); }}
                  className={`w-full bg-black/40 border ${isHighlighted('pos') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'border-outline'} rounded-sm p-2 text-[11px] font-mono text-foreground outline-none focus:border-primary/40 transition-all transition-colors duration-500`}
                  aria-label="Axis Y (Vertical)"
                />
              </div>
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* GRID LOGIC (Era 7.2.3) */}
      {canScale && (
        <InspectorCollapsible 
          title="Grid Dimensionality" 
          icon={Grid3X3}
          onHelp={() => onHelp?.('dimensiones')}
        >
          <div className="space-y-1.5 pt-2">
            <label className="text-[8px] text-foreground/60 uppercase font-bold tracking-tighter">
              Column Span (Rack Width)
            </label>
            <div className="p-2 bg-white/5 border border-outline rounded-xs opacity-50 italic text-[9px]">
               Managed via UCA Grid Constraints (Phase 10.2)
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* SPATIAL CONSTRAINTS (Phase 4.3.1.b) */}
      {isUCA && !isRack && (
        <InspectorCollapsible 
          title="Hierarchical Constraints" 
          icon={Move}
          onHelp={() => onHelp?.('constraints')}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-2 bg-black/20 rounded-xs border border-outline">
              <span className="text-[9px] font-bold uppercase text-foreground/60 tracking-tighter">Clamp to Parent</span>
              <input 
                type="checkbox" 
                checked={localClamp}
                onChange={(e) => {
                  const val = e.target.checked;
                  setLocalClamp(val);
                  handleApplyConstraints({ clampToParent: val });
                }}
                className="w-4 h-4 rounded-xs border-outline bg-black/40 text-primary focus:ring-primary/40 transition-all cursor-pointer"
                aria-label="Clamp to parent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] uppercase font-bold text-foreground/60 tracking-tighter ml-1">
                Containment Margin (px)
              </label>
              <input 
                type="number" 
                value={localMargin}
                onChange={(e) => setLocalMargin(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(localMargin) || 0;
                  handleApplyConstraints({ margin: val });
                }}
                className="w-full bg-black/40 border border-outline rounded-sm p-2 text-[10px] font-mono text-foreground outline-none focus:border-primary/40 transition-colors"
                aria-label="Containment margin in pixels"
              />
            </div>
          </div>
        </InspectorCollapsible>
      )}

      {/* NO SPATIAL GOVERNANCE WARNING */}
      {!canMove && !canScale && (
        <div className="p-4 bg-white/5 border border-dashed wb-outline rounded-xs flex items-center gap-3 opacity-40">
           <Layout className="w-5 h-5" />
           <p className="text-[7px] wb-text-muted font-bold uppercase leading-tight italic">
              Spatial governance is locked for this element. Its position and size are managed by the internal rack engine.
           </p>
        </div>
      )}

      <InfoBlock 
        title="Industrial Note"
        icon={Info}
        message="Era 7.2 enforces strict architectural framing. Use containers to define columns and sections for studio parity."
        variant="primary"
        className="mt-6"
      />
    </div>
  );
}
