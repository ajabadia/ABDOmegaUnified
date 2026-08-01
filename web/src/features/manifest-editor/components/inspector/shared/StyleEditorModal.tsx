'use client';

/**
 * @purpose Renderiza un modal para editar variantes de estilo en el editor de manifesto OMEGA, permitiendo a los usuarios visualizar y actualizar estilos a través de múltiples pestañas y controles.
 * @purpose_en Renders a modal for editing style variants in the OMEGA manifest editor, allowing users to visualize and update styles through multiple tabs and controls.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:10,sig:1msvpjk
 * @lastUpdated 2026-06-20T09:18:28.027Z
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, Save, RefreshCcw, ShieldCheck, Box, Layout } from 'lucide-react';
import type { OMEGA_Manifest, ManifestEntity, StyleVariant, LayoutContainer, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import IndustrialGovernanceConsole from './IndustrialGovernanceConsole';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { useDesignTokens } from '@/omega-ui-core/hooks/useDesignTokens';
import { getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';
import IndustrialContainer from '../../shared/IndustrialContainer';
import { adaptManifestEntityToNode } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

interface StyleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  style: StyleVariant;
  onUpdate: (updates: Partial<OmegaStyleNode>) => void;
  manifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
  onOpenConfig?: (() => void) | undefined;
}

/**
 * CANONICAL PREVIEWER
 * Ensures 100% parity by using the same rendering engine as the Virtual Rack.
 */
function CanonicalStylePreview({ 
  type, aesthetics, manifest, resolveAsset 
}: { 
  type: string, aesthetics: Partial<OmegaStyleNode>, manifest: OMEGA_Manifest, resolveAsset: (id: string | undefined) => string | undefined 
}) {
  const def = getElementDefinition(type);
  
  // Create a phantom entity for the renderer
  const phantomEntity: ManifestEntity = {
    id: 'preview-phantom',
    type: type,
    role: 'telemetry',
    label: 'Preview Phantom',
    size: { width: 320, height: 224, w: 320, h: 224 },
    bind: 'none',
    pos: { x: 0, y: 0 },
    presentation: {
      component: type,
      variant: 'default',
      style: aesthetics,
      size: { width: 320, height: 224, w: 320, h: 224 },
      tab: 'MAIN',
      attachments: [],
      offsetX: 0,
      offsetY: 0
    }
  };

  useDesignTokens(manifest, phantomEntity);

  const isStructure = def?.category === 'infrastructure' || def?.category === 'rack' || def?.id === 'container' || def?.id === 'group';

  if (isStructure) {
    return (
      <IndustrialContainer 
        container={phantomEntity as unknown as LayoutContainer}
        manifest={manifest}
        resolveAsset={resolveAsset}
        className="w-80 h-56 shadow-2xl"
      />
    );
  }

  // Use the Aseptic CellRenderer for Controls/Telemetry
  return (
    <div className="relative scale-[2.0] flex items-center justify-center text-white forced-dark-context">
       <div 
          dangerouslySetInnerHTML={{ 
            __html: CellRenderer.renderCellHTML(adaptManifestEntityToNode(phantomEntity), {
              skin: 'industrial',
              zoom: 1.0,
              runtimeValue: 0.5,
              steps: 100,
              manifest,
              resolveAsset
            }) 
          }}
       />
    </div>
  );
}

export default function StyleEditorModal({ 
  isOpen, onClose, type, style, onUpdate, manifest, resolveAsset 
}: StyleEditorModalProps) {
  const [activeTab, setActiveTab] = React.useState<'fragments' | 'properties'>('fragments');
  const [activeFragment, setActiveFragment] = React.useState<'host' | 'label'>('host');

  if (!isOpen || !style) return null;

  // Determine which capabilities to show based on fragment selection
  const getFilteredCapabilities = () => {
    if (activeFragment === 'label') return ['font', 'fontSize', 'fontColor', 'alignment', 'spacing', 'labelX', 'labelY', 'labelW', 'labelH', 'labelBg', 'labelRounding', 'labelPadding'];
    return ['color', 'indicatorColor', 'rounding', 'borderWidth', 'opacity', 'asset', 'blur', 'shadow', 'intensity', 'zIndex'];
  };

  const filteredCaps = getFilteredCapabilities();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 overflow-hidden">
        {/* BACKDROP */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />

        {/* MODAL CONTAINER */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl max-h-[90vh] wb-bg border-2 wb-outline rounded-xs shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden wb-text"
        >
          {/* INDUSTRIAL HEADER */}
          <div className="px-6 py-4 border-b-2 wb-outline wb-surface-subtle flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xs border-2 border-primary/20 bg-primary/5 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-[12px] font-black uppercase wb-text tracking-[0.2em]">Industrial Style Governance</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-primary/60 uppercase">{type}</span>
                  <span className="text-[8px] font-black wb-text-muted opacity-20">/</span>
                  <span className="text-[8px] font-mono wb-text-muted uppercase">{style.label}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-xs transition-colors group"
              aria-label="Close style editor"
            >
              <X className="w-5 h-5 wb-text-muted group-hover:wb-text transition-colors" />
            </button>
          </div>

          {/* MAIN CONFIGURATION AREA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 wb-bg">
            <div className="grid grid-cols-12 gap-10">
              
              {/* LEFT: ARCHITECTURAL BRIEFING & PREVIEW */}
              <div className="col-span-5 space-y-8">
                 <div className="space-y-4">
                    <label className="text-[8px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                       <ShieldCheck className="w-3 h-3" />
                       Aseptic Blueprint
                    </label>
                    <p className="text-[9px] wb-text-muted leading-relaxed italic border-l-2 border-primary/20 pl-4">
                       You are editing the master genetic sequence for this style. 
                       Compositions are made of fragments. Click a fragment to edit its properties.
                    </p>
                 </div>

                 {/* REAL-TIME PREVIEW VIEWER */}
                 <div 
                    className="aspect-square w-full bg-[#050505] border-2 wb-outline rounded-xs flex flex-col items-center justify-center gap-4 relative overflow-hidden shadow-inner cursor-pointer"
                    onClick={() => setActiveFragment('host')}
                  >
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                    
                    <div className="relative group">
                       <CanonicalStylePreview 
                        key={JSON.stringify(style.aesthetics) + activeFragment}
                        type={type} 
                        aesthetics={style.aesthetics} 
                        manifest={manifest} 
                        resolveAsset={resolveAsset}
                      />
                      
                      {/* INTERACTIVE HIT ZONE: LABEL */}
                      <div 
                        onClick={(e) => { e.stopPropagation(); setActiveFragment('label'); }}
                        className={`absolute border-2 transition-all cursor-pointer ${activeFragment === 'label' ? 'border-primary ring-4 ring-primary/20' : 'border-transparent hover:border-white/20'}`}
                        style={{
                          left: `${style.aesthetics.labelX || 0}px`,
                          top: `${style.aesthetics.labelY || 0}px`,
                          width: `${style.aesthetics.labelW || 40}px`,
                          height: `${style.aesthetics.labelH || 16}px`,
                          zIndex: 50
                        }}
                      />

                      {/* SELECTION OVERLAY: HOST */}
                      <div className={`absolute inset-0 border-2 border-primary/40 rounded-xs pointer-events-none transition-opacity ${activeFragment === 'host' ? 'opacity-100' : 'opacity-0'}`} />
                    </div>

                    <div className="absolute bottom-4 left-0 w-full flex flex-col items-center opacity-30">
                       <div className="h-[1px] w-24 bg-primary/40 mb-2" />
                       <span className="text-[7px] font-black uppercase tracking-[0.4em] text-primary italic">Canonical Flex Preview</span>
                    </div>
                 </div>
              </div>

              {/* RIGHT: DUAL-TAB GOVERNANCE CONSOLE */}
              <div className="col-span-7 flex flex-col h-full space-y-4">
                 {/* TAB SELECTOR */}
                 <div className="flex items-center gap-1 p-1 wb-surface-inset border-2 wb-outline rounded-xs w-fit">
                    <button 
                       onClick={() => setActiveTab('fragments')}
                       className={`px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-xs transition-all ${activeTab === 'fragments' ? 'bg-primary text-black' : 'wb-text-muted hover:wb-text'}`}
                       aria-label="Fragments tab"
                    >
                       📑 Fragments
                    </button>
                    <button 
                       onClick={() => setActiveTab('properties')}
                       className={`px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-xs transition-all ${activeTab === 'properties' ? 'bg-primary text-black' : 'wb-text-muted hover:wb-text'}`}
                       aria-label="Properties tab"
                    >
                       🛠️ Properties
                    </button>
                 </div>

                 <div className="flex-1 wb-surface-inset border-2 wb-outline rounded-xs p-8 shadow-2xl overflow-y-auto custom-scrollbar">
                    {activeTab === 'fragments' ? (
                       <div className="space-y-6">
                          <div className="flex items-center justify-between border-b wb-outline pb-4">
                             <h3 className="text-[10px] font-black uppercase tracking-wider">Cell Composition Tree</h3>
                             <span className="text-[8px] font-mono wb-text-muted uppercase">Layers: 2</span>
                          </div>
                          
                          <div className="space-y-2">
                             {/* HOST FRAGMENT */}
                             <button 
                                onClick={() => { setActiveFragment('host'); setActiveTab('properties'); }}
                                className={`w-full flex items-center justify-between p-4 border-2 rounded-xs transition-all group ${activeFragment === 'host' ? 'border-primary bg-primary/5' : 'wb-outline wb-surface-subtle hover:border-primary/40'}`}
                                aria-label="Edit main architectural host fragment"
                             >
                                <div className="flex items-center gap-4">
                                   <div className={`w-8 h-8 rounded-xs border-2 flex items-center justify-center ${activeFragment === 'host' ? 'border-primary text-primary' : 'wb-outline wb-text-muted'}`}>
                                      <Box className="w-4 h-4" />
                                   </div>
                                   <div className="text-left">
                                      <span className={`block text-[10px] font-black uppercase ${activeFragment === 'host' ? 'text-primary' : ''}`}>Main Architectural Host</span>
                                      <span className="text-[7px] font-mono wb-text-muted uppercase">Surface, Borders, Background</span>
                                   </div>
                                </div>
                                <ShieldCheck className={`w-4 h-4 ${activeFragment === 'host' ? 'text-primary' : 'opacity-0'}`} />
                             </button>

                             {/* LABEL FRAGMENT */}
                             <button 
                                onClick={() => { setActiveFragment('label'); setActiveTab('properties'); }}
                                className={`w-full flex items-center justify-between p-4 border-2 rounded-xs transition-all group ${activeFragment === 'label' ? 'border-primary bg-primary/5' : 'wb-outline wb-surface-subtle hover:border-primary/40'}`}
                                aria-label="Edit primary branding fragment"
                             >
                                <div className="flex items-center gap-4">
                                   <div className={`w-8 h-8 rounded-xs border-2 flex items-center justify-center ${activeFragment === 'label' ? 'border-primary text-primary' : 'wb-outline wb-text-muted'}`}>
                                      <Layout className="w-4 h-4" />
                                   </div>
                                   <div className="text-left">
                                      <span className={`block text-[10px] font-black uppercase ${activeFragment === 'label' ? 'text-primary' : ''}`}>Primary Branding Fragment</span>
                                      <span className="text-[7px] font-mono wb-text-muted uppercase">Typography, Spatiality, Surface</span>
                                   </div>
                                </div>
                                <ShieldCheck className={`w-4 h-4 ${activeFragment === 'label' ? 'text-primary' : 'opacity-0'}`} />
                             </button>
                          </div>
                       </div>
                    ) : (
                       <div className="space-y-6">
                          <div className="flex items-center justify-between border-b wb-outline pb-4 mb-6">
                             <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-xs bg-primary/10 flex items-center justify-center">
                                   {activeFragment === 'host' ? <Box className="w-3.5 h-3.5 text-primary" /> : <Layout className="w-3.5 h-3.5 text-primary" />}
                                </span>
                                <h3 className="text-[10px] font-black uppercase tracking-wider">Editing: {activeFragment.toUpperCase()}</h3>
                             </div>
                             <button onClick={() => setActiveTab('fragments')} aria-label="Back to fragment tree" title="Back to fragment tree" className="text-[7px] font-black uppercase text-primary hover:underline">Back to tree</button>
                          </div>
                          
                          <IndustrialGovernanceConsole 
                             type={type}
                             values={style.aesthetics}
                             manifest={manifest}
                             onUpdate={(updates) => onUpdate(updates)}
                             resolveAsset={resolveAsset}
                             title={`${activeFragment.toUpperCase()} Parameters`}
                             // Injected for filtering
                             forcedCapabilities={filteredCaps}
                          />
                       </div>
                    )}
                 </div>
              </div>

            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="px-6 py-4 border-t-2 wb-outline wb-surface-subtle flex items-center justify-between">
             <button 
               onClick={() => onUpdate({})} 
               aria-label="Reset style to defaults"
               className="flex items-center gap-2 px-4 py-2 text-[8px] font-black uppercase wb-text-muted hover:wb-text transition-colors"
             >
                <RefreshCcw className="w-3 h-3" />
                Reset Defaults
             </button>

             <button 
               onClick={onClose}
               aria-label="Apply style changes and close"
               className="flex items-center gap-2 px-8 py-2 bg-primary text-black text-[10px] font-black uppercase rounded-xs hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
             >
                <Save className="w-4 h-4" />
                Apply Genetics
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

