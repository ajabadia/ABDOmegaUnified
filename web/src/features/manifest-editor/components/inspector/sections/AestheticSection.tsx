'use client';

/**
 * @purpose Renderiza una seccion para editar propiedades esteticas de componentes UI en el editor manifesto OMEGA.
 * @purpose_en Renders a section for editing aesthetic properties of UI components in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:17,sig:1etivao
 * @lastUpdated 2026-06-20T09:16:29.945Z
 */

import React from 'react';
import { Palette, Shield, Box, Terminal } from 'lucide-react';
import KnobProperties from '@/features/manifest-editor/components/inspector/primitives/KnobProperties';
import LedProperties from '@/features/manifest-editor/components/inspector/primitives/LedProperties';
import PortProperties from '@/features/manifest-editor/components/inspector/primitives/PortProperties';
import SliderProperties from '@/features/manifest-editor/components/inspector/primitives/SliderProperties';
import DisplayProperties from '@/features/manifest-editor/components/inspector/primitives/DisplayProperties';
import SwitchProperties from '@/features/manifest-editor/components/inspector/primitives/SwitchProperties';
import SelectProperties from '@/features/manifest-editor/components/inspector/primitives/SelectProperties';
import IllustrationProperties from '@/features/manifest-editor/components/inspector/primitives/IllustrationProperties';
import { getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';
import SourceCodeView from '@/features/manifest-editor/components/inspector/shared/SourceCodeView';
import type { ManifestEntity, OMEGA_Manifest, LayoutContainer, OmegaNode, Presentation, HybridEntityUpdate } from '@/omega-ui-core/types/manifest';
import { buildInspectorPatch } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';
import { adaptNodeToManifestEntity } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
import IndustrialGovernanceConsole from '@/features/manifest-editor/components/inspector/shared/IndustrialGovernanceConsole';
 
interface AestheticSectionProps {
  item: OmegaNode;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: HybridEntityUpdate) => void;
  onHelp?: ((sectionId: string) => void) | undefined;
  containers?: LayoutContainer[] | undefined;
  highlightPath?: (string | null) | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
  onOpenConfig?: (() => void) | undefined;
  setActiveSection?: ((s: string) => void) | undefined;
}
 
export default function AestheticSection({ 
  item: node, 
  manifest, 
  onUpdate, 
  resolveAsset,
  onOpenConfig: handleOpenConfig
}: AestheticSectionProps) {
  const item = adaptNodeToManifestEntity(node);
  const onLegacyUpdate = (u: Partial<ManifestEntity>) => {
    // This is a bridge: in Phase 19 we should eventually move to native OmegaNode updates
    onUpdate(u);
  };

  const [showSource, setShowSource] = React.useState(false);
  const isUCA = 'kind' in node;
  const componentType = isUCA ? node.cellRef || node.kind || 'knob' : (item.presentation?.component || 'knob');
  const elementDef = getElementDefinition(componentType);

  // Governance Filter: Dynamically check if this component has ANY aesthetic capabilities defined in the Catalog
  const hasAesthetics = (elementDef?.capabilities?.length || 0) > 0;
  
  const renderSpecializedEditor = () => {
    if (!hasAesthetics && elementDef) {
        return (
            <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xs flex items-center gap-3">
                <Shield className="w-5 h-5 text-amber-500/40" />
                <p className="text-[7px] text-amber-500/60 font-bold uppercase leading-tight italic">
                    This element is registered as <span className="text-amber-500 font-black">{elementDef.label}</span> but has no aesthetic overrides defined in the Era 7 Governance Contract.
                </p>
            </div>
        );
    }

    const commonProps = { item, manifest, onUpdate: onLegacyUpdate, resolveAsset };

    switch (componentType) {
      case 'knob': return <KnobProperties {...commonProps} resolveAsset={resolveAsset} />;
      case 'led': return <LedProperties {...commonProps} />;
      case 'port': return <PortProperties {...commonProps} resolveAsset={resolveAsset} />;
      case 'slider-v':
      case 'slider-h': return <SliderProperties {...commonProps} />;
      case 'display': return <DisplayProperties {...commonProps} />;
      case 'select': return <SelectProperties {...commonProps} />;
      case 'switch':
      case 'button': return <SwitchProperties {...commonProps} />;
      case 'illustration': return <IllustrationProperties {...commonProps} resolveAsset={resolveAsset} />;
      default: return (
        <div className="p-8 border border-dashed border-outline/10 rounded-xs flex flex-col items-center justify-center gap-3 opacity-30">
          <Box className="w-8 h-8" />
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest">Generic Component</p>
            <p className="text-[7px] font-bold mt-1 italic uppercase">No specialized aesthetics for &apos;{componentType}&apos;</p>
          </div>
        </div>
      );
    }
  };
 
  return (
    <div className="space-y-4 pb-20 pt-2">
      
      <InspectorCollapsible 
        title="Component Aesthetics" 
        icon={Palette}
      >
        <div className="pt-2 space-y-4">
          {/* CATALOG GOVERNANCE HEADER */}
          <div className="p-3 bg-black/40 border wb-outline rounded-xs space-y-2">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Shield className="w-3 h-3 text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-primary">{elementDef?.label || 'Custom Element'}</span>
                </div>
                <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                   <span className="text-[6px] font-black uppercase text-primary">{elementDef?.category || 'User'}</span>
                </div>
             </div>
             <p className="text-[7px] wb-text-muted font-bold uppercase leading-tight italic">
               {elementDef?.description || 'Unregistered UI primitive. Specialized governance may be limited.'}
             </p>
             <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => setShowSource(!showSource)}
                  aria-label={showSource ? 'Hide source view' : 'Show source view'}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-xs border transition-all ${showSource ? 'bg-accent/20 border-accent text-accent' : 'wb-surface-subtle wb-outline wb-text-muted hover:wb-text'}`}
                >
                   <Terminal className="w-2.5 h-2.5" />
                   <span className="text-[7px] font-black uppercase">Deep Audit (Source)</span>
                </button>
             </div>
          </div>

          {showSource && (
            <SourceCodeView data={item.presentation} title={elementDef?.label || 'Component'} />
          )}

          <div className="pt-2">
            {renderSpecializedEditor()}
          </div>

          {/* INDUSTRIAL GOVERNANCE CONSOLE (Era 7.2.3) */}
          <div className="pt-4 border-t border-outline/5 space-y-4">
             <IndustrialGovernanceConsole 
               type={componentType}
               values={isUCA ? (node.style || {}) as Record<string, unknown> : item.presentation?.style || {}}
               manifest={manifest}
               onUpdate={(updates) => {
                 if (isUCA) {
                   onUpdate(buildInspectorPatch(node, { style: updates }));
                 } else {
                    if (!item.presentation) return;
                    onLegacyUpdate({ 
                      presentation: { 
                        ...item.presentation, 
                        style: { ...(item.presentation?.style || {}), ...updates } 
                      } as Presentation
                    });
                 }
               }}
               resolveAsset={resolveAsset}
               title="High Fidelity Overrides"
               onOpenConfig={handleOpenConfig}
             />
          </div>
        </div>
      </InspectorCollapsible>
    </div>
  );
}
