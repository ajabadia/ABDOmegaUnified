'use client';

/**
 * @purpose Gestiona el estado y la lógica para una previsualización fantasma, incluyendo detección de colisiones y actualización de posición según la entrada del usuario.
 * @purpose_en Manages the state and logic for a ghost preview feature in the OMEGA manifest editor, including collision detection and updating position based on user input.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1d38n7q
 * @lastUpdated 2026-06-15T13:21:56.584Z
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { OMEGA_Manifest, OmegaNode, BlueprintDefinition, GridConfig } from '@/omega-ui-core/types/manifest';
import { snapToGrid } from '@/omega-ui-core/uca/spatialConstraints';
import { computeSubtreeBounds, getOccupiedBoxes } from '@/omega-ui-core/utils/spatialUtils';

interface CollisionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxesIntersect(a: CollisionBox, b: CollisionBox): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/** Convert screen client coordinates to rack-local pixel coordinates. */
function screenToRack(
  clientX: number,
  clientY: number,
  rackElement: HTMLElement,
  zoom: number
): { x: number; y: number } {
  const rect = rackElement.getBoundingClientRect();
  const dx = clientX - rect.left;
  const dy = clientY - rect.top;
  return {
    x: dx / zoom,
    y: dy / zoom,
  };
}

export function useGhostPreview() {
  const [activeBlueprint, setActiveBlueprint] = useState<BlueprintDefinition | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [ghostSize, setGhostSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isCollision, setIsCollision] = useState(false);
  const [isGhostVisible, setIsGhostVisible] = useState(false);

  const ghostSizeRef = useRef({ width: 0, height: 0 });

  /** Enter ghost preview mode with a selected blueprint. */
  const startGhostPreview = useCallback((blueprint: BlueprintDefinition) => {
    const size = computeSubtreeBounds(blueprint.rootNode as OmegaNode);
    ghostSizeRef.current = size;
    setGhostSize(size);
    setActiveBlueprint(blueprint);
    setIsGhostVisible(true);
    setGhostPosition(null);
    setIsCollision(false);
  }, []);

  /** Cancel ghost preview and reset state. */
  const cancelGhostPreview = useCallback(() => {
    setActiveBlueprint(null);
    setGhostPosition(null);
    setIsGhostVisible(false);
    setIsCollision(false);
  }, []);

  /**
   * Update ghost position from pre-converted rack-local coordinates.
   * This is used by VirtualRack which does the screen→rack conversion itself.
   */
  const updateGhostAtRackCoords = useCallback((
    rackX: number,
    rackY: number,
    manifest: OMEGA_Manifest
  ) => {
    const gridConfig = (manifest.ui?.layout?.grid as GridConfig | undefined) || {
      enabled: true, spacingX: 24, spacingY: 24, snapMode: 'center' as const
    };

    const snappedPos = gridConfig.enabled
      ? snapToGrid({ x: rackX, y: rackY }, { ...gridConfig, enabled: true })
      : { x: rackX, y: rackY };

    setGhostPosition(snappedPos);

    // ── Collision detection ────────────────────────────────────────
    const size = ghostSizeRef.current;
    if (size.width === 0 || size.height === 0) {
      setIsCollision(false);
      return;
    }

    const ghostBox: CollisionBox = {
      x: snappedPos.x,
      y: snappedPos.y,
      w: size.width,
      h: size.height,
    };

    const occupied = getOccupiedBoxes(manifest);
    const hasCollision = occupied.some((box) => boxesIntersect(ghostBox, box));
    
    setIsCollision(hasCollision);
  }, []);

  /** Update ghost position from a mouse event on the rack container. */
  const updateGhostPosition = useCallback((
    clientX: number,
    clientY: number,
    rackElement: HTMLElement,
    zoom: number,
    manifest: OMEGA_Manifest
  ) => {
    const rawPos = screenToRack(clientX, clientY, rackElement, zoom);
    updateGhostAtRackCoords(rawPos.x, rawPos.y, manifest);
  }, [updateGhostAtRackCoords]);

  return useMemo(() => ({
    activeBlueprint,
    ghostPosition,
    ghostSize,
    isCollision,
    isGhostVisible,
    startGhostPreview,
    cancelGhostPreview,
    updateGhostPosition,
    updateGhostAtRackCoords,
  }), [activeBlueprint, ghostPosition, ghostSize, isCollision, isGhostVisible, startGhostPreview, cancelGhostPreview, updateGhostPosition, updateGhostAtRackCoords]);
}
