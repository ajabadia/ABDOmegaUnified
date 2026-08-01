'use client';

/**
 * @purpose Gestiona filtros de capas para el editor de manifesto OMEGA, incluyendo términos de búsqueda, tipos de componentes, visibilidad y filtros basados en propiedades.
 * @purpose_en Manages layer filters for the OMEGA manifest editor, including search terms, component types, visibility, and property-based filters.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:5,imports:3,sig:urky8l
 * @lastUpdated 2026-06-15T13:22:20.945Z
 */

import { useState, useMemo, useCallback } from 'react';
import { ListFilter, Disc, Radio, Sliders, Folder, Tv, Type, ToggleLeft, LayoutPanelTop } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

// ── Filter types ───────────────────────────────────────────────────────
export type ComponentTypeFilter = 'all' | 'knob' | 'port' | 'slider' | 'display' | 'container' | 'label' | 'switch' | 'button';

// ── Filter definitions for UI filter chips ─────────────────────────────
interface ComponentFilterDef {
  type: ComponentTypeFilter;
  label: string;
  icon: typeof Disc;
}

const COMPONENT_FILTERS: ComponentFilterDef[] = [
  { type: 'all', label: 'All', icon: ListFilter },
  { type: 'knob', label: 'Knob', icon: Disc },
  { type: 'port', label: 'Port', icon: Radio },
  { type: 'slider', label: 'Slider', icon: Sliders },
  { type: 'display', label: 'Display', icon: Tv },
  { type: 'container', label: 'Container', icon: Folder },
  { type: 'label', label: 'Label', icon: Type },
  { type: 'switch', label: 'Switch', icon: ToggleLeft },
  { type: 'button', label: 'Button', icon: LayoutPanelTop },
];

export { type ComponentFilterDef, COMPONENT_FILTERS };

export interface LayerFiltersResult {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  typeFilter: ComponentTypeFilter;
  setTypeFilter: (v: ComponentTypeFilter) => void;
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  showLocked: boolean;
  setShowLocked: (v: boolean) => void;
  // R1c — Property-based filters
  propertySearchTerm: string;
  setPropertySearchTerm: (v: string) => void;
  showAuditIssues: boolean;
  setShowAuditIssues: (v: boolean) => void;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  flatNodeIds: string[];
  visibleCount: number;
  totalCount: number;
  clearAllFilters: () => void;
}

// ── Extract node IDs from audit issue paths ────────────────────────────
// Audit issue paths follow the pattern: /ui/tree/node/{nodeId}/...
// We extract all unique node IDs with issues.
export function extractAuditNodeIds(issues: Array<{ path?: string }>): string[] {
  const ids = new Set<string>();
  for (const issue of issues) {
    if (!issue.path) continue;
    const match = issue.path.match(/^\/ui\/tree\/node\/([^\/]+)/);
    if (match && match[1]) {
      ids.add(match[1]);
    }
  }
  return Array.from(ids);
}

// ── Helper: determine component type of a node ─────────────────────────
export function getNodeComponentType(node: OmegaNode): ComponentTypeFilter {
  if (node.kind === 'container' || node.kind === 'rack' || node.kind === 'face' || node.kind === 'group') {
    return 'container';
  }
  if (node.kind === 'port') return 'port';
  const type = node.cellRef?.toLowerCase() || '';
  if (type === 'knob') return 'knob';
  if (type.includes('slider')) return 'slider';
  if (type === 'display') return 'display';
  if (type === 'label') return 'label';
  if (type === 'switch') return 'switch';
  if (type === 'button' || type === 'push') return 'button';
  if (node.kind === 'cell') return 'knob';
  return 'knob';
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useLayerFilters(
  tree: OmegaNode | undefined,
  hiddenNodeIds: string[],
  lockedNodeIds: string[],
  auditNodeIds: string[] = []
): LayerFiltersResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ComponentTypeFilter>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [showAuditIssues, setShowAuditIssues] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Flatten the tree for Shift+Click range selections & count results
  const { flatNodeIds, visibleCount, totalCount } = useMemo(() => {
    const ids: string[] = [];
    let visible = 0;
    let total = 0;
    const traverse = (node: OmegaNode) => {
      ids.push(node.id);
      total++;
      const nodeType = getNodeComponentType(node);
      const typeOk = typeFilter === 'all' || nodeType === typeFilter;
      const nodeHidden = hiddenNodeIds.includes(node.id);
      const nodeLocked = lockedNodeIds.includes(node.id);
      const stateOk = (!showHidden && !showLocked) || (showHidden && nodeHidden) || (showLocked && nodeLocked);
      const textOk = !searchTerm || 
        node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.meta?.label as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.cellRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.kind?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.bind?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        node.children?.some(c => c.id.toLowerCase().includes(searchTerm.toLowerCase()));
      // R1c — Property search (bind, value, min/max)
      const propOk = !propertySearchTerm || (
        node.bind?.toLowerCase()?.includes(propertySearchTerm.toLowerCase()) ||
        (typeof node.meta?.value === 'string' && (node.meta.value as string).toLowerCase().includes(propertySearchTerm.toLowerCase())) ||
        (typeof node.meta?.value === 'number' && String(node.meta.value).toLowerCase().includes(propertySearchTerm.toLowerCase())) ||
        (typeof node.meta?.min === 'number' && String(node.meta.min).toLowerCase().includes(propertySearchTerm.toLowerCase())) ||
        (typeof node.meta?.max === 'number' && String(node.meta.max).toLowerCase().includes(propertySearchTerm.toLowerCase()))
      );
      // R1c — Audit filter: show only nodes that have audit issues
      const auditOk = !showAuditIssues || auditNodeIds.includes(node.id);
      // R1c — Template filter: show only nodes with templateRef
      const templateOk = !showTemplates || !!node.templateRef;
      if (typeOk && stateOk && textOk && propOk && auditOk && templateOk) visible++;
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    if (tree) traverse(tree);
    return { flatNodeIds: ids, visibleCount: visible, totalCount: total };
  }, [tree, typeFilter, showHidden, showLocked, searchTerm, propertySearchTerm, showAuditIssues, showTemplates, hiddenNodeIds, lockedNodeIds, auditNodeIds]);

  const clearAllFilters = useCallback(() => {
    setTypeFilter('all');
    setShowHidden(false);
    setShowLocked(false);
    setSearchTerm('');
    setPropertySearchTerm('');
    setShowAuditIssues(false);
    setShowTemplates(false);
  }, []);

  return {
    searchTerm, setSearchTerm,
    typeFilter, setTypeFilter,
    showHidden, setShowHidden,
    showLocked, setShowLocked,
    propertySearchTerm, setPropertySearchTerm,
    showAuditIssues, setShowAuditIssues,
    showTemplates, setShowTemplates,
    flatNodeIds, visibleCount, totalCount,
    clearAllFilters,
  };
}
