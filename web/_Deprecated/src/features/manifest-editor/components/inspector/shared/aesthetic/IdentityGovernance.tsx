'use client';

/**
 * @purpose Gestiona una sección colapsable para la gobernanza de identidad y activos en el editor de manifesto OMEGA, incluyendo selección de variantes, seleccionador de activos, estrategia de ajuste y configuraciones de filmstrip.
 * @purpose_en Manages a collapsible section for identity and asset governance in the OMEGA manifest editor, including variant selection, asset picker, fitting strategy, and filmstrip settings.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:r9ci9l
 * @lastUpdated 2026-06-20T09:17:26.249Z
 */

import { Fingerprint, Settings2 } from 'lucide-react';
import type { AestheticCapability } from '@/omega-ui-core/governance/ElementCatalog';
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';
import type { OMEGA_Manifest, OmegaStyleNode } from '@/types/manifest';
import AssetSelector from '../AssetSelector';
import FittingGovernance from './FittingGovernance';
import InspectorCollapsible from '../InspectorCollapsible';

interface IdentityGovernanceProps {
  type: string;
  values: Partial<OmegaStyleNode>;
  capabilities: AestheticCapability[];
  onChange: (updates: Partial<OmegaStyleNode>) => void;
  manifest: OMEGA_Manifest;
  resolveAsset?: (id: string | undefined) => string | undefined;
}

export default function IdentityGovernance({ 
  type, values, capabilities, onChange, manifest, resolveAsset 
}: IdentityGovernanceProps) {
  const def = OMEGA_ELEMENT_CATALOG.find(e => e.id === type);
  if (!def) return null;

  const hasVariant = capabilities.includes('variant');
  const hasAsset = capabilities.includes('asset');
  const hasFilmstrip = capabilities.includes('frames') || capabilities.includes('orientation') || capabilities.includes('mode');

  return (
    <InspectorCollapsible 
      title="Identity & Asset Governance" 
      icon={Fingerprint}
      defaultOpen={true}
    >
      <div className="space-y-4">
        {/* VARIANT SELECTION */}
        {hasVariant && (
          <div className="space-y-2">
            <label className="text-[7px] font-black uppercase text-foreground/40 tracking-widest">Visual Preset / Variant</label>
            <div className="grid grid-cols-2 gap-2">
               {/* This is a simplified variant picker, real one might be more complex */}
               <div className="px-2 py-1.5 bg-black/40 border border-white/5 rounded text-[8px] font-mono text-white/60">
                  {values.variant || 'default'}
               </div>
            </div>
          </div>
        )}

        {/* ASSET SELECTION */}
        {hasAsset && (
          <div className="pt-2 border-t border-white/5">
            <AssetSelector 
              manifest={manifest}
              selectedAssetId={values.asset}
              initialPath={def.defaultAssetPath}
              restrictToSequences={def.defaultAssetPath?.includes('sequences')}
              resolveAsset={resolveAsset || ((id) => id)}
              onSelect={(id, metadata) => {
                const updates: Partial<OmegaStyleNode> = { asset: id };
                if (metadata) {
                  if (metadata.frames !== undefined) updates.frames = metadata.frames;
                  if (metadata.frameWidth !== undefined) updates.frameWidth = metadata.frameWidth;
                  if (metadata.frameHeight !== undefined) updates.frameHeight = metadata.frameHeight;
                  if (metadata.orientation !== undefined) updates.orientation = metadata.orientation;
                  if (metadata.padding !== undefined) updates.padding = metadata.padding;
                  if (metadata.category !== undefined) updates.category = metadata.category;
                  if (metadata.polarity !== undefined) updates.polarity = metadata.polarity;
                  
                  // If it's from the sequences folder, default mode to sequence
                  if (metadata.path?.includes('sequences')) updates.mode = 'sequence';
                }
                onChange(updates);
              }}
              label="Modular Graphic Asset"
            />
          </div>
        )}

        {/* FITTING STRATEGY */}
        {capabilities.includes('fitting') && (
            <FittingGovernance 
                value={values.fitting}
                onChange={(fitting) => onChange({ fitting })}
            />
        )}

        {/* FILMSTRIP & SLAVE LOGIC (ERA 7.2.3 - High Fidelity Mapping) */}
        {hasFilmstrip && values.asset && (
          <div className="pt-3 mt-1 border-t border-dashed border-white/10 space-y-3">
             <div className="flex items-center gap-1.5 mb-2">
                <Settings2 className="w-2.5 h-2.5 text-accent" />
                <span className="text-[7px] font-black uppercase text-accent tracking-widest">Slave Logic Mapping</span>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[5px] font-bold uppercase text-foreground/40 tracking-widest">Behavior Mode</label>
                   <div className="flex bg-black/40 border border-white/5 rounded overflow-hidden">
                      {['rotate', 'sequence'].map(m => (
                        <button
                          key={m}
                          onClick={() => onChange({ mode: m })}
                          className={`flex-1 py-1 text-[6px] font-black uppercase transition-all ${values.mode === m ? 'bg-accent/20 text-accent' : 'text-white/20 hover:text-white/40'}`}
                        >
                          {m}
                        </button>
                      ))}
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[5px] font-bold uppercase text-foreground/40 tracking-widest">Strip Layout</label>
                   <div className="flex bg-black/40 border border-white/5 rounded overflow-hidden">
                      {['v', 'h'].map(o => (
                        <button
                          key={o}
                          onClick={() => onChange({ orientation: o as 'v' | 'h' })}
                          className={`flex-1 py-1 text-[6px] font-black uppercase transition-all ${values.orientation === o ? 'bg-accent/20 text-accent' : 'text-white/20 hover:text-white/40'}`}
                        >
                          {o === 'v' ? 'Vertical' : 'Horizontal'}
                        </button>
                      ))}
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[5px] font-bold uppercase text-foreground/40 tracking-widest">Total Frames</label>
                   <input 
                      type="number"
                      min="1"
                      value={values.frames || 1}
                      onChange={(e) => onChange({ frames: parseInt(e.target.value) || 1 })}
                      className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-[8px] font-mono text-accent outline-none"
                      aria-label="Total frames"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[5px] font-bold uppercase text-foreground/40 tracking-widest">Zero Anchor</label>
                   <input 
                      type="number"
                      value={values.zeroAnchor || 0}
                      onChange={(e) => onChange({ zeroAnchor: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-[8px] font-mono text-accent outline-none"
                      aria-label="Zero anchor"
                   />
                </div>
             </div>
             
             <div className="mt-2 text-[5px] font-mono text-foreground/40 leading-relaxed italic">
                {`// Logic: frame = zeroAnchor + (parent.value * range)`}
             </div>
          </div>
        )}
      </div>
    </InspectorCollapsible>
  );
}
