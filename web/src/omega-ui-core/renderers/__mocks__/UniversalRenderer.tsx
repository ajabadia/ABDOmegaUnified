/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
