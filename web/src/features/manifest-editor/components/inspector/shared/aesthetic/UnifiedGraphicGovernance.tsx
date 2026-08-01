'use client';

/**
 * @purpose Gestiona configuraciones para el gobierno de activos gráficos en el editor de manifesto OMEGA, incluyendo selección de variantes, modificación del modo y propiedades como zoom y desplazamientos.
 * @purpose_en Manages configurations for graphic asset governance in the OMEGA manifest editor, including selection of variants, mode switching, and properties like zoom and offsets.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:21jkcd
 * @lastUpdated 2026-06-20T09:18:07.430Z
 */

import { Image as ImageIcon, Film, Layers, Move, Maximize } from 'lucide-react';
import { getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';
import type { OMEGA_Manifest, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import AssetSelector from '../AssetSelector';
import InspectorCollapsible from '../InspectorCollapsible';
import SequenceAnatomyInspector from './SequenceAnatomyInspector'; 
import FittingGovernance from './FittingGovernance';

interface UnifiedGraphicGovernanceProps {
  type: string;
  values: Partial<OmegaStyleNode>;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
  manifest: OMEGA_Manifest;
  resolveAsset?: (id: string | undefined) => string | undefined;
}

export default function UnifiedGraphicGovernance({ 
  type, values, onChange, manifest, resolveAsset 
}: UnifiedGraphicGovernanceProps) {
  const def = getElementDefinition(type);
  if (!def || !def.capabilities.includes('asset')) return null;

  const supportedModes = def.supportedAssetModes || ['static'];
  const graphicMode = values.graphicMode || (supportedModes.includes('sequence') && (values.frames || 0) > 1 ? 'sequence' : 'static');

  const setGraphicMode = (mode: 'static' | 'sequence') => {
    onChange({ graphicMode: mode });
  };

  const hasVariant = def.capabilities.includes('variant');

  return (
    <InspectorCollapsible 
      title="Graphic Asset Governance" 
      icon={ImageIcon}
      defaultOpen={true}
    >
      <div className="space-y-6">
        {/* TOP LAYER: VARIANTS & MODES */}
        <div className="grid grid-cols-2 gap-4">
          {hasVariant && (
            <div className="space-y-2">
              <label className="text-[7px] font-black uppercase text-white/20 tracking-widest block">Visual Variant</label>
              <div className="px-2 py-1.5 bg-black/40 border border-white/5 rounded text-[8px] font-mono text-accent">
                {values.variant || 'default'}
              </div>
            </div>
          )}
          
          {supportedModes.length > 1 && (
            <div className="space-y-2">
              <label className="text-[7px] font-black uppercase text-white/20 tracking-widest block">Asset Nature</label>
              <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5 h-[26px]">
                {supportedModes.map(mode => (
                  <button
                    key={mode}
                    onClick={() => setGraphicMode(mode)}
                    aria-label={`Switch to ${mode} mode`}
                    className={`flex-1 rounded flex items-center justify-center gap-1.5 transition-all ${graphicMode === mode ? 'bg-accent text-black font-black' : 'text-white/40 hover:text-white/60 font-bold'}`}
                  >
                    {mode === 'static' ? <ImageIcon className="w-2.5 h-2.5" /> : <Film className="w-2.5 h-2.5" />}
                    <span className="text-[6px] uppercase tracking-tighter">{mode === 'static' ? 'Static' : 'Seq'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ASSET SELECTOR */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="text-[7px] font-black uppercase text-white/40 tracking-widest block">
            {graphicMode === 'static' ? 'Still Image' : 'Animation Filmstrip'}
          </label>
          <AssetSelector 
            manifest={manifest}
            selectedAssetId={values.asset}
            initialPath={graphicMode === 'sequence' ? 'lib:sequences' : 'lib:statics'}
            restrictToSequences={graphicMode === 'sequence'}
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
                if (metadata.mouseResponse !== undefined) updates.mouseResponse = metadata.mouseResponse;
                
                // If it's from the sequences folder, default mode to sequence
                if (metadata.path?.includes('sequences')) updates.mode = 'sequence';
              }
              onChange(updates);
            }}
            label="Primary Graphic Object"
          />
        </div>

        {/* SEQUENCE ANATOMY (Conditional) */}
        {graphicMode === 'sequence' && (
          <div className="animate-in slide-in-from-top-2 duration-300 pt-2 border-t border-white/5">
             <div className="flex items-center gap-2 mb-3">
                <Layers className="w-3 h-3 text-accent" />
                <span className="text-[8px] font-black uppercase text-white tracking-widest">Filmstrip Anatomy</span>
             </div>
             
             {/* BEHAVIOR & ANCHOR */}
             <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-[7px] font-black uppercase text-white/20">Behavior</label>
                  <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5 h-[26px]">
                    {['rotate', 'sequence'].map(m => (
                      <button
                        key={m}
                        onClick={() => onChange({ mode: m })}
                        aria-label={`Set behavior to ${m}`}
                        className={`flex-1 rounded text-[6px] font-black uppercase transition-all ${values.mode === m ? 'bg-accent/20 text-accent' : 'text-white/20 hover:text-white/40'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[7px] font-black uppercase text-white/20">Zero Anchor</label>
                  <input 
                    type="number"
                    value={values.zeroAnchor || 0}
                    onChange={(e) => onChange({ zeroAnchor: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/5 rounded px-2 h-[26px] text-[10px] font-mono text-accent outline-none"
                    aria-label="Zero anchor"
                  />
                </div>
             </div>

             <SequenceAnatomyInspector values={values} onChange={onChange} />
          </div>
        )}

        {/* FITTING (Optional) */}
        {def.capabilities.includes('fitting') && (
            <div className="pt-2 border-t border-white/5">
                <FittingGovernance 
                    value={values.fitting}
                    onChange={(fitting) => onChange({ fitting })}
                />
            </div>
        )}

        {/* UNIFIED SPATIAL CONTROLS */}
        <div className="pt-4 border-t border-white/5 space-y-4 bg-black/10 -mx-4 px-4 pb-2">
          <div className="grid grid-cols-2 gap-4">
            {/* SCALE / ZOOM */}
            <div className="space-y-2 col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-[8px] font-black uppercase text-white/40 flex items-center gap-1.5">
                  <Maximize className="w-2.5 h-2.5" /> Visual Zoom
                </label>
                <span className="text-[10px] font-mono text-accent">
                  {Math.round(((values.width || values.frameWidth || 48) / (values.frameWidth || 48)) * 100)}%
                </span>
              </div>
              <input 
                type="range" min="25" max="400" step="5"
                value={Math.round(((values.width || values.frameWidth || 48) / (values.frameWidth || 48)) * 100)}
                onChange={(e) => {
                  const scale = parseInt(e.target.value) / 100;
                  const fw = values.frameWidth || 48;
                  const fh = values.frameHeight || 48;
                  onChange({ 
                    width: Math.round(fw * scale),
                    height: Math.round(fh * scale)
                  });
                }}
                className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                aria-label="Visual zoom as percentage"
              />
            </div>

            {/* OFFSETS */}
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase text-white/40 flex items-center gap-1">
                <Move className="w-2 h-2" /> X Offset
              </label>
              <input 
                type="range" min="-100" max="100" step="1"
                value={values.offsetX || 0}
                onChange={(e) => onChange({ offsetX: parseInt(e.target.value) })}
                className="w-full accent-white/20 bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                aria-label="X offset"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase text-white/40 flex items-center gap-1">
                <Move className="w-2 h-2 rotate-90" /> Y Offset
              </label>
              <input 
                type="range" min="-100" max="100" step="1"
                value={values.offsetY || 0}
                onChange={(e) => onChange({ offsetY: parseInt(e.target.value) })}
                className="w-full accent-white/20 bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                aria-label="Y offset"
              />
            </div>
          </div>
        </div>
      </div>
    </InspectorCollapsible>
  );
}
