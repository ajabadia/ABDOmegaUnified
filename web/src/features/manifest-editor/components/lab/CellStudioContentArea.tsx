'use client';

/**
 * @purpose Renderiza el área de contenido para gestionar fragmentos, comportamientos, recetas y propiedades en el editor de manifesto OMEGA.
 * @purpose_en Renders the content area for managing fragments, behaviors, recipes, and properties in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity High
 * @fingerprint exports:1,imports:10,sig:1h86auf
 * @lastUpdated 2026-06-15T12:46:51.725Z
 */

import { Box, ChevronUp, ChevronDown, Layout, Trash2 } from 'lucide-react';
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';
import type { ManifestEntity, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { AssetBehavior, LayerRecipe } from '@/omega-ui-core/types/assetBehavior';
import ThemePaletteGovernance from '../inspector/aesthetic/governance/ThemePaletteGovernance';
import IndustrialGovernanceConsole from '../inspector/shared/IndustrialGovernanceConsole';
import AttachmentTypePrecisionOffsets from '../inspector/attachments/AttachmentPrecisionOffsets';
import AssetBehaviorPresetSelector from './AssetBehaviorPresetSelector';
import BehaviorMappingInspector from './BehaviorMappingInspector';
import LayerRecipeEditor from './LayerRecipeEditor';

interface CellStudioContentAreaProps {
  activeTab: string;
  isCommandCenterOpen: boolean;
  selectedFragmentId: string;
  cellData: ManifestEntity;
  behavior: AssetBehavior;
  recipe: LayerRecipe;
  activeManifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
  soloLayerId: string | null;
  resolved: { frame: number };
  addFragment: (type: string) => void;
  removeFragment: (id: string) => void;
  moveFragment: (id: string, dir: 'up' | 'down') => void;
  updateFragment: (id: string, updates: Partial<ManifestEntity>) => void;
  setBehavior: (updater: (prev: AssetBehavior) => AssetBehavior) => void;
  setRecipe: (updater: (prev: LayerRecipe) => LayerRecipe) => void;
  setSelectedFragmentId: (id: string) => void;
  setSoloLayerId: (id: string | null) => void;
  setActiveTab: (tab: 'fragments' | 'behavior' | 'recipes' | 'properties') => void;
  openAssetSelector: (layerId: string) => void;
  setIsCommandCenterOpen: (open: boolean) => void;
  handleManifestUpdate: (updates: Partial<OMEGA_Manifest>) => void;
}

/**
 * CellStudioContentArea — Área central con tabs de fragments, behavior, recipes y properties.
 * Extraído de CellStudioContainer.tsx.
 */
export function CellStudioContentArea({
  activeTab,
  isCommandCenterOpen,
  selectedFragmentId,
  cellData,
  behavior,
  recipe,
  activeManifest,
  resolveAsset,
  soloLayerId,
  resolved,
  addFragment,
  removeFragment,
  moveFragment,
  updateFragment,
  setBehavior,
  setRecipe,
  setSelectedFragmentId,
  setSoloLayerId,
  setActiveTab,
  openAssetSelector,
  setIsCommandCenterOpen,
  handleManifestUpdate
}: CellStudioContentAreaProps) {
  if (isCommandCenterOpen) {
    return (
      <ThemePaletteGovernance
        manifest={activeManifest}
        onUpdate={handleManifestUpdate}
      />
    );
  }

  if (activeTab === 'fragments') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b wb-outline pb-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] wb-text">Parts &amp; Components</h3>
          <select
            onChange={(e) => { if (e.target.value) addFragment(e.target.value); e.target.value = ''; }}
            className="bg-accent/10 border border-accent/30 rounded-xs px-3 py-1.5 text-[8px] font-black uppercase text-accent outline-none focus:border-accent/40"
          >
            <option value="" className="bg-surface wb-text">+ Add Part</option>
            {OMEGA_ELEMENT_CATALOG.filter(e => e.attachmentRole === 'fragment' || e.attachmentRole === 'both').map(frag => (
              <option key={frag.id} value={frag.id} className="bg-surface wb-text">{frag.label.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div
            onClick={() => { setSelectedFragmentId('host'); setActiveTab('properties'); }}
            className={`p-4 rounded-xs border flex items-center gap-4 cursor-pointer transition-all ${selectedFragmentId === 'host' ? 'bg-accent/10 border-accent text-accent' : 'wb-surface-subtle wb-outline wb-text-muted hover:wb-text hover:border-outline/60'}`}
          >
            <Box className="w-6 h-6 text-accent" />
            <div className="flex-1">
              <h4 className="text-[10px] font-black uppercase wb-text">Main Body</h4>
              <p className="text-[7px] font-bold uppercase wb-text-muted opacity-60">Base surface &amp; structure</p>
            </div>
            <span className="text-[6px] font-black uppercase text-accent/60">click to style</span>
          </div>
          {(cellData.presentation?.attachments || []).length === 0 && (
            <p className="text-[8px] wb-text-muted italic text-center py-6 opacity-60">
              No parts yet. Use {'\u201C'}+ Add Part{'\u201D'} above to attach components like LEDs, ports or displays.
            </p>
          )}
          {(cellData.presentation?.attachments || []).map(frag => (
            <div
              key={frag.id}
              onClick={() => { setSelectedFragmentId(frag.id); setActiveTab('properties'); }}
              className={`p-4 rounded-xs border flex items-center gap-4 cursor-pointer transition-all ${selectedFragmentId === frag.id ? 'bg-accent/10 border-accent text-accent' : 'wb-surface-subtle wb-outline wb-text-muted hover:wb-text hover:border-outline/60'}`}
            >
              <div className="flex flex-col gap-1">
                <button onClick={(e) => { e.stopPropagation(); moveFragment(frag.id, 'up'); }} title="Move up" className="hover:text-primary"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveFragment(frag.id, 'down'); }} title="Move down" className="hover:text-primary"><ChevronDown className="w-3 h-3" /></button>
              </div>
              <Layout className="w-5 h-5 opacity-40" />
              <div className="flex-1">
                <h4 className="text-[10px] font-black uppercase wb-text">{frag.type}</h4>
                <span className="text-[6px] font-mono wb-text-muted opacity-50">#{frag.id.slice(-4)}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFragment(frag.id); }} title="Remove part" className="text-red-500/40 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'behavior') {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <AssetBehaviorPresetSelector value={behavior.preset} onChange={(p) => setBehavior(prev => ({ ...prev, preset: p }))} />
        <BehaviorMappingInspector
          mapping={behavior.mapping!} resolvedFrame={resolved.frame}
          onChange={(updates) => setBehavior(prev => ({ ...prev, mapping: { ...prev.mapping!, ...updates } }))}
        />
      </div>
    );
  }

  if (activeTab === 'recipes') {
    return (
      <LayerRecipeEditor
        recipe={recipe} onChange={(updates) => setRecipe(prev => ({ ...prev, ...updates }))}
        onSelectAsset={(layerId) => { openAssetSelector(layerId); }}
        soloLayerId={soloLayerId} onSoloChange={setSoloLayerId}
      />
    );
  }

  // Properties tab (default)
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <IndustrialGovernanceConsole
        type={selectedFragmentId === 'host' ? cellData.type as string : ((cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.type || 'label')}
        values={selectedFragmentId === 'host' ? (cellData.presentation?.style || {}) : ((cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.style || {})}
        onUpdate={(updates) => updateFragment(selectedFragmentId, updates as unknown as Partial<ManifestEntity>)}
        manifest={activeManifest} resolveAsset={resolveAsset}
        onOpenConfig={() => setIsCommandCenterOpen(true)}
        title={selectedFragmentId === 'host' ? 'Main Body Style' : 'Part Style'}
      />
      {selectedFragmentId !== 'host' && (
        <AttachmentTypePrecisionOffsets
          offsetX={(cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.offsetX || 0}
          offsetY={(cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.offsetY || 0}
          onUpdate={(updates) => updateFragment(selectedFragmentId, updates as unknown as Partial<ManifestEntity>)}
        />
      )}
    </div>
  );
}
