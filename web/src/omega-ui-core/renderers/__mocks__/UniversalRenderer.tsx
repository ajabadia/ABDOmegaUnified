/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

import React from 'react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

interface MockProps {
  node?: OmegaNode;
  debugContext?: Record<string, unknown>;
  [key: string]: unknown;
}

export function UniversalRenderer({ node, debugContext }: MockProps) {
  const dc = debugContext ?? {};
  return React.createElement('div', {
    'data-testid': 'universal-renderer',
    'data-node-id': (node as OmegaNode | undefined)?.id ?? '',
    'data-node-kids': String(((node as OmegaNode | undefined)?.children ?? []).length),
    'data-selected': (dc.selectedId as string) ?? '',
    'data-multi': ((dc.multiSelectedIds as string[]) ?? []).join(','),
    'data-hidden': ((dc.hiddenNodeIds as string[]) ?? []).join(','),
    'data-locked': ((dc.lockedNodeIds as string[]) ?? []).join(','),
  });
}
