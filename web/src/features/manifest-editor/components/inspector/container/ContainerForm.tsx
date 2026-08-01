'use client';

/**
 * @purpose Renderiza una forma para editar propiedades de un contenedor en el editor de manifesto OMEGA, incluyendo selección de estilo, posición, tamaño, anclaje de etiquetas y asignación de plano arquitectónico.
 * @purpose_en Renders a form for editing properties of a container in the OMEGA manifest editor, including style selection, position, size, label anchoring, and architectural plane assignment.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1c7eyd5
 * @lastUpdated 2026-06-17T22:33:19.825Z
 */

import { Move, Maximize2, Type, Layers } from 'lucide-react';
import type { LayoutContainer, ContainerSizeUnit, OMEGA_Manifest } from '@/types/manifest';
import TabSelector from '../shared/TabSelector';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface ContainerFormProps {
  container: LayoutContainer;
  onUpdate: (id: string, updates: Partial<LayoutContainer>) => void;
  manifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function ContainerForm({ container, onUpdate, manifest, setActiveSection }: Omit<ContainerFormProps, 'resolveAsset'>) {
  const containerStyles = manifest.ui?.styles?.['container'] || [];
  const currentStyleId = container.variant || 'default';
  const currentStyle = containerStyles.find(s => s.id === currentStyleId) || { id: 'default', label: 'Default Style' };
  const widthUnits: ContainerSizeUnit[] = ['full', '3/4', '2/3', '1/2', '1/3', '1/4'];

  return (
    <div className="p-4 pt-0 space-y-4">
      {/* 1. STYLE LIBRARY SELECTOR */}
      <div className="pt-4 border-t border-outline/5 space-y-3">
        <label className="text-[8px] text-primary font-black flex items-center gap-1.5 uppercase tracking-wider">
          <Layers className="w-3 h-3" />
          <span>Container Style Library</span>
        </label>
        
        {containerStyles.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {containerStyles.map(s => (
              <button
                key={s.id}
                aria-label={`Select container style: ${s.label}`}
                onClick={() => onUpdate(container.id, { 
                  variant: s.id,
                  // Purge local overrides to force style library inheritance
                  color: undefined,
                  indicatorColor: undefined,
                  asset: undefined,
                  rounding: undefined,
                  borderWidth: undefined,
                  opacity: undefined,
                  fontSize: undefined,
                  fontColor: undefined,
                  font: undefined
                } as Partial<LayoutContainer>)}
                className={`py-2 px-3 rounded-xs border text-[9px] font-black uppercase transition-all text-left flex items-center justify-between ${currentStyleId === s.id ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]' : 'wb-surface-subtle wb-outline wb-text-muted hover:wb-text'}`}
              >
                <span>{s.label}</span>
                {currentStyleId === s.id && <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-black/20 border border-dashed border-outline/20 rounded-xs text-center">
            <p className="text-[7px] wb-text-muted font-bold uppercase italic">
              No container styles defined.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline/5">
        {/* POSITION */}
        <div className="space-y-2">
           <div className="flex items-center gap-2 opacity-40">
             <Move className="w-2.5 h-2.5" />
             <span className="text-[7px] font-black uppercase tracking-widest">Base Coordinates</span>
           </div>
           <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-black/40 border border-outline/10 rounded-xs px-2 py-1">
                 <span className="text-[7px] font-bold opacity-30 w-4">X</span>
                 <input 
                   type="number" 
                   value={container.pos.x} 
                   onChange={(e) => onUpdate(container.id, { pos: { ...container.pos, x: parseInt(e.target.value) } })}
                   className="bg-transparent text-[9px] font-mono text-primary w-full outline-none" 
                   aria-label="Container X position"
                 />
              </div>
              <div className="flex-1 flex items-center bg-black/40 border border-outline/10 rounded-xs px-2 py-1">
                 <span className="text-[7px] font-bold opacity-30 w-4">Y</span>
                 <input 
                   type="number" 
                   value={container.pos.y} 
                   onChange={(e) => onUpdate(container.id, { pos: { ...container.pos, y: parseInt(e.target.value) } })}
                   className="bg-transparent text-[9px] font-mono text-primary w-full outline-none" 
                   aria-label="Container Y position"
                 />
              </div>
           </div>
        </div>

        {/* SIZE */}
        <div className="space-y-2">
           <div className="flex items-center gap-2 opacity-40">
             <Maximize2 className="w-2.5 h-2.5" />
             <span className="text-[7px] font-black uppercase tracking-widest">Industrial Sizing</span>
           </div>
           <div className="flex gap-2">
              <select 
                value={typeof container.size.width === 'string' ? container.size.width : 'custom'} 
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdate(container.id, { size: { ...container.size, width: val === 'custom' ? 100 : val as ContainerSizeUnit } });
                }}
                className="flex-1 bg-black/40 border border-outline/10 rounded-xs px-2 py-1 text-[9px] font-bold text-primary outline-none"
              >
                {widthUnits.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                <option value="custom">PX</option>
              </select>
              <div className="flex-1 flex items-center bg-black/40 border border-outline/10 rounded-xs px-2 py-1">
                 <span className="text-[7px] font-bold opacity-30 w-4">H</span>
                 <input 
                   type="number" 
                   value={container.size.height} 
                   onChange={(e) => onUpdate(container.id, { size: { ...container.size, height: parseInt(e.target.value) } })}
                   className="bg-transparent text-[9px] font-mono text-primary w-full outline-none" 
                   aria-label="Container height in pixels"
                 />
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <div className="space-y-2">
            <div className="flex items-center gap-2 opacity-40">
              <Type className="w-2.5 h-2.5" />
              <span className="text-[7px] font-black uppercase tracking-widest">Label Anchor</span>
            </div>
            <select 
              value={container.labelPosition || 'top'} 
              onChange={(e) => onUpdate(container.id, { labelPosition: e.target.value as 'top' | 'bottom' | 'inside-top' | 'inside-bottom' })}
              className="w-full bg-black/40 border border-outline/10 rounded-xs px-2 py-1 text-[9px] font-bold text-primary outline-none"
            >
              {['top', 'bottom', 'inside-top', 'inside-bottom'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
         </div>
      </div>

      <div className="pt-4 border-t border-outline/5 space-y-2">
         <div className="flex items-center gap-2 opacity-40">
           <Layers className="w-2.5 h-2.5 text-accent" />
           <span className="text-[7px] font-black uppercase tracking-widest text-accent">Architectural Plane (Tab)</span>
         </div>
          <TabSelector 
            value={(container.tab as unknown as string) || 'MAIN'} 
            onChange={(val) => onUpdate(container.id, { tab: val })}
            availableTabs={manifest.ui?.layout?.planes || ['MAIN']}
          />
      </div>
      
      {/* STYLE GOVERNANCE LINK */}
      <div className="pt-4 border-t border-outline/5">
        <StyleLibraryLink 
          type="container"
          styleId={currentStyleId}
          styleLabel={currentStyle.label}
          setActiveSection={setActiveSection}
        />
      </div>
    </div>
  );
}
