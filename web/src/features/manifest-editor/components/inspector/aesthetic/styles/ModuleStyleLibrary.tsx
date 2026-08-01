'use client';

/**
 * @purpose Gestiona y renderiza una biblioteca para estilos variados en el editor de manifesto de OMEGA componentes.
 * @purpose_en Manages and renders a library for variant styles in OMEGA manifest editor components.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:11,sig:15dgwfv
 * @lastUpdated 2026-06-17T22:31:43.239Z
 */

import React from 'react';
import { Plus } from 'lucide-react';
import type { OMEGA_Manifest, StyleVariant } from '@/omega-ui-core/types/manifest';
import { OMEGA_ELEMENT_CATALOG, type ElementCategory, getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';
import InspectorCollapsible from '../../shared/InspectorCollapsible';

// Stable ID Generator to ensure purity
const generateIndustrialId = (prefix: string = 'var') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
import StyleEditorModal from '../../shared/StyleEditorModal';

// Sub-components
import GuildNavigator from './library/GuildNavigator';
import StyleVariantCard from './library/StyleVariantCard';
import LibraryBatchOps from './library/LibraryBatchOps';
import { getUsedElementTypes } from '@/features/manifest-editor/utils/governanceUtils';
import { Eye, EyeOff } from 'lucide-react';

interface ModuleStyleLibraryProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  activeTab: string;
  onOpenConfig?: (() => void) | undefined;
}

export default function ModuleStyleLibrary({ manifest, onUpdate, resolveAsset, activeTab, onOpenConfig }: ModuleStyleLibraryProps) {
  const styles = React.useMemo(() => manifest.ui.styles || {}, [manifest.ui.styles]);

  // Auto-initialize Default Rack Style if empty
  React.useEffect(() => {
    if (!styles.rack || styles.rack.length === 0) {
      const defaultRack = {
        id: 'standard_industrial',
        label: 'Default Industrial Chassis',
        aesthetics: {
          color: '#1a1a1b',
          rounding: 4,
          borderWidth: 1
        }
      };
      // Only update if manifest is loaded
      if (manifest.id) {
         onUpdate({ ui: { ...manifest.ui, styles: { ...styles, rack: [defaultRack] } } });
      }
    }
  }, [styles.rack, manifest.id, manifest.ui, onUpdate, styles]);
  const [showAll, setShowAll] = React.useState(false);
  const usedTypes = React.useMemo(() => getUsedElementTypes(manifest), [manifest]);
  
  // 1. Dynamic Guild Navigation
  const [activeGuild, setActiveGuild] = React.useState<ElementCategory | 'ALL'>('ALL');

  const categories = React.useMemo(() => {
    const allCats = Array.from(new Set(OMEGA_ELEMENT_CATALOG.map(e => e.category))).sort();
    if (showAll) return allCats;
    
    // Filter categories that have at least one used type
    return allCats.filter(cat => 
      OMEGA_ELEMENT_CATALOG.some(e => e.category === cat && usedTypes.includes(e.id))
    );
  }, [showAll, usedTypes]);

  const filteredTypes = React.useMemo(() => {
    let base = OMEGA_ELEMENT_CATALOG;
    if (!showAll) {
      base = base.filter(e => usedTypes.includes(e.id));
    }

    if (activeGuild === 'ALL') return base.map(e => e.id);
    return base
      .filter(e => e.category === activeGuild)
      .map(e => e.id);
  }, [activeGuild, showAll, usedTypes]);

  const [editingStyle, setEditingStyle] = React.useState<{ type: string; id: string } | null>(null);

  // 2. Logic Handlers
  const addVariation = (type: string) => {
    const current = styles[type] || [];
    const newStyle = {
      id: generateIndustrialId(),
      label: `Style ${current.length + 1}`,
      aesthetics: {}
    };
    onUpdate({ ui: { ...manifest.ui, styles: { ...styles, [type]: [...current, newStyle] } } });
  };

  const removeVariation = (type: string, id: string) => {
    const current = styles[type] || [];
    onUpdate({ ui: { ...manifest.ui, styles: { ...styles, [type]: current.filter(s => s.id !== id) } } });
  };

  const updateStyleLabel = (type: string, id: string, label: string) => {
    const current = styles[type] || [];
    const updated = current.map(s => s.id === id ? { ...s, label } : s);
    onUpdate({ ui: { ...manifest.ui, styles: { ...styles, [type]: updated } } });
  };

  const copyToClipboard = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const exportLibrary = () => {
    if (!manifest.ui.styles) return;
    navigator.clipboard.writeText(JSON.stringify(manifest.ui.styles, null, 2));
    alert('Style Library exported to clipboard.');
  };

  const importLibrary = () => {
    const input = prompt('Paste Style Library JSON here:');
    if (!input) return;
    try {
      const importedStyles = JSON.parse(input);
      onUpdate({ ui: { ...manifest.ui, styles: { ...styles, ...importedStyles } } });
    } catch {
      alert('Invalid JSON format.');
    }
  };

  const currentEditingStyle = React.useMemo(() => {
    if (!editingStyle) return null;
    return (styles[editingStyle.type] || []).find(s => s.id === editingStyle.id);
  }, [editingStyle, styles]);

  const handleStyleUpdate = (updates: Record<string, unknown>) => {
    if (!editingStyle) return;
    const { type, id } = editingStyle;
    const current = styles[type] || [];
    const updated = current.map(s => s.id === id ? { 
      ...s, 
      aesthetics: { ...s.aesthetics, ...updates } 
    } : s);
    onUpdate({ ui: { ...manifest.ui, styles: { ...styles, [type]: updated } } });
  };

  const handleApplyToTab = (type: string, styleId: string) => {
    if (type !== 'rack') return;
    const currentTab = activeTab || 'MAIN';
    const tabStyles = { ...(manifest.ui.layout?.tabStyles || {}), [currentTab]: styleId };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate({ ui: { ...manifest.ui, layout: { ...manifest.ui.layout, tabStyles } } as any });
  };

  return (
    <div className="space-y-6 pt-2">
      {/* 1. USAGE FILTER & NAVIGATION */}
      <div className="flex items-center justify-between bg-black/40 p-3 border wb-outline rounded-xs">
         <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black wb-text uppercase tracking-wider">Aseptic Filtering</span>
            <span className="text-[6px] wb-text-muted font-bold uppercase italic">
              {showAll ? 'Showing all industrial elements' : 'Showing only elements present in Rack'}
            </span>
         </div>
         <button 
            onClick={() => setShowAll(!showAll)}
            aria-label={showAll ? 'Show only elements used in rack' : 'Show all elements'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xs border text-[7px] font-black uppercase transition-all ${showAll ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' : 'bg-primary/10 border-primary/40 text-primary'}`}
         >
            {showAll ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showAll ? 'Show Used Only' : 'Show All Elements'}
         </button>
      </div>

      <GuildNavigator 
        categories={categories} 
        activeGuild={activeGuild} 
        onSelect={setActiveGuild} 
      />

      <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter leading-tight italic px-1">
        Governance Active: Filtered by <span className="text-primary">{activeGuild}</span> guild.
        Styles defined here are aseptic and reusable.
      </p>

      {/* 2. CATEGORY LIST */}
      <div className="space-y-4">
        {filteredTypes.map(type => {
          const def = getElementDefinition(type);
          if (!def) return null;
          const typeStyles = styles[type] || [];
          
          return (
            <InspectorCollapsible 
              key={type} 
              title={def.label} 
              icon={() => <span className="text-[10px] grayscale">{def.icon}</span>}
              defaultExpanded={false}
            >
              <div className="space-y-6 pt-4 pb-2">
                {type === 'rack' && (
                  <div className="p-3 bg-primary/5 border wb-outline rounded-xs mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[7px] font-black uppercase text-primary/60 tracking-widest">Active Architectural Plane</span>
                      <span className="text-[8px] font-mono text-primary">{activeTab}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(manifest.ui.layout?.planes || ['MAIN', 'FX', 'MIDI', 'MOD']).map(plane => (
                        <button 
                          key={plane}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onClick={() => onUpdate({ ui: { ...manifest.ui, layout: { ...manifest.ui.layout, activeTab: plane } } as any })}
                          className={`py-1 text-[6px] font-black uppercase border rounded-xs transition-all ${activeTab === plane ? 'bg-primary text-black border-primary' : 'wb-surface-inset wb-text-muted hover:border-primary/40'}`}
                        >
                          {plane}
                        </button>
                      ))}
                    </div>
                    <p className="text-[6px] wb-text-muted font-bold uppercase italic mt-1 leading-tight">
                      Select a plane above to target it with the &quot;Apply to Plane&quot; button below.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between border-b wb-outline pb-2">
                  <span className="text-[7px] font-black uppercase text-primary/60 tracking-widest">Library Variants</span>
                  <button 
                    onClick={() => addVariation(type)}
                    aria-label={`Add style variant to ${def.label}`}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs border text-[7px] font-black uppercase transition-all wb-surface-subtle wb-outline hover:border-primary/40 text-primary"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Add Style
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {typeStyles.map((s) => (
                    <StyleVariantCard 
                      key={s.id}
                      style={s}
                      type={type}
                      isApplied={type === 'rack' && manifest.ui.layout?.tabStyles?.[activeTab || 'MAIN'] === s.id}
                      onEdit={() => setEditingStyle({ type, id: s.id })}
                      onRemove={() => removeVariation(type, s.id)}
                      onCopy={() => copyToClipboard(s as unknown as Record<string, unknown>)}
                      onLabelChange={(label) => updateStyleLabel(type, s.id, label)}
                      onApply={() => handleApplyToTab(type, s.id)}
                    />
                  ))}
                  {typeStyles.length === 0 && (
                    <div className="col-span-2 py-4 border border-dashed wb-outline rounded-xs flex flex-col items-center justify-center opacity-30">
                       <p className="text-[6px] font-black uppercase tracking-widest">No variants defined</p>
                    </div>
                  )}
                </div>
              </div>
            </InspectorCollapsible>
          );
        })}
      </div>

      {/* 3. BATCH OPERATIONS */}
      <LibraryBatchOps 
        onExport={exportLibrary} 
        onImport={importLibrary} 
      />

      <StyleEditorModal 
        isOpen={!!editingStyle}
        onClose={() => setEditingStyle(null)}
        type={editingStyle?.type || ''}
        style={currentEditingStyle as StyleVariant}
        manifest={manifest}
        onUpdate={handleStyleUpdate}
        resolveAsset={resolveAsset}
        onOpenConfig={onOpenConfig}
      />
    </div>
  );
}
