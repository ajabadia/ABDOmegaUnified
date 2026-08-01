'use client';

/**
 * @purpose Renderiza la sección del módulo de arquitectura del editor de manifesto OMEGA, incluyendo subtablas para infraestructura, controles, puertos, rutas, activos y vista de árbol.
 * @purpose_en Renders the module architecture section of the OMEGA manifest editor, including sub-tabs for infrastructure, controls, ports, routing, assets, and tree view.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:2nend8
 * @lastUpdated 2026-06-20T09:17:04.231Z
 */

import { useState } from 'react';
import { Layout, Settings2, Zap, Move, Image } from 'lucide-react';
import type { OMEGA_Manifest, LayoutContainer, OMEGA_Modulation, ExtraResource, UcaDebugConfig, GridConfig } from '@/omega-ui-core/types/manifest';
import ContainerSection from '@/features/manifest-editor/components/inspector/sections/ContainerSection';
import EntityListSection from '@/features/manifest-editor/components/inspector/sections/EntityListSection';
import ModulationSection from '@/features/manifest-editor/components/inspector/sections/ModulationSection';
import ResourceSection from '@/features/manifest-editor/components/inspector/sections/ResourceSection';
import TreeSection from '@/features/manifest-editor/components/inspector/sections/TreeSection';
import InspectorCollapsible from '../shared/InspectorCollapsible';
  
interface ModuleArchitectureSectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  addContainer: (c?: Partial<LayoutContainer> | undefined) => void;
  updateContainer: (id: string, updates: Partial<LayoutContainer>) => void;
  removeContainer: (id: string) => void;
  onSelectItem: (id: string | null) => void;
  onAddEntity: (type: 'control' | 'jack') => void;
  onDuplicateItem: (id: string) => void;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
  onUpdateModulation: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onOpenModGrid: () => void;
  extraResources?: ExtraResource[] | undefined;
  onTriggerUpload?: (() => void) | undefined;
  onRemoveResource?: ((name: string) => void) | undefined;
  highlightPath?: (string | null) | undefined;
  setActiveSection?: ((sectionId: string) => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
  onRemoveItem: (id: string) => void;
}
  
export default function ModuleArchitectureSection({
  manifest,
  addContainer,
  updateContainer,
  removeContainer,
  onSelectItem,
  onAddEntity,
  onDuplicateItem,
  onRemoveItem,
  onAddModulation,
  onRemoveModulation,
  onUpdateModulation,
  onOpenModGrid,
  extraResources,
  onTriggerUpload,
  onRemoveResource,
  highlightPath,
  onUpdate,
  setActiveSection
}: ModuleArchitectureSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'infra' | 'controls' | 'ports' | 'routing' | 'assets' | 'tree'>('infra');
  
  const subTabs = [
    ...(manifest.ui?.useUCA !== false ? [{ id: 'tree' as const, label: 'Hierarchy', icon: Layout, color: 'text-purple-400' }] : []),
    { id: 'infra' as const, label: 'Infrastructure', icon: Layout, color: 'text-accent' },
    { id: 'controls' as const, label: 'Controls', icon: Settings2, color: 'text-amber-400' },
    { id: 'ports' as const, label: 'Signal I/O', icon: Zap, color: 'text-cyan-400' },
    { id: 'routing' as const, label: 'Routing', icon: Move, color: 'text-blue-400' },
    { id: 'assets' as const, label: 'Assets', icon: Image, color: 'text-purple-400' },
  ];
  
  return (
    <div className="flex flex-col">
      {/* SYSTEM & GRID SETTINGS COLLAPSIBLE */}
      <div className="mb-4">
        <InspectorCollapsible
          title="System & Grid Settings"
          icon={Settings2}
          defaultOpen={false}
        >
          <div className="space-y-4 pt-3">
            {/* LEGACY FALLBACK TOGGLE */}
            <div className={`p-2 border rounded-xs flex items-center justify-between transition-colors ${
              manifest.ui?.useUCA === false ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex flex-col">
                <span className={`text-[7px] font-black uppercase tracking-widest ${manifest.ui?.useUCA === false ? 'text-amber-500' : 'text-white/50'}`}>Legacy Rendering Fallback</span>
                <span className={`text-[6px] font-medium ${manifest.ui?.useUCA === false ? 'text-amber-500/70' : 'text-white/30'}`}>Temporarily revert to flat-array pipeline</span>
              </div>
              <button
                onClick={() => onUpdate({ ui: { ...manifest.ui, useUCA: manifest.ui?.useUCA === false ? true : false } })}
                aria-label={manifest.ui?.useUCA === false ? 'Disable legacy fallback' : 'Enable legacy fallback'}
                className={`px-3 py-1 text-[8px] font-black uppercase rounded-full border transition-all ${
                  manifest.ui?.useUCA === false
                    ? 'bg-amber-500 border-amber-500 text-black' 
                    : 'border-white/20 text-white/50 hover:bg-white/10'
                }`}
              >
                {manifest.ui?.useUCA === false ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* UCA DEBUG INSPECTOR */}
            {manifest.ui?.useUCA !== false && (
              <div className="p-2 bg-purple-500/5 border border-purple-500/20 rounded-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black uppercase text-purple-500 tracking-widest">UCA Debug Inspector</span>
                    <span className="text-[6px] text-purple-500/60 font-medium">Visual overlay and node selection</span>
                  </div>
                  <button
                    onClick={() => onUpdate({ 
                      ui: { 
                        ...manifest.ui, 
                        ucaDebug: { 
                          enabled: !manifest.ui?.ucaDebug?.enabled,
                          showLabels: manifest.ui?.ucaDebug?.showLabels ?? true,
                          hideDecorative: manifest.ui?.ucaDebug?.hideDecorative ?? false,
                          showCADOverlay: manifest.ui?.ucaDebug?.showCADOverlay ?? false,
                          selectedId: manifest.ui?.ucaDebug?.selectedId
                        } as UcaDebugConfig
                      } 
                    })}
                    aria-label={manifest.ui?.ucaDebug?.enabled ? 'Disable UCA debug' : 'Enable UCA debug'}
                    className={`px-3 py-1 text-[8px] font-black uppercase rounded-full border transition-all ${
                      manifest.ui?.ucaDebug?.enabled 
                        ? 'bg-purple-500 border-purple-500 text-black' 
                        : 'border-purple-500/30 text-purple-500/50 hover:bg-purple-500/10'
                    }`}
                  >
                    {manifest.ui?.ucaDebug?.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {manifest.ui?.ucaDebug?.enabled && (
                  <div className="flex gap-4 pt-1 border-t border-purple-500/10">
                    <label className="flex items-center gap-1.5 text-[8px] font-medium text-white/70 cursor-pointer hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={manifest.ui?.ucaDebug?.showLabels !== false} 
                        onChange={(e) => onUpdate({ 
                          ui: { 
                            ...manifest.ui, 
                            ucaDebug: { 
                              enabled: manifest.ui?.ucaDebug?.enabled || false, 
                              showLabels: e.target.checked,
                              hideDecorative: manifest.ui?.ucaDebug?.hideDecorative ?? false,
                              showCADOverlay: manifest.ui?.ucaDebug?.showCADOverlay ?? false,
                              selectedId: manifest.ui?.ucaDebug?.selectedId
                            } as UcaDebugConfig
                          } 
                        })}
                        className="accent-purple-500 w-2.5 h-2.5 bg-black/50 border-purple-500/30 rounded-sm"
                      /> Show Boundaries
                    </label>
                    <label className="flex items-center gap-1.5 text-[8px] font-medium text-white/70 cursor-pointer hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={manifest.ui?.ucaDebug?.hideDecorative || false} 
                        onChange={(e) => onUpdate({ 
                          ui: { 
                            ...manifest.ui, 
                            ucaDebug: { 
                              enabled: manifest.ui?.ucaDebug?.enabled || false, 
                              hideDecorative: e.target.checked,
                              showLabels: manifest.ui?.ucaDebug?.showLabels ?? true,
                              showCADOverlay: manifest.ui?.ucaDebug?.showCADOverlay ?? false,
                              selectedId: manifest.ui?.ucaDebug?.selectedId
                            } as UcaDebugConfig
                          } 
                        })}
                        className="accent-purple-500 w-2.5 h-2.5 bg-black/50 border-purple-500/30 rounded-sm"
                      /> Hide Decorative
                    </label>
                    <label className="flex items-center gap-1.5 text-[8px] font-medium text-white/70 cursor-pointer hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={manifest.ui?.ucaDebug?.showCADOverlay || false} 
                        onChange={(e) => onUpdate({ 
                          ui: { 
                            ...manifest.ui, 
                            ucaDebug: { 
                              enabled: manifest.ui?.ucaDebug?.enabled || false, 
                              showCADOverlay: e.target.checked,
                              showLabels: manifest.ui?.ucaDebug?.showLabels ?? true,
                              hideDecorative: manifest.ui?.ucaDebug?.hideDecorative ?? false,
                              selectedId: manifest.ui?.ucaDebug?.selectedId
                            } as UcaDebugConfig
                          } 
                        })}
                        className="accent-purple-500 w-2.5 h-2.5 bg-black/50 border-purple-500/30 rounded-sm"
                      /> Show CAD Layout
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* GRID SNAPPING (Phase 4.3.3) */}
            <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase text-emerald-500 tracking-widest">Grid Snapping (Era 7.2.3)</span>
                  <span className="text-[6px] text-emerald-500/60 font-medium">Align nodes to discrete spatial grid</span>
                </div>
                <button
                  onClick={() => onUpdate({ 
                    ui: { 
                      ...manifest.ui, 
                      layout: { 
                        ...manifest.ui?.layout, 
                        width: manifest.ui?.layout?.width ?? 800,
                        height: manifest.ui?.layout?.height ?? 600,
                        containers: manifest.ui?.layout?.containers || [],
                        grid: { 
                          enabled: !manifest.ui?.layout?.grid?.enabled,
                          spacingX: manifest.ui?.layout?.grid?.spacingX ?? 24,
                          spacingY: manifest.ui?.layout?.grid?.spacingY ?? 24,
                          snapMode: manifest.ui?.layout?.grid?.snapMode ?? 'center'
                        } as GridConfig
                      } 
                    } 
                  })}
                  aria-label={manifest.ui?.layout?.grid?.enabled ? 'Disable grid snapping' : 'Enable grid snapping'}
                  className={`px-3 py-1 text-[8px] font-black uppercase rounded-full border transition-all ${
                    manifest.ui?.layout?.grid?.enabled 
                      ? 'bg-emerald-500 border-emerald-500 text-black' 
                      : 'border-emerald-500/30 text-emerald-500/50 hover:bg-emerald-500/10'
                  }`}
                >
                  {manifest.ui?.layout?.grid?.enabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              {manifest.ui?.layout?.grid?.enabled && (
                <div className="flex gap-4 pt-1 border-t border-emerald-500/10 items-center">
                    <div className="flex items-center gap-1.5 text-[8px] font-medium text-white/70">
                      <span>X:</span>
                      <input 
                        type="number" 
                        value={manifest.ui?.layout?.grid?.spacingX || 24}
                        onChange={(e) => {
                          const grid = manifest.ui?.layout?.grid || { spacingX: 24, spacingY: 24, enabled: false, snapMode: 'center' };
                          onUpdate({ 
                            ui: { 
                              ...manifest.ui, 
                              layout: { 
                                ...manifest.ui?.layout, 
                                width: manifest.ui?.layout?.width ?? 800,
                                height: manifest.ui?.layout?.height ?? 600,
                                containers: manifest.ui?.layout?.containers || [], 
                                grid: { 
                                  ...grid, 
                                  spacingX: parseInt(e.target.value) || 1,
                                  snapMode: grid.snapMode ?? 'center'
                                } as GridConfig
                              } 
                            } 
                          });
                        }}
                        aria-label="Grid spacing X"
                        className="w-8 bg-black/40 border border-emerald-500/20 rounded-sm px-1 text-[8px] outline-none focus:border-emerald-500/50"
                      />
                   </div>
                   <div className="flex items-center gap-1.5 text-[8px] font-medium text-white/70">
                      <span>Y:</span>
                      <input 
                        type="number" 
                        value={manifest.ui?.layout?.grid?.spacingY || 24}
                        onChange={(e) => {
                          const grid = manifest.ui?.layout?.grid || { spacingX: 24, spacingY: 24, enabled: false, snapMode: 'center' };
                          onUpdate({ 
                            ui: { 
                              ...manifest.ui, 
                              layout: { 
                                ...manifest.ui?.layout, 
                                width: manifest.ui?.layout?.width ?? 800,
                                height: manifest.ui?.layout?.height ?? 600,
                                containers: manifest.ui?.layout?.containers || [], 
                                grid: { 
                                  ...grid, 
                                  spacingY: parseInt(e.target.value) || 1,
                                  snapMode: grid.snapMode ?? 'center'
                                } as GridConfig
                              } 
                            } 
                          });
                        }}
                        aria-label="Grid spacing Y"
                        className="w-8 bg-black/40 border border-emerald-500/20 rounded-sm px-1 text-[8px] outline-none focus:border-emerald-500/50"
                      />
                   </div>
                </div>
              )}
            </div>
          </div>
        </InspectorCollapsible>
      </div>

      {/* SUB-NAVIGATION */}
      <div className="flex gap-1 mb-6 bg-black/20 p-1 rounded-xs border wb-outline shrink-0">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}              aria-label={`Select ${tab.label} tab`}
              className={`flex-1 py-1.5 flex flex-col items-center gap-1 rounded-xs transition-all ${
              activeSubTab === tab.id 
                ? 'bg-primary/10 border border-primary/20 text-primary' 
                : 'wb-text-muted hover:wb-text hover:bg-white/5 border border-transparent'
            }`}
          >
            <tab.icon className={`w-3 h-3 ${activeSubTab === tab.id ? tab.color : ''}`} />
            <span className="text-[6px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
  
      {/* CONTENT AREA */}
      <div className="flex flex-col">
        {activeSubTab === 'tree' && manifest.ui?.useUCA !== false && (
          <TreeSection 
            manifest={manifest} 
            selectedItemId={highlightPath || null} // Temporary using highlightPath or we need to pass selectedItemId 
            onSelectItem={onSelectItem} 
          />
        )}
        
        {activeSubTab === 'infra' && (
          <ContainerSection 
            containers={manifest.ui?.layout?.containers || []} 
            manifest={manifest} 
            onAdd={addContainer} 
            onUpdate={updateContainer} 
            onRemove={removeContainer} 
            highlightPath={highlightPath || undefined} 
            setActiveSection={setActiveSection as (s: string) => void}
          />
        )}
        
        {activeSubTab === 'controls' && (
          <EntityListSection 
            items={manifest.ui?.controls || []} 
            title="Interactive Controls" 
            type="control" 
            onSelectItem={onSelectItem} 
            onAddEntity={onAddEntity} 
            onDuplicateItem={onDuplicateItem} 
            onRemoveItem={onRemoveItem} 
            manifest={manifest} 
          />
        )}
  
        {activeSubTab === 'ports' && (
          <EntityListSection 
            items={manifest.ui?.jacks || []} 
            title="Signal Ports / Jacks" 
            type="jack" 
            onSelectItem={onSelectItem} 
            onAddEntity={onAddEntity} 
            onDuplicateItem={onDuplicateItem} 
            onRemoveItem={onRemoveItem} 
            manifest={manifest} 
          />
        )}
  
        {activeSubTab === 'routing' && (
          <ModulationSection 
            manifest={manifest} 
            onAdd={onAddModulation} 
            onRemove={onRemoveModulation} 
            onUpdate={onUpdateModulation} 
            onOpenModGrid={onOpenModGrid} 
          />
        )}
  
        {activeSubTab === 'assets' && (
          <ResourceSection 
            resources={extraResources || []} 
            onTriggerUpload={onTriggerUpload || (() => {})} 
            onRemove={onRemoveResource || (() => {})} 
          />
        )}
      </div>
    </div>
  );
}
