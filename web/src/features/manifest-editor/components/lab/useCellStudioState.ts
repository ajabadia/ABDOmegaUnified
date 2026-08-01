/**
 * @purpose Gestiona el estado y las acciones para CellStudio en el editor de manifesto OMEGA, proporcionando un punto de conexión centralizado para manejar diversas aspectos de la funcionalidad de CellStudio.
 * @purpose_en Manages state and actions for CellStudio in the OMEGA manifest editor, providing a centralized hook for handling various aspects of cell studio functionality.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity High
 * @fingerprint exports:8,imports:3,sig:kp5ijt
 * @lastUpdated 2026-06-15T12:47:31.422Z
 */

/**
 * Phase 1: State Separation Hook for CellStudio
 * 
 * Extracts all state and related logic from CellStudioContainer into a separate hook.
 * This improves testability and maintainability by separating concerns.
 * 
 * Based on: ADR-045, Migration Plan Phase 1
 */

import { useState, useCallback, useMemo } from 'react';
import type { ManifestEntity, OMEGA_Manifest, ComponentType, AttachmentType, Attachment, Presentation } from '@/omega-ui-core/types/manifest';
import type { AssetBehavior, LayerRecipe } from '@/omega-ui-core/types/assetBehavior';

// Default values
const DEFAULT_BEHAVIOR: AssetBehavior = {
  preset: 'rotary',
  source: 'asset',
  mapping: {
    input: 'value',
    mode: 'continuous',
    polarity: 'normal'
  }
};

const DEFAULT_RECIPE: LayerRecipe = {
  id: 'new_recipe',
  name: 'New Composite Recipe',
  layers: []
};

export const DEFAULT_CELL: ManifestEntity = {
  id: 'new_cell',
  type: 'knob',
  role: 'control',
  bind: 'param_id',
  label: 'New Universal Cell',
  pos: { x: 0, y: 0 },
  size: { width: 48, height: 48 },
  presentation: {
    tab: 'MAIN',
    component: 'knob',
    variant: 'B_cyan',
    offsetX: 0,
    offsetY: 0,
    style: {
      asset: '',
      color: '#00f2ff',
      indicatorColor: '#00f2ff',
      fitting: 'contain'
    },
    attachments: []
  }
};

// Tab type for UI navigation
export type CellStudioTab = 'fragments' | 'properties' | 'behavior' | 'recipes';

// Step type for stepper mode
export type CellStudioStep = 0 | 1 | 2 | 3;

export interface CellStudioState {
  // Core data state
  cellData: ManifestEntity;
  behavior: AssetBehavior;
  recipe: LayerRecipe;
  
  // UI navigation state
  activeTab: CellStudioTab;
  currentStep: CellStudioStep;
  
  // Selection state
  selectedFragmentId: string;
  soloLayerId: string | null;
  
  // Modal/overlay state
  isAssetSelectorOpen: boolean;
  activeLayerId: string | null;
  isCommandCenterOpen: boolean;
  
  // Cell type lock (once a type is selected, can't change)
  isTypeLocked: boolean;
  
  // Test value for behavior preview
  testValue: number;
  
  // Description (metadata)
  description: string;
}

export interface CellStudioActions {
  // Cell data actions
  setCellData: (cell: ManifestEntity | ((prev: ManifestEntity) => ManifestEntity)) => void;
  updateLabel: (label: string) => void;
  updateType: (type: string) => void;
  
  // Behavior actions
  setBehavior: React.Dispatch<React.SetStateAction<AssetBehavior>>;
  updateBehaviorPreset: (preset: AssetBehavior['preset']) => void;
  updateBehaviorMapping: (updates: Partial<AssetBehavior['mapping']>) => void;
  
  // Recipe actions
  setRecipe: React.Dispatch<React.SetStateAction<LayerRecipe>>;
  updateRecipeLayers: (updates: Partial<LayerRecipe>) => void;
  
  // Fragment actions
  addFragment: (type: string) => void;
  removeFragment: (id: string) => void;
  moveFragment: (id: string, direction: 'up' | 'down') => void;
  updateFragment: (id: string, updates: Record<string, unknown>) => void;
  
  // UI navigation actions
  setActiveTab: (tab: CellStudioTab) => void;
  setCurrentStep: (step: CellStudioStep) => void;
  
  // Selection actions
  setSelectedFragmentId: (id: string) => void;
  setSoloLayerId: (id: string | null) => void;
  
  // Description action
  setDescription: (description: string) => void;
  
  // Modal/overlay actions
  setIsAssetSelectorOpen: (open: boolean) => void;
  setIsCommandCenterOpen: (open: boolean) => void;
  openAssetSelector: (layerId: string) => void;
  closeAssetSelector: () => void;
  toggleCommandCenter: () => void;
  
  // Test value actions
  setTestValue: (value: number) => void;
  resetTestValue: () => void;
}

export interface UseCellStudioStateOptions {
  initialCell?: ManifestEntity;
  manifest?: OMEGA_Manifest;
  onSave?: (cell: ManifestEntity & { assetBehavior: AssetBehavior; recipe: LayerRecipe }) => void;
}

/**
 * Hook for managing all CellStudio state and actions.
 * 
 * Usage:
 * ```typescript
 * const { state, actions } = useCellStudioState({ initialCell, manifest });
 * ```
 */
export function useCellStudioState(options: UseCellStudioStateOptions = {}) {
  const { initialCell } = options;

  // ========== CORE DATA STATE ==========
  
  const [cellData, setCellData] = useState<ManifestEntity>(initialCell || DEFAULT_CELL);
  const [behavior, setBehavior] = useState<AssetBehavior>(initialCell?.assetBehavior || DEFAULT_BEHAVIOR);
  const [recipe, setRecipe] = useState<LayerRecipe>(initialCell?.recipe || DEFAULT_RECIPE);
  const [description, setDescription] = useState('');
  
  // ========== UI NAVIGATION STATE ==========
  
  const [activeTab, setActiveTab] = useState<CellStudioTab>('fragments');
  const [currentStep, setCurrentStep] = useState<CellStudioStep>(0);
  
  // ========== SELECTION STATE ==========
  
  const [selectedFragmentId, setSelectedFragmentId] = useState<string>('host');
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);
  
  // ========== MODAL/OVERLAY STATE ==========
  
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  
  // ========== CELL TYPE LOCK ==========
  
  const [isTypeLocked, setIsTypeLocked] = useState(!!initialCell);
  
  // ========== TEST VALUE ==========
  
  const [testValue, setTestValue] = useState(0.75);

  // ========== EFFECTS ==========

  // Note: Cell type sync with presentation component is handled in the container
  // to avoid cascading render issues. The useCellStudioState hook manages state only.

  // ========== ACTIONS ==========

  const updateLabel = useCallback((label: string) => {
    setCellData(prev => ({ ...prev, label }));
  }, []);

  const updateType = useCallback((type: string) => {
    setCellData(prev => ({ ...prev, type }));
  }, []);

  const updateBehaviorPreset = useCallback((preset: AssetBehavior['preset']) => {
    setBehavior(prev => ({ ...prev, preset }));
  }, []);

  const updateBehaviorMapping = useCallback((updates: Partial<AssetBehavior['mapping']>) => {
    setBehavior(prev => ({
      ...prev,
      mapping: { ...prev.mapping!, ...updates }
    }));
  }, []);

  const updateRecipeLayers = useCallback((updates: Partial<LayerRecipe>) => {
    setRecipe(prev => ({ ...prev, ...updates }));
  }, []);

  const addFragment = useCallback((type: string) => {
    setIsTypeLocked(true);
    const newFragment = {
      id: `fragment_${Date.now()}`,
      position: 'center' as const,
      type: type as AttachmentType,
      variant: 'default',
      style: { color: '#ffffff', fontSize: 10, font: 'Inter' },
      offsetX: 0,
      offsetY: 0
    };
    
    setCellData(prev => ({
      ...prev,
      presentation: {
        tab: prev.presentation?.tab || 'MAIN',
        component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
        variant: prev.presentation?.variant || 'standard',
        offsetX: prev.presentation?.offsetX || 0,
        offsetY: prev.presentation?.offsetY || 0,
        ...prev.presentation,
        attachments: [...(prev.presentation?.attachments || []), newFragment as unknown as Attachment]
      } as Presentation
    }));
    setSelectedFragmentId(newFragment.id);
    setActiveTab('properties');
  }, []);

  const removeFragment = useCallback((id: string) => {
    setCellData(prev => ({
      ...prev,
      presentation: {
        tab: prev.presentation?.tab || 'MAIN',
        component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
        variant: prev.presentation?.variant || 'standard',
        offsetX: prev.presentation?.offsetX || 0,
        offsetY: prev.presentation?.offsetY || 0,
        ...prev.presentation,
        attachments: (prev.presentation?.attachments || []).filter((a) => a.id !== id)
      } as Presentation
    }));
    if (selectedFragmentId === id) setSelectedFragmentId('host');
  }, [selectedFragmentId]);

  const moveFragment = useCallback((id: string, direction: 'up' | 'down') => {
    const attachments = [...(cellData.presentation?.attachments || [])];
    const index = attachments.findIndex(a => a.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= attachments.length) return;

    const [moved] = attachments.splice(index, 1);
    attachments.splice(newIndex, 0, moved);

    setCellData(prev => ({
      ...prev,
      presentation: { 
        tab: prev.presentation?.tab || 'MAIN',
        component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
        variant: prev.presentation?.variant || 'standard',
        offsetX: prev.presentation?.offsetX || 0,
        offsetY: prev.presentation?.offsetY || 0,
        ...prev.presentation, 
        attachments 
      } as Presentation
    }));
  }, [cellData.presentation?.attachments]);

  const updateFragment = useCallback((id: string, updates: Record<string, unknown>) => {
    if (id === 'host') {
      setCellData(prev => ({
        ...prev,
        presentation: {
          tab: prev.presentation?.tab || 'MAIN',
          component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
          variant: prev.presentation?.variant || 'standard',
          offsetX: prev.presentation?.offsetX || 0,
          offsetY: prev.presentation?.offsetY || 0,
          ...prev.presentation,
          style: { ...(prev.presentation?.style || {}), ...updates }
        } as Presentation
      }));
    } else {
      const styleKeys = [
        'color', 'indicatorColor', 'glowColor', 'glassColor', 'font', 'fontSize', 
        'fontColor', 'opacity', 'intensity', 'rounding', 'shadow', 'blur', 'texture'
      ];

      setCellData(prev => {
        const attachments = (prev.presentation?.attachments || []).map((a) => {
          if (a.id !== id) return a;
          const rootUpdates: Record<string, unknown> = {};
          const styleUpdates: Record<string, unknown> = {};
          Object.keys(updates).forEach(key => {
            if (styleKeys.includes(key)) styleUpdates[key] = updates[key];
            else rootUpdates[key] = updates[key];
          });
          const newAttachment = { ...a, ...rootUpdates };
          if (Object.keys(styleUpdates).length > 0) {
            newAttachment.style = { ...(a.style || {}), ...styleUpdates };
          }
          return newAttachment;
        });
        return { 
          ...prev, 
          presentation: { 
            tab: prev.presentation?.tab || 'MAIN',
            component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
            variant: prev.presentation?.variant || 'standard',
            offsetX: prev.presentation?.offsetX || 0,
            offsetY: prev.presentation?.offsetY || 0,
            ...prev.presentation, 
            attachments 
          } as Presentation 
        };
      });
    }
  }, []);

  const openAssetSelector = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
    setIsAssetSelectorOpen(true);
  }, []);

  const closeAssetSelector = useCallback(() => {
    setIsAssetSelectorOpen(false);
    setActiveLayerId(null);
  }, []);

  const toggleCommandCenter = useCallback(() => {
    setIsCommandCenterOpen(prev => !prev);
  }, []);

  const resetTestValue = useCallback(() => {
    updateFragment('host', { testValue: 0.75 });
    setTestValue(0.75);
  }, [updateFragment]);

  // ========== COMPUTED VALUES ==========

  // Get current style values based on selection
  const currentStyleValues = useMemo(() => {
    if (selectedFragmentId === 'host') {
      return cellData.presentation?.style || {};
    }
    const fragment = (cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId);
    return fragment?.style || {};
  }, [selectedFragmentId, cellData.presentation]);

  // Get current fragment type
  const currentFragmentType = useMemo(() => {
    if (selectedFragmentId === 'host') {
      return cellData.type as string;
    }
    const fragment = (cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId);
    return fragment?.type || 'label';
  }, [selectedFragmentId, cellData.type, cellData.presentation]);

  // ========== STATE OBJECT ==========

  const state: CellStudioState = {
    cellData,
    behavior,
    recipe,
    activeTab,
    currentStep,
    selectedFragmentId,
    soloLayerId,
    isAssetSelectorOpen,
    activeLayerId,
    isCommandCenterOpen,
    isTypeLocked,
    testValue,
    description
  };

  // ========== ACTIONS OBJECT ==========

  const actions: CellStudioActions = {
    // Cell data
    setCellData,
    updateLabel,
    updateType,
    
    // Behavior
    setBehavior,
    updateBehaviorPreset,
    updateBehaviorMapping,
    
    // Recipe
    setRecipe,
    updateRecipeLayers,
    
    // Fragments
    addFragment,
    removeFragment,
    moveFragment,
    updateFragment,
    
    // UI navigation
    setActiveTab,
    setCurrentStep,
    
    // Selection
    setSelectedFragmentId,
    setSoloLayerId,
    
    // Description
    setDescription,
    
    // Modal/overlay
    setIsAssetSelectorOpen,
    setIsCommandCenterOpen,
    openAssetSelector,
    closeAssetSelector,
    toggleCommandCenter,
    
    // Test value
    setTestValue,
    resetTestValue
  };

  return {
    state,
    actions,
    // Convenience exports
    currentStyleValues,
    currentFragmentType
  };
}

// Re-export types for consumers
export type { ManifestEntity, OMEGA_Manifest, AssetBehavior, LayerRecipe };

// Export defaults for reference
export { DEFAULT_BEHAVIOR, DEFAULT_RECIPE };