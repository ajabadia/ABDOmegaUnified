'use client';

/**
 * @purpose Gestiona acciones del clipboard para transferir entidades entre documentos en el editor de manifesto OMEGA.
 * @purpose_en Manages clipboard actions for transferring entities between documents in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1j55r3e
 * @lastUpdated 2026-06-23
 */

import { useCallback } from 'react';
import { ClipboardService } from '@/services/clipboardService';
import { toast } from '@/features/manifest-editor/utils/toast';
import type { OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';

interface ClipboardDependencies {
  findItem: (id: string) => OmegaNode | ManifestEntity | undefined;
  pasteEntities: (entities: (OmegaNode | ManifestEntity)[], targetPos?: { x: number; y: number }) => string[];
  removeItems: (ids: string[]) => void;
  addLog: (msg: string) => void;
}

/**
 * OMEGA ERA 7.2.3 - CLIPBOARD ACTIONS HOOK
 * Handles cross-document entity transfer.
 */
export const useClipboardActions = ({
  findItem,
  pasteEntities,
  removeItems,
  addLog
}: ClipboardDependencies) => {
  const copyToClipboard = useCallback((ids: string[]) => {
    const items: (OmegaNode | ManifestEntity)[] = [];
    for (const id of ids) {
      const item = findItem(id);
      if (item) items.push(item);
    }
    if (items.length > 0) {
      ClipboardService.copy(items);
      addLog(`[SYSTEM] Copied ${items.length} item(s) to clipboard.`);
      toast.success(`Copied ${items.length} item(s) to clipboard`);
    }
  }, [findItem, addLog]);

  const cutToClipboard = useCallback((ids: string[]) => {
    const items: (OmegaNode | ManifestEntity)[] = [];
    for (const id of ids) {
      const item = findItem(id);
      if (item) items.push(item);
    }
    if (items.length > 0) {
      ClipboardService.copy(items);
      removeItems(ids);
      addLog(`[SYSTEM] Cut ${items.length} item(s) to clipboard.`);
      toast.success(`Cut ${items.length} item(s) to clipboard`);
    }
  }, [findItem, removeItems, addLog]);

  const pasteFromClipboard = useCallback((targetPos?: { x: number; y: number }) => {
    const items = ClipboardService.paste();
    if (items.length > 0) {
      const newIds = pasteEntities(items, targetPos);
      addLog(`[SYSTEM] Paste Complete: ${newIds.length} item(s) pasted.`);
      toast.success(`Pasted ${newIds.length} item(s) from clipboard`);
      return newIds;
    } else {
      addLog(`[WARNING] Clipboard empty or incompatible data.`);
      toast.warning('Clipboard empty or incompatible data');
      return [];
    }
  }, [pasteEntities, addLog]);

  const hasClipboardContent = useCallback((): boolean => {
    return ClipboardService.hasContent();
  }, []);

  return {
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    hasClipboardContent
  };
};
