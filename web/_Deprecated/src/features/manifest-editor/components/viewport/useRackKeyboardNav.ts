"use client";

/**
 * @purpose Gestiona la navegación del teclado para los nodos seleccionados en el viewport del bastidor actualizando sus posiciones según presiones de teclas de flecha.
 * @purpose_en Handles keyboard navigation for selected nodes in the rack viewport by updating their positions based on arrow key presses.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:mfwagd
 * @lastUpdated 2026-06-15T13:01:41.975Z
 */

import { useEffect } from "react";
import type { OMEGA_Manifest } from "@/omega-ui-core/types/manifest";
import { findNodeInTree } from "@/omega-ui-core/utils/treeUtils";
/** * Hook extracted from VirtualRack. * Handles arrow key positioning for the selected node in the rack viewport. */ export function useRackKeyboardNav(
  selectedItemId: string | null,
  manifest: OMEGA_Manifest,
  onUpdateItem: (
    id: string,
    updates: Partial<import("@/omega-ui-core/types/manifest").ManifestEntity>,
  ) => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrows.includes(e.key)) return;
      if (!selectedItemId) return;
      e.preventDefault();
      const tree = manifest.ui?.tree;
      if (!tree) return;
      const node = findNodeInTree(tree, selectedItemId);
      if (!node || !node.layout?.pos || node.kind === "rack") return;
      const step = e.shiftKey ? manifest.ui?.layout?.grid?.spacingX || 22.5 : 1;
      const delta = { x: 0, y: 0 };
      if (e.key === "ArrowUp") delta.y = -step;
      if (e.key === "ArrowDown") delta.y = step;
      if (e.key === "ArrowLeft") delta.x = -step;
      if (e.key === "ArrowRight") delta.x = step;
      onUpdateItem(selectedItemId, {
        layout: {
          ...node.layout,
          pos: {
            x: Math.round((node.layout.pos.x || 0) + delta.x),
            y: Math.round((node.layout.pos.y || 0) + delta.y),
          },
        },
      } as Record<string, unknown> as Partial<
        import("@/omega-ui-core/types/manifest").ManifestEntity
      >);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, manifest, onUpdateItem]);
}
