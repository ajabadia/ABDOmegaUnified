'use client';

/**
 * @purpose Gestiona el estado y la renderización de un editor de estudio celular dentro del manifestador OMEGA, maneja las interacciones del usuario, la gestión de bocetos y los procesos de finalización para entidades celulares.
 * @purpose_en Manages the state and rendering of a cellular study editor within the OMEGA manifest editor, handling user interactions, draft management, and finalization processes for cellular entities.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity High
 * @fingerprint exports:1,imports:14,sig:12hez6k
 * @lastUpdated 2026-06-20T14:40:57.369Z
 */

import { useState, useEffect, useMemo } from 'react';
import ModalCloseButton from '../modals/ModalCloseButton';
import { Database, Cpu, Box, Layers, Activity, Settings2 } from 'lucide-react';

// Core Imports
import type { ManifestEntity, OMEGA_Manifest, CellTemplate, ComponentType } from '@/omega-ui-core/types/manifest';
import { entityToNode } from '@/omega-ui-core/utils/entityToNode';

// Hooks & Subcomponents
import { useCellStudioState, DEFAULT_CELL } from './useCellStudioState';
import { useCellStudioMode } from './useCellStudioMode';
import { useCellStudioDraft } from './useCellStudioDraft';
import { useCellStudioPreview } from './useCellStudioPreview';
import { CellStudioDraftPrompt } from './CellStudioDraftPrompt';
import { CellStudioPreviewStrip } from './CellStudioPreviewStrip';
import { CellStudioToolbar } from './CellStudioToolbar';
import { CellStudioContentArea } from './CellStudioContentArea';
import { CellStudioAssetOverlay } from './CellStudioAssetOverlay';

interface CellStudioContainerProps {
  initialCell?: ManifestEntity | undefined;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onSave: (cell: ManifestEntity) => void;
  onFreeze?: ((template: CellTemplate) => void) | undefined;
  onClose?: (() => void) | undefined;
  isModal?: boolean | undefined;
}

const STEPS = [
  { id: 'fragments', label: 'Parts', icon: Box, tab: 'fragments' },
  { id: 'behavior', label: 'Behavior', icon: Activity, tab: 'behavior' },
  { id: 'recipes', label: 'Layers', icon: Layers, tab: 'recipes' },
  { id: 'properties', label: 'Properties', icon: Settings2, tab: 'properties' }
];

export default function CellStudioContainer({
  initialCell,
  manifest,
  resolveAsset,
  onSave,
  onFreeze,
  onClose,
  isModal = false
}: CellStudioContainerProps) {
  // 1. Initialize Hooks
  const mode = useCellStudioMode();
  const isStepper = mode === 'stepper';

  const stateOptions = useMemo(() => {
    const opts: { initialCell?: ManifestEntity; manifest?: OMEGA_Manifest } = {};
    if (initialCell) opts.initialCell = initialCell;
    if (manifest) opts.manifest = manifest;
    return opts;
  }, [initialCell, manifest]);

  const { state, actions } = useCellStudioState(stateOptions);

  const { saveDraft, loadDraft, hasDraft, clearDraft, isDraftStale } = useCellStudioDraft();
  
  // 2. Preview Pipeline — mock manifest, test value, behavior resolver, preview HTML
  const {
    previewHTML,
    resolved,
    testValue,
    mockManifest,
    handleManifestUpdate,
  } = useCellStudioPreview({
    cellData: state.cellData,
    behavior: state.behavior,
    recipe: state.recipe,
    soloLayerId: state.soloLayerId,
    manifest,
    resolveAsset,
  });

  // 3. Draft Prompt State — inicializado con lazy init para evitar setState en effect
  const [showDraftPrompt, setShowDraftPrompt] = useState(() => hasDraft());

  // Auto-save draft on changes (only if it actually differs from the initial state)
  useEffect(() => {
    const isUnmodified = JSON.stringify(state.cellData) === JSON.stringify(initialCell || DEFAULT_CELL);
    if (!isUnmodified) {
      saveDraft({
        step: state.currentStep,
        cellData: state.cellData,
        behavior: state.behavior,
        recipe: state.recipe
      });
    }
  }, [state.currentStep, state.cellData, state.behavior, state.recipe, initialCell, saveDraft]);

  // Sync cell type with presentation component if they differ
  useEffect(() => {
    if (state.cellData.presentation && state.cellData.type !== state.cellData.presentation.component) {
      actions.setCellData(prev => ({
        ...prev,
        presentation: {
          tab: 'MAIN',
          variant: 'standard',
          offsetX: 0,
          offsetY: 0,
          attachments: [],
          ...prev.presentation,
          component: prev.type as ComponentType
        }
      }));
    }
  }, [state.cellData.type, state.cellData.presentation, state.cellData.presentation?.component, actions]);

  // 4. Action Handlers
  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      actions.setCurrentStep(draft.step as 0 | 1 | 2 | 3);
      actions.setActiveTab(STEPS[draft.step].tab as 'fragments' | 'behavior' | 'recipes' | 'properties');
      actions.setCellData(draft.cellData);
      actions.setBehavior(draft.behavior);
      actions.setRecipe(draft.recipe);
    }
    setShowDraftPrompt(false);
  };

  const handleDismissDraft = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  const handleExport = () => {
    const exportData = {
      ...state.cellData,
      description: state.description,
      assetBehavior: state.behavior,
      recipe: state.recipe,
      meta: { exportedAt: new Date().toISOString(), version: 'Era 7.2.3' }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega_cell_${state.cellData.type}_${(state.cellData.label || 'unnamed').toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const handleFreeze = () => {
    const dna = entityToNode(state.cellData);
    const template: CellTemplate = {
      id: state.cellData.id,
      label: state.cellData.label || 'Unnamed DNA',
      category: (state.cellData.role as CellTemplate['category']) || 'control',
      baseNode: dna,
      assetBehavior: state.behavior,
      recipe: state.recipe,
      version: '1.0.0',
      description: state.description || 'Certified UCA Cell Template'
    };
    
    if (onFreeze) {
      onFreeze(template);
    } else {
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${template.id}.json`;
      a.click();
    }
  };

  const handleFinalize = () => {
    clearDraft();
    onSave({ ...state.cellData, assetBehavior: state.behavior, recipe: state.recipe });
  };

  return (
    <div className={`flex flex-col h-full wb-bg overflow-hidden wb-text-muted ${isModal ? '' : 'rounded-xs border wb-outline'}`}>
      {/* HEADER (ASEPTIC STRIP) */}
      <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black uppercase tracking-widest wb-text">Universal Cell Studio</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[7px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-black uppercase">Phase 15 Isolation</span>
              <span className="text-[8px] md:text-[9px] wb-text-muted font-bold uppercase tracking-widest opacity-70">Era 7.2.3 Industrial Logic</span>
            </div>
          </div>
        </div>
        {onClose && (
          <ModalCloseButton onClick={onClose} title="Close cell studio" />
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: PREVIEW PANEL */}
        <CellStudioPreviewStrip
          previewHTML={previewHTML}
          testValue={testValue}
          onScrub={(val) => actions.updateFragment('host', { testValue: val })}
          onReset={() => actions.updateFragment('host', { testValue: 0.75 })}
        />

        {/* CENTER: WORKSPACE */}
        <div className="flex-1 flex flex-col wb-bg overflow-hidden">
          <CellStudioToolbar
            cellData={state.cellData}
            activeTab={state.activeTab}
            currentStep={state.currentStep}
            isTypeLocked={state.isTypeLocked}
            isCommandCenterOpen={state.isCommandCenterOpen}
            isStepperMode={isStepper}
            setCellData={actions.setCellData}
            setActiveTab={actions.setActiveTab}
            setCurrentStep={actions.setCurrentStep}
            setIsCommandCenterOpen={actions.setIsCommandCenterOpen}
            STEPS={STEPS}
          />

          <div className="flex-1 overflow-y-auto p-6">
            <CellStudioContentArea
              activeTab={state.activeTab}
              isCommandCenterOpen={state.isCommandCenterOpen}
              selectedFragmentId={state.selectedFragmentId}
              cellData={state.cellData}
              behavior={state.behavior}
              recipe={state.recipe}
              activeManifest={mockManifest}
              resolveAsset={resolveAsset || ((id) => id)}
              soloLayerId={state.soloLayerId}
              resolved={resolved}
              addFragment={actions.addFragment}
              removeFragment={actions.removeFragment}
              moveFragment={actions.moveFragment}
              updateFragment={actions.updateFragment}
              setBehavior={actions.setBehavior}
              setRecipe={actions.setRecipe}
              setSelectedFragmentId={actions.setSelectedFragmentId}
              setSoloLayerId={actions.setSoloLayerId}
              setActiveTab={actions.setActiveTab}
              openAssetSelector={actions.openAssetSelector}
              setIsCommandCenterOpen={actions.setIsCommandCenterOpen}
              handleManifestUpdate={handleManifestUpdate}
            />
          </div>

          {/* ACTION BAR */}
          <div className="p-6 border-t wb-outline wb-surface-subtle flex items-center justify-end gap-3 shrink-0">
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify({ behavior: state.behavior, recipe: state.recipe }, null, 2))} title="Copy DNA to clipboard" className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-primary/5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer">Copy DNA</button>
            <button onClick={handleExport} title="Export entity as JSON" className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-primary/5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer">Export Entity</button>
            <button onClick={handleFreeze} title="Freeze as DNA template" className="px-6 py-2.5 rounded-xs bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer">
              <Database className="w-3.5 h-3.5" /> Freeze as DNA Template
            </button>
            <button onClick={handleFinalize} title="Save and finalize cell" className="px-8 py-2.5 rounded-xs bg-accent text-black hover:brightness-110 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-4 shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)] cursor-pointer">Finalize Cell</button>
          </div>
        </div>
      </div>

      {/* DRAFT NOTIFICATION MODAL */}
      {showDraftPrompt && (
        <CellStudioDraftPrompt
          isDraftStale={isDraftStale}
          onRestore={handleRestoreDraft}
          onDismiss={handleDismissDraft}
        />
      )}

      {/* ASSET SELECTOR OVERLAY */}
      {state.isAssetSelectorOpen && (
        <CellStudioAssetOverlay
          activeLayerId={state.activeLayerId}
          activeManifest={mockManifest}
          resolveAsset={resolveAsset}
          onSelect={(layerId, assetId) => {
            actions.setRecipe(prev => ({
              ...prev,
              layers: prev.layers.map(l => l.id === layerId ? { ...l, assetId } : l)
            }));
          }}
          onClose={actions.closeAssetSelector}
        />
      )}
    </div>
  );
}
