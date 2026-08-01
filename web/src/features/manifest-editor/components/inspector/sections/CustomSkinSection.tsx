'use client';

/**
 * @purpose Gestiona una sección para personalizar la piel y el estilo del editor de manifesto OMEGA, incluyendo configuraciones globales y biblioteca de elementos.
 * @purpose_en Manages a section for customizing the skin and style of an OMEGA manifest editor, including global settings and element library.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:7od8cg
 * @lastUpdated 2026-06-20T09:16:34.635Z
 */

import React from 'react';
import { Layers, Box, Palette, Type, Sun, ChevronDown, ChevronRight } from 'lucide-react';
import type { OMEGA_Manifest, StyleVariant } from '@/omega-ui-core/types/manifest';
import ModuleStyleLibrary from '../aesthetic/styles/ModuleStyleLibrary';

// Specialized Governance Imports
import ThemePaletteGovernance from '../aesthetic/governance/ThemePaletteGovernance';
import ModuleTypography from '../aesthetic/typography/ModuleTypography';
import AtmosphericPhysicsGovernance from '../aesthetic/governance/AtmosphericPhysicsGovernance';
import MasterHardwareGovernance from '../aesthetic/governance/RackChassisGovernance';

interface GlobalsAccordionProps {
  title: string;
  icon: React.ElementType;
  colorClass: string;
  children: React.ReactNode;
}

function GlobalsAccordion({ title, icon: Icon, colorClass, children }: GlobalsAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border border-white/5 rounded-xs bg-black/20 overflow-hidden">
      <div 
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-3 h-3 text-white/50" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
      </div>
      {isOpen && (
        <div className="p-3 border-t border-white/5 bg-[#0a0a0b]/40 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
 
interface CustomSkinSectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  activeRackTab: string;
  onOpenConfig?: (() => void) | undefined;
  forceTab?: CustomSubTab | undefined;
}
 
type CustomSubTab = 'globals' | 'elements';
 
export default function CustomSkinSection({ manifest, onUpdate, resolveAsset, activeRackTab, onOpenConfig, forceTab }: CustomSkinSectionProps) {
  const [localActiveTab, setLocalActiveTab] = React.useState<CustomSubTab>('elements');
  const activeTab = forceTab || localActiveTab;
 
  const tabs: { id: CustomSubTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'globals', label: 'Globals', icon: Box, color: 'text-accent' },
    { id: 'elements', label: 'Elements Library', icon: Layers, color: 'text-purple-400' },
  ];
 
  return (
    <div className="space-y-6">
      {/* SUB-NAVIGATION */}
      {!forceTab && (
        <div className="flex border-b wb-outline bg-black/20 rounded-t-xs overflow-hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setLocalActiveTab(tab.id)}
              aria-label={`Switch to ${tab.label} tab`}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 transition-all duration-300 relative group ${
                activeTab === tab.id 
                  ? 'bg-primary/10 text-foreground' 
                  : 'text-foreground/40 hover:bg-white/5 hover:text-foreground/60'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : 'opacity-40'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
              
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
              )}
            </button>
          ))}
        </div>
      )}
 
      {/* CONTENT AREA */}
      <div className="animate-in fade-in slide-in-from-right-2 duration-300">
        {activeTab === 'globals' && (
          <div className="space-y-4">
             {/* 1. CHROMATIC DNA */}
             <GlobalsAccordion title="Chromatic DNA" icon={Palette} colorClass="text-primary/80">
                <ThemePaletteGovernance manifest={manifest} onUpdate={onUpdate} />
             </GlobalsAccordion>

             {/* 2. GLOBAL TYPOGRAPHY */}
             <GlobalsAccordion title="Global Typography" icon={Type} colorClass="text-amber-400">
                <ModuleTypography manifest={manifest} onUpdate={onUpdate} />
             </GlobalsAccordion>

             {/* 3. ATMOSPHERIC PHYSICS */}
             <GlobalsAccordion title="Atmospheric Physics" icon={Sun} colorClass="text-accent">
                <AtmosphericPhysicsGovernance manifest={manifest} onUpdate={onUpdate} resolveAsset={resolveAsset} />
             </GlobalsAccordion>

             {/* 4. MASTER HARDWARE */}
             <GlobalsAccordion title="Master Hardware" icon={Box} colorClass="text-purple-400">
                <div className="space-y-4">
                   {/* MASTER FACEPLATE SKIN (FROM LIBRARY) */}
                   <div className="space-y-2">
                      <div className="flex items-center justify-between">
                         <span className="text-[7px] font-black uppercase text-primary tracking-widest">Defined Faceplates</span>
                         <span className="text-[6px] wb-text-muted font-bold uppercase italic">MAIN PLANE</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         {((manifest.ui.styles as Record<string, StyleVariant[]>)?.rack || []).map((style: StyleVariant) => {
                           const tabStyles = (manifest.ui.layout?.tabStyles || {}) as Record<string, string | undefined>;
                           const isActive = tabStyles.MAIN === style.id;
                           const bgAsset = style.aesthetics?.asset;
                           const bgColor = style.aesthetics?.color || '#1a1a1b';
                           const bgUrl = resolveAsset(bgAsset);

                           return (
                             <button 
                               key={style.id}
                               onClick={() => {
                                 const newTabStyles = { ...tabStyles, MAIN: style.id };
                                 onUpdate({ 
                                   ui: { 
                                     ...manifest.ui, 
                                     layout: { 
                                       ...manifest.ui.layout, 
                                       width: manifest.ui.layout?.width || 800,
                                       height: manifest.ui.layout?.height || 600,
                                       tabStyles: newTabStyles 
                                     } 
                                   }
                                 });
                               }}
                               aria-label={`Select ${style.label} faceplate`}
                               className={`
                                 p-1.5 border rounded-xs flex flex-col gap-1 items-center transition-all group
                                 ${isActive ? 'bg-primary/15 border-primary text-primary shadow-none' : 'wb-surface border wb-outline hover:border-primary/40'}
                               `}
                             >
                               <div className="w-full h-14 rounded-xs overflow-hidden border wb-outline relative bg-black/10">
                                 <div 
                                   className="absolute inset-0 transition-transform group-hover:scale-110"
                                   style={{
                                     backgroundColor: bgColor,
                                     backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
                                     backgroundSize: 'cover',
                                     backgroundPosition: 'center'
                                   }}
                                 />
                                 {isActive && (
                                   <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(0,242,255,1)]" />
                                 )}
                               </div>
                               <span className={`text-[6px] font-black uppercase truncate w-full text-center ${isActive ? 'text-primary' : 'wb-text-muted'}`}>
                                 {style.label}
                               </span>
                             </button>
                           );
                         })}

                         {/* FALLBACK: NO STYLES */}
                         {(!(manifest.ui.styles as Record<string, StyleVariant[]>)?.rack || (manifest.ui.styles as Record<string, StyleVariant[]>).rack.length === 0) && (
                           <div className="col-span-2 p-4 border border-dashed wb-outline flex flex-col items-center justify-center gap-1 opacity-40">
                             <Box className="w-4 h-4" />
                             <span className="text-[7px] font-black uppercase">No Styles Defined</span>
                           </div>
                         )}
                      </div>
                   </div>

                   <div className="h-px bg-white/5" />

                   {/* MECHANICAL COMPONENTS */}
                   <MasterHardwareGovernance manifest={manifest} onUpdate={onUpdate} resolveAsset={resolveAsset} />
                </div>
             </GlobalsAccordion>
          </div>
        )}
 
        {activeTab === 'elements' && (
          <ModuleStyleLibrary 
            manifest={manifest} 
            onUpdate={onUpdate} 
            resolveAsset={resolveAsset}
            activeTab={activeRackTab}
            onOpenConfig={onOpenConfig}
          />
        )}
      </div>
    </div>
  );
}
