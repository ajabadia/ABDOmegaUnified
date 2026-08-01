/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

import { useMemo, useCallback } from 'react';
import type { OmegaNode } from '../../types/manifest';

export interface A11yAttributes {
  role: string;
  'aria-label': string;
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  tabIndex: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function getRoleForKind(kind: string): string {
  switch (kind) {
    case 'knob':
    case 'slider-v':
    case 'slider-h':
    case 'slider':
      return 'slider';
    case 'button':
    case 'switch':
      return 'button';
    case 'led':
      return 'status';
    case 'display':
      return 'status';
    case 'port':
      return 'region';
    default:
      return 'generic';
  }
}

export function useA11y(
  node: OmegaNode,
  value: number,
  onValueChange?: (id: string, value: number) => void,
): A11yAttributes {
  const kind = node.cellRef || node.kind || 'knob';
  const role = useMemo(() => getRoleForKind(kind), [kind]);
  const label = (node.meta?.label as string) || `${kind} control ${node.id}`;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!onValueChange) return;

    if (role === 'slider' && (e.key === 'ArrowUp' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation();
      onValueChange(node.id, Math.min(1, value + 0.05));
      return;
    }

    if (role === 'slider' && (e.key === 'ArrowDown' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      e.stopPropagation();
      onValueChange(node.id, Math.max(0, value - 0.05));
      return;
    }

    if (role === 'button' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      onValueChange(node.id, value >= 0.5 ? 0 : 1);
      return;
    }
  }, [node.id, value, onValueChange, role]);

  const a11y: A11yAttributes = useMemo(() => {
    const attrs: A11yAttributes = {
      role,
      'aria-label': label,
      tabIndex: node.locked ? -1 : 0,
      onKeyDown: handleKeyDown,
    };

    if (role === 'slider') {
      attrs['aria-valuenow'] = value;
      attrs['aria-valuemin'] = 0;
      attrs['aria-valuemax'] = 1;
    }

    return attrs;
  }, [role, label, node.locked, handleKeyDown, value]);

  return a11y;
}
