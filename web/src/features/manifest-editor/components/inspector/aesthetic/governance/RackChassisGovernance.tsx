'use client';

/**
 * @purpose Gestiona y renderiza configuraciones de gobierno para el hardware del bastidor de rack en el editor de manifesto OMEGA, incluyendo conteo de tornillos, desplazamiento, selección de estilo y resolución de activos.
 * @purpose_en Manages and renders governance settings for rack chassis hardware in the OMEGA manifest editor, including screw count, offset, style selection, and asset resolution.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:h9hj8i
 * @lastUpdated 2026-06-17T22:31:16.978Z
 */

import React from 'react';
import { Settings, HardDrive, Layers } from 'lucide-react';
import type { OMEGA_Manifest, StyleVariant } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../../shared/InspectorCollapsible';
import ColorTokenInput from '../../shared/ColorTokenInput';
// Removed unused AssetSelector

interface MasterHardwareGovernanceProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

interface ScrewItem {
  id: string;
  name?: string;
  path?: string;
  type?: string;
}

export default function MasterHardwareGovernance({ manifest, onUpdate, resolveAsset }: MasterHardwareGovernanceProps) {
  const [objectLibrary, setObjectLibrary] = React.useState<unknown>(null);
  
  React.useEffect(() => {
    fetch('/assets/library-registry.json')
      .then(res => res.json())
      .then(data => setObjectLibrary(data))
      .catch(err => console.error("Error loading object library:", err));
  }, []);

  const hardware = (manifest.ui.hardware || { 
    screwCount: 4,
    screwMapping: [],
    screwOffset: 8,
    railStyle: 'industrial', 
    railColor: '#333333', 
    showRails: true 
  }) as NonNullable<OMEGA_Manifest['ui']['hardware']>;

  const updateHardware = (updates: Partial<NonNullable<OMEGA_Manifest['ui']['hardware']>>) => {
    onUpdate({ ui: { ...manifest.ui, hardware: { ...hardware, ...updates } } });
  };

  // Removed unused updatePalette

  // Merge library styles with physical object library
  const libraryScrews = manifest.ui?.styles?.['mounting-screw'] || [];
  const physicalScrews = ((objectLibrary as Record<string, unknown>)?.decor as Record<string, unknown>)?.screws as ScrewItem[] || [];
  
  const allAvailableScrews = [
    ...libraryScrews.map((s: { id: string }) => ({ id: s.id, name: s.id.toUpperCase(), type: 'style' })),
    ...physicalScrews.map((s: ScrewItem) => ({ id: s.id, name: s.name || s.id, type: 'physical', path: s.path }))
  ];

  const railStyles: ('none' | 'slim' | 'heavy' | 'industrial')[] = ['none', 'slim', 'heavy', 'industrial'];

  const screwPositions = React.useMemo(() => {
    const count = hardware.screwCount || 4;
    if (count === 4) return ['Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'];
    if (count === 6) return ['Top-Left', 'Top-Mid', 'Top-Right', 'Bottom-Left', 'Bottom-Mid', 'Bottom-Right'];
    return ['Top-Left', 'T-Mid-L', 'T-Mid-R', 'Top-Right', 'Bottom-Left', 'B-Mid-L', 'B-Mid-R', 'Bottom-Right'];
  }, [hardware.screwCount]);

  const updateScrewMap = (index: number, styleId: string) => {
    const newMap = [...(hardware.screwMapping || [])];
    // Fill with empty strings if map is shorter than index
    while (newMap.length <= index) newMap.push('');
    newMap[index] = styleId;
    updateHardware({ screwMapping: newMap });
  };

  return (
    <div className="space-y-6">
      {/* 1. MOUNTING HARDWARE (SCREWS) */}
      <InspectorCollapsible title="Master Mounting Hardware" icon={Settings}>
        <div className="space-y-6 pt-2">
           <div className="flex items-center justify-between p-4 bg-black/20 border wb-outline rounded-xs">
              <div className="space-y-1">
                 <span className="text-[10px] font-black uppercase text-foreground">Hardware Quantity</span>
                 <p className="text-[7px] wb-text-muted font-bold uppercase italic leading-none">Eurorack mounting point density</p>
              </div>
              <div className="flex gap-1">
                 {[0, 4, 6, 8].map(count => (
                   <button
                     key={count}
                     onClick={() => updateHardware({ screwCount: count as 0 | 4 | 6 | 8 })}
                     aria-label={`Set screw count to ${count}`}
                     className={`px-4 py-1.5 border rounded-xs text-[8px] font-black transition-all ${hardware.screwCount === count ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-black/40 border-outline/10 text-foreground/40 hover:border-primary/20'}`}
                   >
                     {count} PTS
                   </button>
                 ))}
              </div>
           </div>

           {/* EURORACK SCREW OFFSET */}
           <div className="space-y-1.5 p-3 bg-black/20 border wb-outline rounded-xs">
              <div className="flex justify-between items-center px-1">
                 <label className="text-[7px] font-black uppercase wb-text-muted">Corner Offset (Eurorack Standard)</label>
                 <span className="text-[8px] font-mono text-accent">{hardware.screwOffset || 8}px</span>
              </div>
              <div className="flex items-center gap-4">
                 <input 
                   type="range" min="0" max="40" step="1"
                   value={hardware.screwOffset ?? 8} 
                   onChange={(e) => updateHardware({ screwOffset: parseInt(e.target.value) })}
                   className="flex-1 h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                   aria-label="Screw corner offset in pixels"
                 />
                 <div className="flex gap-0.5">
                    {[4, 8, 12, 16].map(val => (
                      <button
                        key={val}
                        onClick={() => updateHardware({ screwOffset: val })}
                        aria-label={`Set screw offset to ${val}px`}
                        className={`w-6 h-4 flex items-center justify-center text-[5px] font-black border rounded-xs transition-all ${hardware.screwOffset === val ? 'bg-accent text-black border-accent' : 'bg-black/40 border-outline/20 text-foreground/40 hover:border-accent/40'}`}
                      >
                         {val}px
                      </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* GRANULAR SCREW ASSIGNMENT */}
           <div className="space-y-3 p-4 bg-black/20 border wb-outline rounded-xs">
              <div className="flex items-center gap-2 mb-2">
                 <Layers className="w-3 h-3 text-primary" />
                 <span className="text-[9px] font-black uppercase text-primary">Granular Hardware Assignment</span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                 {screwPositions.map((pos, idx) => (
                   <div key={`${pos}-${idx}`} className="space-y-1.5">
                      <label className="text-[6px] font-black uppercase wb-text-muted px-1">{pos} Position</label>
                      <select 
                        value={hardware.screwMapping?.[idx] || ''}
                        onChange={(e) => updateScrewMap(idx, e.target.value)}
                        className="w-full bg-black/40 border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-black uppercase text-foreground outline-none focus:border-primary/40 transition-all cursor-pointer appearance-none"
                      >
                         <option value="">(Default Screw)</option>
                         {allAvailableScrews.map(style => (
                           <option key={style.id} value={style.id}>{style.name} {style.type === 'physical' ? '📦' : '🎨'}</option>
                         ))}
                      </select>
                   </div>
                 ))}
              </div>

              {/* PHYSICAL OBJECT PREVIEWS */}
              {physicalScrews.length > 0 && (
                <div className="mt-6 space-y-3">
                   <div className="flex items-center justify-between">
                      <span className="text-[7px] font-black uppercase text-primary tracking-widest">Physical Object Library (Screws)</span>
                      <span className="text-[6px] wb-text-muted font-bold uppercase italic">From: /assets/elements/decor/screws</span>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                      {physicalScrews.map((s: ScrewItem) => (
                        <div key={s.id} className="p-2 bg-black/40 border wb-outline rounded-xs flex flex-col items-center gap-1 group hover:border-primary/40 transition-all">
                           <div className="w-full aspect-square bg-black/60 rounded-xs flex items-center justify-center p-1 border border-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element -- Catalog previews use dynamic local/user asset paths; next/image adds no useful optimization here. */}
                              <img src={s.path} className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" alt={s.name} />
                           </div>
                           <span className="text-[5px] font-black uppercase tracking-tighter truncate w-full text-center">{s.name}</span>
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>
      </InspectorCollapsible>

      {/* 2. ARCHITECTURAL RAILS */}
      <InspectorCollapsible title="Chassis Edge Rails" icon={HardDrive}>
        <div className="space-y-6 pt-2">
           <div className="flex items-center justify-between px-1">
              <div className="flex flex-col gap-0.5">
                 <span className="text-[9px] font-black uppercase text-foreground">Visibility Status</span>
                 <span className="text-[6px] wb-text-muted font-bold uppercase italic">Show structural rails</span>
              </div>
              <button 
                onClick={() => updateHardware({ showRails: !hardware.showRails })}
                aria-label={hardware.showRails ? 'Hide structural rails' : 'Show structural rails'}
                className={`px-4 py-1.5 rounded-xs border text-[7px] font-black uppercase transition-all ${hardware.showRails ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-black/40 border-outline/20 text-foreground/40'}`}
              >
                {hardware.showRails ? 'Active' : 'Disabled'}
              </button>
           </div>

           {hardware.showRails && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[7px] font-black uppercase wb-text-muted px-1">Rail Profile</label>
                       <div className="grid grid-cols-2 gap-1">
                          {railStyles.map(style => (
                            <button
                              key={style}
                              onClick={() => updateHardware({ railStyle: style })}
                              aria-label={`Set rail profile to ${style}`}
                              className={`py-1.5 border rounded-xs text-[6px] font-black uppercase transition-all ${hardware.railStyle === style ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-black/20 wb-outline wb-text-muted hover:border-accent/20'}`}
                            >
                               {style}
                            </button>
                          ))}
                       </div>
                    </div>
                    <ColorTokenInput 
                       label="Rail Oxidation" 
                       value={hardware.railColor || '#333333'} 
                       onChange={(v) => updateHardware({ railColor: v })} 
                    />
                 </div>
                 {/* SCREW STYLE LIBRARY SELECTOR */}
                 <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[7px] font-black uppercase text-primary tracking-widest">Master Hardware Style (Library)</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                       {(manifest.ui?.styles?.['rack-screw'] || []).map((style: StyleVariant) => {
                         const isActive = hardware.variant === style.id;
                         const sAsset = style.aesthetics?.asset;
                         const sColor = style.aesthetics?.color || '#ffffff';
                         const sUrl = resolveAsset(sAsset);

                         return (
                           <button
                             key={style.id}
                             onClick={() => updateHardware({ variant: style.id })}
                             aria-label={`Select hardware style: ${style.label}`}
                             className={`
                               p-1.5 border rounded-xs flex flex-col gap-1.5 items-center transition-all group
                               ${isActive ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(0,242,255,0.15)]' : 'bg-black/40 wb-outline hover:border-primary/40'}
                             `}
                           >
                             <div className="w-8 h-8 rounded-full overflow-hidden border border-white/5 relative flex items-center justify-center bg-black/40 shadow-inner">
                               {sUrl ? (
                                 // eslint-disable-next-line @next/next/no-img-element -- Style thumbnails are dynamic registry assets previewed inside the editor.
                                 <img src={sUrl} className="w-6 h-6 object-contain" alt={style.label} />
                               ) : (
                                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sColor }} />
                               )}
                             </div>
                             <span className={`text-[5px] font-black uppercase truncate w-full text-center ${isActive ? 'text-primary' : 'wb-text-muted'}`}>
                               {style.label}
                             </span>
                           </button>
                         );
                       })}
                    </div>
                 </div>
              </div>
           )}
        </div>
      </InspectorCollapsible>
    </div>
  );
}
