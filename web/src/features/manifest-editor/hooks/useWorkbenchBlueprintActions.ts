'use client';

/**
 * @purpose Gestiona acciones de blueprints: aplicar plantillas, cargar acepack, seleccionar blueprints.
 * @purpose_en Manages blueprint actions: apply templates, load acepacks, select blueprints.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:new
 * @lastUpdated 2026-06-22
 */

import { useCallback } from 'react';
import type { ModuleTemplate, OMEGA_Manifest, BlueprintDefinition } from '@/omega-ui-core/types';
import type { V2BlueprintData } from '@/omega-ui-core/types';
import { adaptModuleTemplateToBlueprintDefinition, adaptV2BlueprintToBlueprintDefinition } from '../utils/blueprintUtils';

export interface WorkbenchBlueprintActions {
  handleApplyTemplate: (template: ModuleTemplate) => void;
  handleLoadAcepack: () => Promise<void>;
  handleSelectUserBlueprint: (blueprint: BlueprintDefinition) => void;
  handleSelectBlueprintFromPanel: (v2data: V2BlueprintData) => void;
  handleAltClickBlueprintFromPanel: (v2data: V2BlueprintData) => void;
  handleSaveGroupFromId: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCallback = (...args: any[]) => any;

export function useWorkbenchBlueprintActions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: Record<string, any>,
  addUserBlueprintEntry: AnyCallback,
  handleSaveGroupAsBlueprintFromNodeId: AnyCallback,
  manifest: OMEGA_Manifest,
  ghostPreview: {
    startGhostPreview: (bp: BlueprintDefinition) => void;
    activeBlueprint: BlueprintDefinition | null;
    cancelGhostPreview: () => void;
    updateGhostAtRackCoords: (x: number, y: number, manifest: OMEGA_Manifest) => void;
  },
  setIsGalleryOpen: (open?: boolean) => void,
): WorkbenchBlueprintActions {
  const handleApplyTemplate = useCallback((template: ModuleTemplate) => {
    try {
      const blueprint = adaptModuleTemplateToBlueprintDefinition(template);
      editor.applyTemplate(blueprint);
      setIsGalleryOpen(false);
    } catch (err) {
      console.error("[BLUEPRINT] Failed to adapt legacy template:", err);
    }
  }, [editor, setIsGalleryOpen]);

  const handleLoadAcepack = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.acepack,.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const result = await editor.handleBlueprintUpload(file);
      if (result) {
        addUserBlueprintEntry(result);
      }
    };
    input.click();
  }, [editor, addUserBlueprintEntry]);

  const handleSelectUserBlueprint = useCallback((blueprint: BlueprintDefinition) => {
    editor.applyTemplate(blueprint);
  }, [editor]);

  const handleSaveGroupFromId = useCallback((id: string) => {
    handleSaveGroupAsBlueprintFromNodeId(id, manifest.ui?.tree);
  }, [handleSaveGroupAsBlueprintFromNodeId, manifest]);

  const handleSelectBlueprintFromPanel = useCallback((v2data: V2BlueprintData) => {
    try {
      const blueprint = adaptV2BlueprintToBlueprintDefinition(v2data);
      editor.applyTemplate(blueprint);
    } catch (err) {
      console.error("[BLUEPRINT] Failed to adapt V2 blueprint:", err);
    }
  }, [editor]);

  const handleAltClickBlueprintFromPanel = useCallback((v2data: V2BlueprintData) => {
    try {
      const blueprint = adaptV2BlueprintToBlueprintDefinition(v2data);
      ghostPreview.startGhostPreview(blueprint);
    } catch (err) {
      console.error("[BLUEPRINT] Failed to adapt V2 blueprint for ghost preview:", err);
    }
  }, [ghostPreview]);

  return {
    handleApplyTemplate,
    handleLoadAcepack,
    handleSelectUserBlueprint,
    handleSelectBlueprintFromPanel,
    handleAltClickBlueprintFromPanel,
    handleSaveGroupFromId,
  };
}
