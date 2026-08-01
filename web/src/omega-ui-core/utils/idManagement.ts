/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * OMEGA ERA 7.2.3 — Canonical ID Management Utilities
 * Deep cloning and recursive ID regeneration.
 */

import type { ManifestEntity, OmegaNode, Attachment } from '../types/manifest';

export const regenerateEntityId = (entity: ManifestEntity): ManifestEntity => {
  const newId = `ent_${crypto.randomUUID().slice(0, 8)}`;
  const cloned = structuredClone(entity);
  cloned.id = newId;

  if (cloned.presentation?.attachments) {
    cloned.presentation.attachments = cloned.presentation.attachments.map((att: Attachment) => ({
      ...att,
      id: `att_${crypto.randomUUID().slice(0, 8)}`,
    }));
  }

  return cloned;
};

export const cloneAndRegenerateNodeIds = (node: OmegaNode): { node: OmegaNode; idMap: Record<string, string> } => {
  const idMap: Record<string, string> = {};

  const processNode = (n: OmegaNode): OmegaNode => {
    const oldId = n.id;
    const newId = `node_${crypto.randomUUID().slice(0, 8)}`;
    idMap[oldId] = newId;

    const cloned: OmegaNode = {
      ...structuredClone(n),
      id: newId,
    };

    if (cloned.children && cloned.children.length > 0) {
      cloned.children = cloned.children.map(child => processNode(child));
    }

    return cloned;
  };

  const newNode = processNode(node);
  return { node: newNode, idMap };
};
