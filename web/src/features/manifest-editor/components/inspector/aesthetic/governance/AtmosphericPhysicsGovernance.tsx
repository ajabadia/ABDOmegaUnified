'use client';

/**
 * @purpose Gestiona una sección colapsable para configurar física atmosférica y ajustes ambientales en el editor de manifesto OMEGA.
 * @purpose_en Manages a collapsible section for configuring atmospheric physics and environmental settings in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:6p8j7s
 * @lastUpdated 2026-06-17T22:31:00.869Z
 */

import { Sun, CornerRightDown } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../../shared/InspectorCollapsible';
import { useDesignTokens } from '@/omega-ui-core/hooks/useDesignTokens';

interface AtmosphericPhysicsGovernanceProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

type LightingConfig = NonNullable<OMEGA_Manifest['ui']['lighting']>;

// Removed unused ColorTokenInput

export default function AtmosphericPhysicsGovernance({ manifest, onUpdate, resolveAsset }: AtmosphericPhysicsGovernanceProps) {
  const { physics } = useDesignTokens(manifest);
  const lighting = (manifest.ui?.lighting || { 
    shadowAngle: 135, 
    ambientIntensity: 0.5, specularIntensity: 0.2, 
    surfaceGrain: 0.1, opacity: 1, globalBlur: 0 
  }) as LightingConfig;
  const colors = manifest.ui?.colors || { accent: '#00f2ff', weak: '#555555', surface: '#1a1c1e', text: '#ffffff' };
  
  const updateLighting = (updates: Partial<LightingConfig>) => {
    onUpdate({ ui: { ...manifest.ui, lighting: { ...lighting, ...updates } } });
  };
  
  const faceplate = manifest.ui?.faceplate;
  const bgUrl = typeof faceplate === 'string' ? resolveAsset(faceplate) : resolveAsset((faceplate as Record<string, string> | undefined)?.['MAIN']);

  return (
    <InspectorCollapsible title="Atmospheric Physics & Environment" icon={Sun}>
      <div className="space-y-6 pt-2">
        {/* ATMOSPHERIC SIMULATOR */}
        <div className="p-8 bg-black/60 border wb-outline rounded-xs flex flex-col items-center gap-6">
           <div className="flex flex-col items-center gap-2">
              <span className="text-[7px] font-black uppercase text-accent animate-pulse tracking-[0.3em]">Atmospheric Simulator</span>
              <div 
                className="w-24 h-24 rounded-lg border-2 border-white/5 transition-all duration-300 relative overflow-hidden flex items-center justify-center"
                style={{ 
                  backgroundColor: colors.surface,
                  opacity: lighting.opacity ?? 1,
                  filter: `blur(${lighting.globalBlur ?? 0}px)`,
                  boxShadow: `inset 0 0 40px rgba(255,255,255,${(lighting.ambientIntensity ?? 0.5) * 0.1})`
                }}
              >
                {bgUrl && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-80"
                    style={{ backgroundImage: `url(${bgUrl})` }}
                  />
                )}
                {/* GRAIN OVERLAY */}
                {(lighting.surfaceGrain ?? 0) > 0 && (
                   <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" style={{ opacity: lighting.surfaceGrain }} />
                )}
                
                {/* DUMMY OBJECT */}
                <div 
                   className="w-10 h-10 rounded-full border border-white/10 bg-white/10 relative z-10" 
                   style={{ 
                     filter: physics.filter,
                     backgroundColor: '#555555',
                     boxShadow: `0 0 10px rgba(255,255,255,${lighting.specularIntensity ?? 0.2})`
                   }}
                />
              </div>
           </div>
           
           <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* PRIMARY LIGHTING */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-primary" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary">Primary Illumination</span>
                 </div>

                 {/* ANGLE */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[7px] font-black uppercase wb-text-muted">Light Angle</label>
                       <span className="text-[8px] font-mono text-accent">{lighting.shadowAngle}°</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <input 
                         type="range" min="0" max="360" value={lighting.shadowAngle} 
                         onChange={(e) => updateLighting({ shadowAngle: parseInt(e.target.value) })}
                         className="flex-1 h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                         aria-label="Light angle in degrees"
                       />
                       <CornerRightDown className="w-4 h-4 text-accent" style={{ transform: `rotate(${lighting.shadowAngle}deg)` }} />
                    </div>
                 </div>

                 {/* AMBIENT LIGHT */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[7px] font-black uppercase wb-text-muted">Ambient Light Intensity</label>
                       <span className="text-[8px] font-mono text-accent">{(lighting.ambientIntensity ?? 0.5).toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.05" value={lighting.ambientIntensity ?? 0.5} 
                      onChange={(e) => updateLighting({ ambientIntensity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                      aria-label="Ambient light intensity"
                    />
                 </div>
              </div>

              {/* MATERIAL PROPERTIES */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-accent" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-accent">Material Texture</span>
                 </div>

                 {/* GRAIN */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[7px] font-black uppercase wb-text-muted">Industrial Surface Grain</label>
                       <span className="text-[8px] font-mono text-accent">{(lighting.surfaceGrain ?? 0).toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.05" value={lighting.surfaceGrain ?? 0} 
                      onChange={(e) => updateLighting({ surfaceGrain: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                      aria-label="Industrial surface grain"
                    />
                 </div>

                 {/* SPECULAR */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[7px] font-black uppercase wb-text-muted">Edge Reflection (Specular)</label>
                       <span className="text-[8px] font-mono text-accent">{(lighting.specularIntensity ?? 0.2).toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.05" value={lighting.specularIntensity ?? 0.2} 
                      onChange={(e) => updateLighting({ specularIntensity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                      aria-label="Edge reflection specular intensity"
                    />
                 </div>
              </div>

              {/* GLASSMORPHISM */}
              <div className="col-span-full border-t border-outline/10 pt-4 mt-2 space-y-4">
                 <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-purple-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">Glassmorphism & Transparency</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[7px] font-black uppercase wb-text-muted">Global Opacity</label>
                          <span className="text-[8px] font-mono text-accent">{(lighting.opacity ?? 1).toFixed(2)}</span>
                       </div>
                       <input 
                         type="range" min="0" max="1" step="0.05" value={lighting.opacity ?? 1} 
                         onChange={(e) => updateLighting({ opacity: parseFloat(e.target.value) })}
                         className="w-full h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                         aria-label="Global opacity"
                       />
                    </div>

                    <div className="space-y-1.5">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[7px] font-black uppercase wb-text-muted">Backdrop Blur</label>
                          <span className="text-[8px] font-mono text-accent">{lighting.globalBlur ?? 0}px</span>
                       </div>
                       <input 
                         type="range" min="0" max="20" value={lighting.globalBlur ?? 0} 
                         onChange={(e) => updateLighting({ globalBlur: parseInt(e.target.value) })}
                         className="w-full h-1 bg-outline/20 rounded-full appearance-none cursor-pointer accent-accent"
                         aria-label="Backdrop blur in pixels"
                       />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </InspectorCollapsible>
  );
}
