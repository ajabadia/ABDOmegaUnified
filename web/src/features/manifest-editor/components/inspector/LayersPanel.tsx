'use client';

/**
 * @purpose Gestiona un panel para administrar capas en un editor de manifesto OMEGA, incluyendo características como filtrado, deshabilitación de visibilidad, bloqueo y operaciones en lotes.
 * @purpose_en Renders a panel for managing layers in an OMEGA manifest editor, including features like filtering, visibility toggling, locking, and batch operations.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:17,sig:eeww0i
 * @lastUpdated 2026-06-20T12:52:02.094Z
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { List, useListRef } from 'react-window';
import { motion } from 'framer-motion';
import { ListFilter } from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findParentInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import { useBatchHistory } from '@/features/manifest-editor/hooks/useBatchHistory';
import { useLayerFilters } from '@/features/manifest-editor/hooks/useLayerFilters';
import { useLayerKeyboardNavigation } from '@/features/manifest-editor/hooks/useLayerKeyboardNavigation';
import { useLayerDragDrop } from '@/features/manifest-editor/hooks/useLayerDragDrop';
import { useLayerShortcuts } from '@/features/manifest-editor/hooks/useLayerShortcuts';
import { LayerRow } from './LayerRow';
import type { FlatTreeItem, LayerRowData } from './LayerRow';
import { ROW_HEIGHT, type FilterParams, type ContextMenuState, flattenVisibleTree } from './layersPanelUtils';
import LayersPanelFilterBar from './LayersPanelFilterBar';
import LayersPanelBatchBar from './LayersPanelBatchBar';
import LayersPanelContextMenu from './LayersPanelContextMenu';

// ── Categorized sub-interfaces ─────────────────────────────────────────

/** Core data + layer visibility/lock state */
interface CoreDataProps {
  manifest: OMEGA_Manifest;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  auditNodeIds?: string[] | undefined;
}

/** Selection + multi-selection */
interface SelectionProps {
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  multiSelectedIds?: string[] | undefined;
  onSelectMultiple?: ((ids: string[]) => void) | undefined;
}

/** Toggle handlers for visibility and lock */
interface ToggleProps {
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

/** CRUD operations on nodes */
interface CrudProps {
  onRemoveItem?: ((id: string) => void) | undefined;
  onDuplicateItem?: ((id: string) => void) | undefined;
  onDuplicateGroup?: ((id: string) => void) | undefined;
  onUpdateItem?: ((id: string, updates: Partial<OmegaNode>) => void) | undefined;
}

/** Group / tree operations */
interface GroupOpsProps {
  onGroupSelected?: (() => void) | undefined;
  onGroupDown?: ((id: string) => void) | undefined;
  onSaveGroupAsBlueprint?: ((id: string) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
  onMoveNode?: ((sourceId: string, targetParentId: string, index?: number) => void) | undefined;
  onMoveNodeUpDown?: ((nodeId: string, direction: 'up' | 'down') => void) | undefined;
}

/** Batch operations */
interface BatchOpsProps {
  onBatchSetVisibility?: ((ids: string[], hidden: boolean) => void) | undefined;
  onBatchSetLocked?: ((ids: string[], locked: boolean) => void) | undefined;
  onBatchUngroup?: ((ids: string[]) => void) | undefined;
  onBatchUndoGroup?: ((childIds: string[]) => void) | undefined;
}

type LayersPanelProps =
  & CoreDataProps
  & SelectionProps
  & ToggleProps
  & CrudProps
  & GroupOpsProps
  & BatchOpsProps;



export default function LayersPanel({
  manifest,
  selectedItemId,
  onSelectItem,
  hiddenNodeIds,
  lockedNodeIds,
  onToggleVisibility,
  onToggleLock,
  onRemoveItem,
  multiSelectedIds = [],
  onSelectMultiple,
  onGroupSelected,
  onGroupDown,
  onDuplicateItem,
  onDuplicateGroup,
  onSaveGroupAsBlueprint,
  onUngroupNode,
  onMoveNode,
  onMoveNodeUpDown,
  onUpdateItem,
  onBatchSetVisibility,
  onBatchSetLocked,
  onBatchUngroup,
  onBatchUndoGroup,
  auditNodeIds,
}: LayersPanelProps) {
  // ── Batch History Hook ───────────────────────────────────────────────
  const {
    batchHistory, setBatchHistory,
    batchNotification, setBatchNotification,
    showHistory, setShowHistory,
    hoverHistory, setHoverHistory,
    fadingOut, pushBatchAction, clearBatchHistory, isEntryUndoable,
  } = useBatchHistory();

  // ── Virtual scroll refs + dimensions ─────────────────────────────────
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useListRef(null);
  const [treeDimensions, setTreeDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = treeContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setTreeDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Expanded state ──────────────────────────────────────────────────
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const toggleExpand = useCallback((id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  // ── Context Menu State ───────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Layer Filters Hook ───────────────────────────────────────────────
  const tree = manifest.ui?.tree;
  const {
    searchTerm, setSearchTerm,
    typeFilter, setTypeFilter,
    showHidden, setShowHidden,
    showLocked, setShowLocked,
    propertySearchTerm, setPropertySearchTerm,
    showAuditIssues, setShowAuditIssues,
    showTemplates, setShowTemplates,
    visibleCount: filterVisibleCount, totalCount,
    clearAllFilters,
  } = useLayerFilters(tree, hiddenNodeIds, lockedNodeIds, auditNodeIds ?? []);

  // ── Flatten tree for virtual scroll ──────────────────────────────────
  const filterParams: FilterParams = useMemo(() => ({
    searchTerm, typeFilter, showHidden, showLocked,
    hiddenNodeIds, lockedNodeIds,
    propertySearchTerm, showAuditIssues,
    auditNodeIds: auditNodeIds ?? [], showTemplates,
  }), [searchTerm, typeFilter, showHidden, showLocked, hiddenNodeIds, lockedNodeIds,
      propertySearchTerm, showAuditIssues, auditNodeIds, showTemplates]);

  const { items: flatItems, visibleCount } = useMemo(() => {
    if (!tree) return { items: [] as FlatTreeItem[], flatNodeIds: [] as string[], visibleCount: 0 };
    return flattenVisibleTree(tree, expandedMap, filterParams);
  }, [tree, expandedMap, filterParams]);

  // ── Filter progress (R1a) ─────────────────────────────────────────
  const filterProgress = totalCount > 0 ? Math.round((filterVisibleCount / totalCount) * 100) : 100;
  const isFiltered = filterVisibleCount !== totalCount;
  const isFilterActive = !!(searchTerm || typeFilter !== 'all' || showHidden || showLocked || showAuditIssues || showTemplates || propertySearchTerm);

  // ── Keyboard Navigation Hook ────────────────────────────────────────
  const { handleTreeKeyDown } = useLayerKeyboardNavigation({
    flatItems, selectedItemId, onSelectItem, onSelectMultiple,
    toggleExpand, listRef, treeHeight: treeDimensions.height,
  });

  // ── Undo last batch action ───────────────────────────────────────────
  const handleUndoLastBatch = useCallback(() => {
    const last = batchHistory[0];
    if (!last) return;
    if (last.action === 'visibility') {
      onBatchSetVisibility?.(last.ids, !last.value);
    } else if (last.action === 'lock') {
      onBatchSetLocked?.(last.ids, !last.value);
    } else if (last.action === 'group' && last.value === true) {
      onBatchUndoGroup?.(last.ids);
    } else return;
    setBatchNotification({ message: `↶ Undone: ${last.message}`, variant: last.variant });
    setBatchHistory((prev) => prev.slice(1));
    setHoverHistory(false);
  }, [batchHistory, onBatchSetVisibility, onBatchSetLocked, onBatchUndoGroup,
      setBatchNotification, setBatchHistory, setHoverHistory]);

  // ── Batch handlers ───────────────────────────────────────────────────
  const handleBatchHide = useCallback(() => {
    onBatchSetVisibility?.(multiSelectedIds, true);
    pushBatchAction('hide', multiSelectedIds, 'visibility', true);
  }, [onBatchSetVisibility, multiSelectedIds, pushBatchAction]);
  const handleBatchShow = useCallback(() => {
    onBatchSetVisibility?.(multiSelectedIds, false);
    pushBatchAction('show', multiSelectedIds, 'visibility', false);
  }, [onBatchSetVisibility, multiSelectedIds, pushBatchAction]);
  const handleBatchLock = useCallback(() => {
    onBatchSetLocked?.(multiSelectedIds, true);
    pushBatchAction('lock', multiSelectedIds, 'lock', true);
  }, [onBatchSetLocked, multiSelectedIds, pushBatchAction]);
  const handleBatchUnlock = useCallback(() => {
    onBatchSetLocked?.(multiSelectedIds, false);
    pushBatchAction('unlock', multiSelectedIds, 'lock', false);
  }, [onBatchSetLocked, multiSelectedIds, pushBatchAction]);
  const handleBatchGroup = useCallback(() => {
    onGroupSelected?.();
    pushBatchAction('group', multiSelectedIds, 'group', true);
  }, [onGroupSelected, multiSelectedIds, pushBatchAction]);
  const handleBatchUngroupAction = useCallback(() => {
    onBatchUngroup?.(multiSelectedIds);
    pushBatchAction('ungroup', multiSelectedIds, 'group', false);
  }, [onBatchUngroup, multiSelectedIds, pushBatchAction]);

  // ── Tree helpers ─────────────────────────────────────────────────────
  const findParentId = useCallback((targetId: string) => {
    if (!tree) return undefined;
    const parent = findParentInTree(tree, targetId);
    return parent?.id;
  }, [tree]);

  const handleContextMenuTrigger = (e: React.MouseEvent, nodeId: string, isGroup: boolean) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, isGroup });
  };
  const closeContextMenu = () => setContextMenu(null);

  // ── Drag + Drop Hook ────────────────────────────────────────────────
  const {
    dragGhost,
    dropTarget,
    handleDragGhostStart,
    handleTreeDragOver,
    handleTreeDrop,
  } = useLayerDragDrop({ flatItems, tree, onMoveNode, findParentId, listRef });

  // ── Keyboard Shortcuts Hook ─────────────────────────────────────────
  useLayerShortcuts({
    selectedItemId, onMoveNodeUpDown,
    showHidden, setShowHidden,
    showLocked, setShowLocked,
    showAuditIssues, setShowAuditIssues,
    showTemplates, setShowTemplates,
    clearAllFilters, setTypeFilter,
  });

  // ── Row props for List ──────────────────────────────────────────────
  const rowProps: LayerRowData = useMemo(() => ({
    items: flatItems,
    selectedItemId,
    multiSelectedIds,
    hiddenNodeIds,
    lockedNodeIds,
    onSelectItem,
    onSelectMultiple,
    onToggleVisibility,
    onToggleLock,
    onRemoveItem,
    onContextMenu: handleContextMenuTrigger,
    onUpdateItem,
    onDragGhostStart: handleDragGhostStart,
    toggleExpand,
    dropTarget,
  }), [flatItems, selectedItemId, multiSelectedIds, hiddenNodeIds, lockedNodeIds,
      onSelectItem, onSelectMultiple, onToggleVisibility, onToggleLock, onRemoveItem,
      onUpdateItem, handleDragGhostStart, toggleExpand, dropTarget]);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden wb-surface text-[10.5px] font-sans relative"
      onClick={closeContextMenu}
    >
      <LayersPanelFilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            showHidden={showHidden}
            setShowHidden={setShowHidden}
            showLocked={showLocked}
            setShowLocked={setShowLocked}
            showAuditIssues={showAuditIssues}
            setShowAuditIssues={setShowAuditIssues}
            showTemplates={showTemplates}
            setShowTemplates={setShowTemplates}
            propertySearchTerm={propertySearchTerm}
            setPropertySearchTerm={setPropertySearchTerm}
            clearAllFilters={clearAllFilters}
            filterVisibleCount={filterVisibleCount}
            totalCount={totalCount}
            isFiltered={isFiltered}
            filterProgress={filterProgress}
          />

      <LayersPanelBatchBar
        multiSelectedIds={multiSelectedIds}
        onBatchSetVisibility={onBatchSetVisibility}
        onBatchSetLocked={onBatchSetLocked}
        onGroupSelected={onGroupSelected}
        onBatchUngroup={onBatchUngroup}
        handleBatchHide={handleBatchHide}
        handleBatchShow={handleBatchShow}
        handleBatchLock={handleBatchLock}
        handleBatchUnlock={handleBatchUnlock}
        handleBatchGroup={handleBatchGroup}
        handleBatchUngroupAction={handleBatchUngroupAction}
        batchNotification={batchNotification}
        fadingOut={fadingOut}
        batchHistory={batchHistory}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        hoverHistory={hoverHistory}
        setHoverHistory={setHoverHistory}
        handleUndoLastBatch={handleUndoLastBatch}
        clearBatchHistory={clearBatchHistory}
        isEntryUndoable={isEntryUndoable}
      />

      <DragGhostOverlay dragGhost={dragGhost} />

      {/* ── VIRTUAL SCROLL TREE ────────────────────────────────────────── */}
      {tree ? (
        visibleCount === 0 && isFilterActive ? (
          <EmptyFilterState onClearFilters={clearAllFilters} />
        ) : (
          <div
            ref={treeContainerRef}
            className="flex-1 overflow-hidden select-none p-1.5"
            role="tree"
            aria-label="Layers tree navigation — use Arrow keys to move, Right/Left to expand/collapse"
            tabIndex={0}
            onKeyDown={handleTreeKeyDown}
            onDragOver={handleTreeDragOver}
            onDrop={handleTreeDrop}
          >
            {treeDimensions.height > 0 && flatItems.length > 0 && (
              <List
                listRef={listRef}
                rowCount={flatItems.length}
                rowHeight={ROW_HEIGHT}
                rowComponent={LayerRow}
                rowProps={rowProps}
                overscanCount={15}
              />
            )}
          </div>
        )
      ) : (
        <EmptyTreeState />
      )}

      {contextMenu && (
        <LayersPanelContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          isGroup={contextMenu.isGroup}
          multiSelectedIds={multiSelectedIds}
          onGroupSelected={onGroupSelected}
          onGroupDown={onGroupDown}
          onMoveNodeUpDown={onMoveNodeUpDown}
          onDuplicateItem={onDuplicateItem}
          onDuplicateGroup={onDuplicateGroup}
          onUngroupNode={onUngroupNode}
          onSaveGroupAsBlueprint={onSaveGroupAsBlueprint}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

/** Animated drag ghost preview overlay */
function DragGhostOverlay({ dragGhost }: { dragGhost: { x: number; y: number; label: string; color: string } | null }) {
  if (!dragGhost) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="fixed pointer-events-none z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-xs border shadow-2xl text-[10px] font-bold uppercase tracking-widest"
      style={{
        left: dragGhost.x + 12, top: dragGhost.y - 20,
        backgroundColor: `${dragGhost.color}18`, borderColor: `${dragGhost.color}66`,
        color: dragGhost.color, boxShadow: `0 0 20px ${dragGhost.color}33, 0 4px 12px rgba(0,0,0,0.4)`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dragGhost.color }} />
      <span className="truncate max-w-[160px]">{dragGhost.label}</span>
    </motion.div>
  );
}

/** Empty state when tree is null */
function EmptyTreeState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
      <ListFilter className="w-5 h-5 wb-text" />
      <span className="text-[9px] font-black uppercase tracking-widest wb-text">No tree data</span>
    </div>
  );
}

/** Empty state when filters match nothing */
function EmptyFilterState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40 gap-1.5">
      <ListFilter className="w-5 h-5 wb-text" />
      <span className="text-[9px] font-black uppercase tracking-widest wb-text">No layers match filters</span>
      <button onClick={onClearFilters} className="text-[9px] font-mono text-primary/60 hover:text-primary underline underline-offset-2">Clear all filters</button>
    </div>
  );
}
