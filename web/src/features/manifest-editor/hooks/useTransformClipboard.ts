'use client';

/**
 * @purpose Gestiona la copia y pestaña de datos transformados (tamaño + rotación) entre nodos en el editor de manifesto OMEGA.
 * @purpose_en Manages copying and pasting transform data (size + rotation) between nodes in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1xrpi4s
 * @lastUpdated 2026-06-20T11:07:46.497Z
 */

import { useCallback, useRef } from 'react';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { computeScaleUpdates, computeRotationUpdates, getNodeRotation } from '@/omega-ui-core/renderers/utils/scaleUtils';

interface TransformClipboardData {
  width: number;
  height: number;
  rotation: number;
}

interface TransformClipboardActions {
  handleCopyTransform: () => void;
  handlePasteTransform: () => void;
}

export function useTransformClipboard(
  selectedItemId: string | null,
  editor: {
    findItem: (id: string) => unknown;
    updateItems?: (updates: Record<string, Partial<OmegaNode>>) => void;
    addLog?: (msg: string) => void;
  },
  manifest: OMEGA_Manifest,
): TransformClipboardActions {
  const copiedTransformRef = useRef<TransformClipboardData | null>(null);

  const handleCopyTransform = useCallback(() => {
    if (!selectedItemId) return;
    const node = editor.findItem(selectedItemId) as OmegaNode | undefined;
    if (!node) return;
    const size = node.layout?.size;
    if (size) {
      copiedTransformRef.current = {
        width: size.width,
        height: size.height,
        rotation: getNodeRotation(node),
      };
      editor.addLog?.('[TRANSFORM] Copied dimensions');
    }
  }, [selectedItemId, editor]);

  const handlePasteTransform = useCallback(() => {
    if (!selectedItemId || !copiedTransformRef.current) return;
    const { width, height, rotation } = copiedTransformRef.current;
    const node = editor.findItem(selectedItemId) as OmegaNode | undefined;
    if (!node) return;
    const pos = node.layout?.pos ?? { x: 0, y: 0 };
    const updates = computeScaleUpdates(selectedItemId, width, height, pos.x, pos.y, manifest);
    if (rotation !== 0) {
      const rotUpdates = computeRotationUpdates(selectedItemId, rotation, manifest);
      const rotLayout = rotUpdates[selectedItemId]?.layout;
      if (rotLayout) {
        updates[selectedItemId] = {
          ...updates[selectedItemId],
          layout: {
            pos: updates[selectedItemId]?.layout?.pos ?? rotLayout.pos,
            size: updates[selectedItemId]?.layout?.size ?? rotLayout.size,
            transform: rotLayout.transform,
          },
        };
      }
    }
    editor.updateItems?.(updates);
    editor.addLog?.('[TRANSFORM] Pasted dimensions + rotation');
  }, [selectedItemId, manifest, editor]);

  return { handleCopyTransform, handlePasteTransform };
}
