import type { OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';
import { STORAGE_KEYS } from '@/omega-ui-core/constants/storage';

import { cloneAndRegenerateNodeIds } from '@/omega-ui-core/utils/idManagement';

/**
 * @purpose Gestiona operaciones del portapapeles para copiar y pegar nodos/entidades con regeneración automática de ID en el editor de manifesto OMEGA.
 * @purpose_en Manages clipboard operations for copying and pasting nodes/entites with automatic ID regeneration in the OMEGA manifest editor.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:6or5kr
 * @lastUpdated 2026-06-23
 */
export const ClipboardService = {
  copy: (items: (OmegaNode | ManifestEntity)[]) => {
    const data = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEYS.CLIPBOARD, data);
    window.dispatchEvent(new CustomEvent('clipboard-storage-changed'));
    console.log(`[CLIPBOARD] Copied ${items.length} item(s) to clipboard.`);
  },

  paste: (): (OmegaNode | ManifestEntity)[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CLIPBOARD);
    if (!data) return [];

    try {
      const parsed = JSON.parse(data);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      return items.map((item: OmegaNode | ManifestEntity) => {
        if ('kind' in item) {
          const result = cloneAndRegenerateNodeIds(item as OmegaNode);
          return result.node;
        }
        return item;
      });
    } catch (e) {
      console.error('[CLIPBOARD] Paste failed:', e);
      return [];
    }
  },

  hasContent: (): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.CLIPBOARD);
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.length > 0 : true;
    } catch {
      return false;
    }
  }
};
