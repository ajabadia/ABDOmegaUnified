'use client';

/**
 * @purpose Gestiona el estado y ciclo de vida de una pila de injeccion de plantillas en el editor de manifesto OMEGA, maneja dry-runs, finalizaciones y interacciones del usuario para insertar diagramas en manifests.
 * @purpose_en Manages the state and lifecycle of a blueprint injection pipeline in the OMEGA manifest editor, handling dry-runs, finalizations, and user interactions for inserting diagrams into manifests.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:bwrshz
 * @lastUpdated 2026-06-15T13:12:20.334Z
 */

import { useState, useCallback, useRef } from 'react';
import type { 
  OMEGA_Manifest, 
  BlueprintDefinition,
  BlueprintPlaceholderValues,
  CellTemplate
} from '@/omega-ui-core/types/manifest';
import type { 
  BlueprintInjectionRequest, 
  BlueprintInjectionResult 
} from '@/omega-ui-core/types/blueprint';
import { injectBlueprint } from '@/omega-ui-core/utils/ucaInjection';

/**
 * OMEGA Phase 9.4A - Industrial Blueprint Injection Hook
 * Manages the state and lifecycle of the 10-step injection pipeline.
 */
export const useBlueprintInjection = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest>, label: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void
) => {
  const [activeBlueprint, setActiveBlueprint] = useState<BlueprintDefinition | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [lastResult, setLastResult] = useState<BlueprintInjectionResult | null>(null);
  const [previewManifest, setPreviewManifest] = useState<OMEGA_Manifest | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<BlueprintPlaceholderValues>({});

  const isInProgressRef = useRef(false);

  /**
   * Dry-run for preview (Non-mutant)
   */
  const executeDryRun = useCallback(async (
    blueprint: BlueprintDefinition, 
    targetId: string | undefined, 
    values: BlueprintPlaceholderValues
  ) => {
    const request: BlueprintInjectionRequest = {
      blueprintId: blueprint.blueprintId,
      placeholderValues: values,
      manifestId: manifest.id || '',
      mode: 'commit', // We use 'commit' mode but don't apply it to orchestrator
      strategy: {
        targetParentNodeId: targetId || null,
        idCollisionStrategy: 'remap',
        dryRun: true,
        forceIdRemap: true
      }
    };

    const templates = (manifest.moduleTemplates || {}) as Record<string, CellTemplate>;
    const result = await injectBlueprint(manifest, blueprint, request, { templates });
    if (result.success && result.resultManifest) {
      setPreviewManifest(result.resultManifest);
    } else if (result.success && result.injectedSubtree) {
      // Generate preview by forcing dryRun: false internally
      const previewRequest = { ...request, strategy: { ...request.strategy, dryRun: false } };
      const previewResult = await injectBlueprint(manifest, blueprint, previewRequest, { templates });
      setPreviewManifest(previewResult.resultManifest || null);
    }
  }, [manifest]);

  /**
   * Internal execution logic (Final Commit)
   */
  const executeInjection = useCallback(async (
    blueprint: BlueprintDefinition, 
    targetId: string | undefined, 
    values: BlueprintPlaceholderValues
  ) => {
    if (isInProgressRef.current) return;
    isInProgressRef.current = true;

    try {
      const request: BlueprintInjectionRequest = {
        blueprintId: blueprint.blueprintId,
        placeholderValues: values,
        manifestId: manifest.id || '',
        mode: 'commit',
        strategy: {
          targetParentNodeId: targetId || null,
          idCollisionStrategy: 'remap',
          dryRun: false,
          forceIdRemap: true
        }
      };

      addLog(`[SYSTEM] Committing Blueprint injection: ${blueprint.name}...`);
      
      const templates = (manifest.moduleTemplates || {}) as Record<string, CellTemplate>;
      const result = await injectBlueprint(manifest, blueprint, request, { templates });
      setLastResult(result);

      if (!result.success) {
        addLog(`[ERROR] Injection failed: ${result.fatalError?.message} (${result.fatalError?.code})`);
        return;
      }

      if (result.resultManifest) {
        const label = `[BLUEPRINT] Inject ${blueprint.name} (v${blueprint.version})`;
        updateManifest(result.resultManifest, label, true);
        addLog(`[SUCCESS] ${blueprint.name} inserted successfully.`);
      }
    } catch (err: unknown) {
      addLog(`[ERROR] Injection failed due to internal error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Cleanup
      setIsPromptOpen(false);
      setActiveBlueprint(null);
      setTargetParentId(null);
      setPreviewManifest(null);
      setPlaceholderValues({});
      isInProgressRef.current = false;
    }
  }, [manifest, updateManifest, addLog]);

  /**
   * Initiates the injection flow.
   */
  const startInjection = useCallback((blueprint: BlueprintDefinition, targetId?: string) => {
    if (isInProgressRef.current) return;
    
    setActiveBlueprint(blueprint);
    setTargetParentId(targetId || null);
    
    const initialValues: BlueprintPlaceholderValues = {};
    blueprint.placeholders?.forEach(p => {
      initialValues[p.id] = p.defaultValue;
    });
    setPlaceholderValues(initialValues);

    if (blueprint.placeholders && blueprint.placeholders.length > 0) {
      setIsPromptOpen(true);
      executeDryRun(blueprint, targetId, initialValues);
    } else {
      executeInjection(blueprint, targetId, {});
    }
  }, [executeInjection, executeDryRun]);

  /**
   * Update placeholders and refresh preview
   */
  const updatePlaceholder = useCallback((id: string, value: string | number | boolean) => {
    if (!activeBlueprint) return;
    const nextValues = { ...placeholderValues, [id]: value };
    setPlaceholderValues(nextValues);
    executeDryRun(activeBlueprint, targetParentId || undefined, nextValues);
  }, [activeBlueprint, placeholderValues, targetParentId, executeDryRun]);

  /**
   * Finalizes the injection.
   */
  const confirmInjection = useCallback(() => {
    if (!activeBlueprint) return;
    executeInjection(activeBlueprint, targetParentId || undefined, placeholderValues);
  }, [activeBlueprint, targetParentId, placeholderValues, executeInjection]);

  const cancelInjection = useCallback(() => {
    setIsPromptOpen(false);
    setActiveBlueprint(null);
    setTargetParentId(null);
    setPreviewManifest(null);
    setPlaceholderValues({});
  }, []);

  return {
    activeBlueprint,
    placeholderValues,
    previewManifest,
    isPromptOpen,
    setIsPromptOpen,
    startInjection,
    updatePlaceholder,
    confirmInjection,
    cancelInjection,
    lastResult
  };
};

