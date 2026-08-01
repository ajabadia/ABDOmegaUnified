/**
 * @purpose Gestiona y proporciona funciones útiles para filtrar y gestionar capas en el panel de capas del editor de manifesto OMEGA.
 * @purpose_en Manages and provides utility functions for filtering and managing layers in the LayersPanel of the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:6,imports:3,sig:1pmi8bm
 * @lastUpdated 2026-06-19T18:47:36.364Z
 */

import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { getNodeComponentType, type ComponentTypeFilter } from '@/features/manifest-editor/hooks/useLayerFilters';
import type { FlatTreeItem } from './LayerRow';

// ── Constants ────────────────────────────────────────────────────────────
export const ROW_HEIGHT = 26;

// ── Interfaces ───────────────────────────────────────────────────────────
export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  isGroup: boolean;
}

export interface FilterParams {
  searchTerm: string;
  typeFilter: ComponentTypeFilter;
  showHidden: boolean;
  showLocked: boolean;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  propertySearchTerm: string;
  showAuditIssues: boolean;
  auditNodeIds: string[];
  showTemplates: boolean;
}

// ── Filter check helper ──────────────────────────────────────────────────
export function checkNodePassesFilters(
  node: OmegaNode,
  filters: FilterParams,
): boolean {
  const {
    searchTerm, typeFilter,
    showHidden, showLocked,
    hiddenNodeIds, lockedNodeIds,
    propertySearchTerm, showAuditIssues,
    auditNodeIds, showTemplates,
  } = filters;

  const nodeType = getNodeComponentType(node);
  const typeOk = typeFilter === 'all' || nodeType === typeFilter;
  const isHidden = hiddenNodeIds.includes(node.id);
  const isLocked = lockedNodeIds.includes(node.id);
  const stateOk = (!showHidden && !showLocked) || (showHidden && isHidden) || (showLocked && isLocked);
  const textOk = !searchTerm ||
    node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.meta?.label as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.cellRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.kind?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.bind?.toLowerCase()?.includes(searchTerm.toLowerCase());
  const term = propertySearchTerm?.toLowerCase();
  const propOk = !term || (
    node.bind?.toLowerCase()?.includes(term) ||
    (typeof node.meta?.value === 'string' && (node.meta.value as string).toLowerCase().includes(term)) ||
    (typeof node.meta?.value === 'number' && String(node.meta.value).toLowerCase().includes(term)) ||
    (typeof node.meta?.min === 'number' && String(node.meta.min).toLowerCase().includes(term)) ||
    (typeof node.meta?.max === 'number' && String(node.meta.max).toLowerCase().includes(term))
  );
  const auditOk: boolean = !showAuditIssues || auditNodeIds.includes(node.id);
  const templateOk: boolean = !showTemplates || !!node.templateRef;
  return !!(typeOk && stateOk && textOk && propOk && auditOk && templateOk);
}

// ── Flatten tree for virtual scrolling ──────────────────────────────────
export function flattenVisibleTree(
  root: OmegaNode,
  expandedMap: Record<string, boolean>,
  filterParams: FilterParams,
): { items: FlatTreeItem[]; flatNodeIds: string[]; visibleCount: number } {
  const visibleNodes = new Set<string>();
  function markVisible(node: OmegaNode): boolean {
    const selfVisible = checkNodePassesFilters(node, filterParams);
    let childVisible = false;
    if (node.children) {
      for (const child of node.children) {
        if (markVisible(child)) childVisible = true;
      }
    }
    const isVisible = selfVisible || childVisible;
    if (isVisible) visibleNodes.add(node.id);
    return isVisible;
  }
  markVisible(root);

  const items: FlatTreeItem[] = [];
  const flatNodeIds: string[] = [];
  let visibleCount = 0;

  function buildList(node: OmegaNode, depth: number) {
    if (!visibleNodes.has(node.id)) return;
    const isExpanded = expandedMap[node.id] !== false;
    const hasChildren = !!(node.children?.length);
    items.push({ id: node.id, node, depth, hasChildren, isExpanded });
    flatNodeIds.push(node.id);
    visibleCount++;
    if (hasChildren && isExpanded) {
      for (const child of node.children!) {
        buildList(child, depth + 1);
      }
    }
  }

  buildList(root, 0);
  return { items, flatNodeIds, visibleCount };
}

// ── Variant class helper ────────────────────────────────────────────────
export function variantClass<T>(map: Record<string, T>, key: string): string {
  return (map as unknown as Record<string, string>)[key] ?? '';
}
