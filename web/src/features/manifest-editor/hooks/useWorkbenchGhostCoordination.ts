'use client';

/**
 * @purpose Coordina la previsualización fantasma de blueprints en el viewport.
 * @purpose_en Coordinates ghost preview of blueprints in the viewport.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, BlueprintDefinition } from '@/omega-ui-core/types';

export interface WorkbenchGhostCoordination {
  handleGhostClick: (x: number, y: number) => void;
  handleGhostMouseMove: (rackX: number, rackY: number) => void;
  handleGhostCancel: () => void;
}

export function useWorkbenchGhostCoordination(
  ghostPreview: {
    activeBlueprint: BlueprintDefinition | null;
    cancelGhostPreview: () => void;
    updateGhostAtRackCoords: (x: number, y: number, manifest: OMEGA_Manifest) => void;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: Record<string, any>,
  manifest: OMEGA_Manifest,
): WorkbenchGhostCoordination {
  const handleGhostClick = useCallback((x: number, y: number) => {
    const bp = ghostPreview.activeBlueprint;
    if (!bp) return;
    const updatedBlueprint: BlueprintDefinition = {
      ...bp,
      rootNode: {
        ...bp.rootNode,
        layout: {
          ...bp.rootNode.layout,
          pos: { x: Math.round(x), y: Math.round(y) },
        },
      },
    };
    editor.applyTemplate(updatedBlueprint);
    ghostPreview.cancelGhostPreview();
  }, [ghostPreview, editor]);

  const handleGhostMouseMove = useCallback((rackX: number, rackY: number) => {
    ghostPreview.updateGhostAtRackCoords(rackX, rackY, manifest);
  }, [ghostPreview, manifest]);

  const handleGhostCancel = useCallback(() => {
    ghostPreview.cancelGhostPreview();
  }, [ghostPreview]);

  return { handleGhostClick, handleGhostMouseMove, handleGhostCancel };
}
