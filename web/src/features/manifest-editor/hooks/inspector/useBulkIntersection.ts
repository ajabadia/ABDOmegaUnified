'use client';

import { useMemo } from 'react';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

export interface BulkPropertyValue {
  common: boolean;
  value: unknown;
  values: unknown[];
}

export interface BulkIntersection {
  count: number;
  layout: {
    width: BulkPropertyValue;
    height: BulkPropertyValue;
  };
  role: BulkPropertyValue;
  zIndex: BulkPropertyValue;
  label: BulkPropertyValue;
  style: Record<string, BulkPropertyValue>;

}

function getSelectedNodes(ids: string[], root: OmegaNode): OmegaNode[] {
  return ids.map(id => findNodeInTree(root, id)).filter(Boolean) as OmegaNode[];
}

function compareValues(values: unknown[]): BulkPropertyValue {
  const first = values[0];
  const allSame = values.every(v => v === first);
  return {
    common: allSame,
    value: allSame ? first : null,
    values,
  };
}

function getNodeLabel(node: OmegaNode): string {
  const label = node.meta?.label;
  return typeof label === 'string' ? label : node.id;
}

export function useBulkIntersection(
  multiSelectedIds: string[] | undefined,
  manifest: OMEGA_Manifest | null,
): BulkIntersection | null {
  return useMemo(() => {
    if (!multiSelectedIds || multiSelectedIds.length < 2 || !manifest?.ui?.tree) {
      return null;
    }

    const nodes = getSelectedNodes(multiSelectedIds, manifest.ui.tree);
    if (nodes.length < 2) return null;

    const widths = nodes.map(n => n.layout?.size?.width);
    const heights = nodes.map(n => n.layout?.size?.height);
    const roles = nodes.map(n => n.role ?? 'control');
    const zIndices = nodes.map(n => n.style?.zIndex ?? n.layout.zIndex);
    const labels = nodes.map(getNodeLabel);

    const allNumeric = (arr: unknown[]): boolean => arr.every(v => typeof v === 'number');

    return {
      count: nodes.length,
      layout: {
        width: allNumeric(widths) ? compareValues(widths) : { common: false, value: null, values: widths },
        height: allNumeric(heights) ? compareValues(heights) : { common: false, value: null, values: heights },
      },
      role: compareValues(roles),
      zIndex: compareValues(zIndices),
      label: compareValues(labels),
      style: {} as Record<string, BulkPropertyValue>,
    };
  }, [multiSelectedIds, manifest]);
}
