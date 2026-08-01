'use client';

/**
 * @purpose Gestiona las conexiones de archivo para entidades manifestadas en ABDOmegaEditor.
 * @purpose_en Manages attachments for manifest entities in ABDOmegaEditor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:ee9y4o
 * @lastUpdated 2026-06-15T13:11:44.846Z
 */

import { useState } from 'react';
import type { ManifestEntity, Attachment, AttachmentType } from '@/omega-ui-core/types/manifest';

export const useAttachmentsLogic = (item: ManifestEntity, onUpdate: (updates: Partial<ManifestEntity>) => void) => {
  const [expandedIdx, setExpandedIdx] = useState<number | string | null>('core');
  const attachments = item.presentation?.attachments || [];

  const coreAtt: Attachment = {
    id: 'core',
    isCore: true,
    type: (item.presentation?.component || (item.role === 'mod_target' ? 'port' : 'knob')) as AttachmentType,
    label: item.label || 'CORE',
    pos: item.pos || { x: 0, y: 0 },
    position: 'center',
    variant: item.presentation?.variant || 'B_cyan',
    bind: item.bind,
    offsetX: item.presentation?.offsetX || 0,
    offsetY: item.presentation?.offsetY || 0,
  };

  const addAttachment = () => {
    const newAtt: Attachment = { 
      id: `att_${Math.random().toString(36).substring(2, 9)}`,
      type: 'label', 
      label: 'NEW',
      pos: { x: 0, y: 0 },
      position: 'bottom', 
      offsetY: 0, 
      offsetX: 0, 
      variant: 'B_cyan' 
    };
    const nextAtts = [...attachments, newAtt];
    onUpdate({ presentation: { ...item.presentation!, attachments: nextAtts } });
    setExpandedIdx(nextAtts.length - 1);
  };

  const removeAttachment = (idx: number) => {
    onUpdate({ presentation: { ...item.presentation!, attachments: attachments.filter((_, i) => i !== idx) } });
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateAttachment = (idx: number | string, updates: Partial<Attachment>) => {
    if (idx === 'core') {
      const rootUpdates: Partial<ManifestEntity> = {};
      const presUpdates = { ...item.presentation! };

      if (updates.variant !== undefined) presUpdates.variant = updates.variant;
      if (updates.type !== undefined) presUpdates.component = updates.type;
      if (updates.offsetX !== undefined) presUpdates.offsetX = updates.offsetX;
      if (updates.offsetY !== undefined) presUpdates.offsetY = updates.offsetY;
      if (updates.bind !== undefined) rootUpdates.bind = updates.bind;

      onUpdate({ ...rootUpdates, presentation: presUpdates });
    } else {
      const newAtts = [...attachments];
      newAtts[idx as number] = { ...newAtts[idx as number], ...updates };
      onUpdate({ presentation: { ...item.presentation!, attachments: newAtts } });
    }
  };

  return {
    attachments,
    coreAtt,
    expandedIdx,
    setExpandedIdx,
    addAttachment,
    removeAttachment,
    updateAttachment
  };
};
