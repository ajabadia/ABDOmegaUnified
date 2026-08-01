'use client';

/**
 * @purpose Gestiona un componente para filas de capas en el editor de manifesto OMEGA, proporcionando controladores para la visibilidad, la bloqueada y la eliminación.
 * @purpose_en Renders a component for layer rows in the OMEGA manifest editor, providing controls for visibility, locking, and deletion.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:4,imports:6,sig:1yhqbpf
 * @lastUpdated 2026-06-20T09:16:04.282Z
 */

import { useState, createElement } from 'react';
import type { RowComponentProps } from 'react-window';
import { motion } from 'framer-motion';
import { 
  ChevronRight, ChevronDown, Folder, Radio, Disc, Sliders, ToggleLeft, CircleDot, Tv, Type, Volume2, Layers, GripVertical, Eye, EyeOff, Lock, Unlock
} from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { getNodeComponentType } from '@/features/manifest-editor/hooks/useLayerFilters';

export interface FlatTreeItem {
  id: string;
  node: OmegaNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface DropTarget {
  rowIndex: number;
  position: 'top' | 'bottom' | 'inside';
  nodeId: string;
}

export interface LayerRowData {
  items: FlatTreeItem[];
  selectedItemId: string | null;
  multiSelectedIds: string[];
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: ((ids: string[]) => void) | undefined;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemoveItem: ((id: string) => void) | undefined;
  onContextMenu: (e: React.MouseEvent, nodeId: string, isGroup: boolean) => void;
  onUpdateItem: ((id: string, updates: Partial<OmegaNode>) => void) | undefined;
  onDragGhostStart: ((nodeId: string, color: string, label: string, clientX: number, clientY: number) => void) | undefined;
  toggleExpand: (id: string) => void;
  dropTarget: DropTarget | null;
}

const ROW_HEIGHT = 26;

const NODE_TYPE_COLORS: Record<string, string> = {
  knob: '#f97316',
  port: '#06b6d4',
  slider: '#22c55e',
  display: '#a855f7',
  container: '#3b82f6',
  label: '#6b7280',
  switch: '#eab308',
  button: '#ec4899',
};

function getNodeColor(node: OmegaNode): string {
  const nodeType = getNodeComponentType(node);
  return NODE_TYPE_COLORS[nodeType] ?? '#6b7280';
}

function getNodeIcon(node: OmegaNode): typeof Disc {
  if (node.kind === 'container' || node.kind === 'rack' || node.kind === 'face' || node.kind === 'group') return Folder;
  if (node.kind === 'port') return Radio;
  const type = node.cellRef?.toLowerCase() || '';
  if (type === 'knob') return Disc;
  if (type.includes('slider')) return Sliders;
  if (type === 'switch') return ToggleLeft;
  if (type === 'button' || type === 'push') return CircleDot;
  if (type === 'display') return Tv;
  if (type === 'label') return Type;
  if (type === 'lfo' || type === 'osc' || type === 'oscillator') return Volume2;
  if (type === 'layer') return Layers;
  return GripVertical;
}

function countDirectChildren(node: OmegaNode): number {
  return node.children?.length ?? 0;
}

export const LayerRow = ({
  index, style,
  items, selectedItemId, multiSelectedIds,
  hiddenNodeIds, lockedNodeIds,
  onSelectItem, onSelectMultiple, onToggleVisibility, onToggleLock, onRemoveItem,
  onContextMenu, onUpdateItem, onDragGhostStart,
  toggleExpand, dropTarget,
}: RowComponentProps<LayerRowData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const item = items[index];
  if (!item) return null;

  const { node, depth, hasChildren, isExpanded } = item;
  const isContainer = node.kind === 'container' || node.kind === 'rack' || node.kind === 'face' || node.kind === 'group';
  const isHidden = hiddenNodeIds.includes(node.id);
  const isLocked = lockedNodeIds.includes(node.id);
  const isSelected = selectedItemId === node.id || multiSelectedIds.includes(node.id);
  const nodeColor = getNodeColor(node);
  const childCount = countDirectChildren(node);
  const indent = depth * 12;

  const handleNodeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onSelectMultiple) { onSelectItem(node.id); return; }
    if (e.ctrlKey || e.metaKey) {
      const activeIds = [...multiSelectedIds];
      const idx = activeIds.indexOf(node.id);
      if (idx !== -1) activeIds.splice(idx, 1);
      else activeIds.push(node.id);
      onSelectMultiple(activeIds);
      onSelectItem(activeIds.length > 0 ? activeIds[activeIds.length - 1] : null);
    } else if (e.shiftKey && selectedItemId) {
      const startIdx = items.findIndex((fi: FlatTreeItem) => fi.id === selectedItemId);
      const endIdx = items.findIndex((fi: FlatTreeItem) => fi.id === node.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const range = items.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1).map((fi: FlatTreeItem) => fi.id);
        onSelectMultiple(range);
      }
    } else {
      onSelectItem(node.id);
      onSelectMultiple([node.id]);
    }
  };

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!multiSelectedIds.includes(node.id)) {
      onSelectItem(node.id);
      onSelectMultiple?.([node.id]);
    }
    onContextMenu(e, node.id, isContainer);
  };

  const handleRenameSubmit = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== ((node.meta?.label as string) || node.id) && onUpdateItem) {
      onUpdateItem(node.id, { meta: { ...node.meta, label: trimmed } });
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (node.kind === 'rack') { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    e.dataTransfer.setDragImage(canvas, 0, 0);
    onDragGhostStart?.(node.id, nodeColor, (node.meta?.label as string) || node.id, e.clientX, e.clientY);
  };

  const isDropTop = dropTarget?.nodeId === node.id && dropTarget?.position === 'top';
  const isDropBottom = dropTarget?.nodeId === node.id && dropTarget?.position === 'bottom';
  const isDropInside = dropTarget?.nodeId === node.id && dropTarget?.position === 'inside';

  return (
    <div style={style}>
      <div style={{ paddingLeft: `${indent}px` }}>          <div
            role="treeitem"
            aria-selected={isSelected}
            aria-posinset={index + 1}
            aria-setsize={items.length}
            onClick={handleNodeClick}
            onContextMenu={handleContextMenuEvent}
            draggable={node.kind !== 'rack'}
            onDragStart={handleDragStart}
            className={`flex items-center justify-between px-2 border rounded-xs cursor-pointer transition-all group relative ${
            isSelected
              ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]'
              : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
          } ${isDropInside ? 'ring-1 ring-primary/60 bg-primary/5' : ''} ${isHidden ? 'opacity-40' : ''} ${isLocked ? 'border-l-amber-400/30 border-l-2' : ''}`}
          style={{
            borderLeftColor: isSelected ? undefined : (isLocked ? undefined : nodeColor),
            borderLeftWidth: isSelected ? undefined : '2px',
            height: ROW_HEIGHT - 2,
          }}
        >
          {isDropTop && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.3 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-0 left-0 right-0 h-[3px] z-10 origin-left"
              style={{
                background: 'linear-gradient(90deg, rgba(var(--primary-rgb),0.9), rgba(var(--primary-rgb),0.4), transparent)',
                boxShadow: '0 0 12px rgba(var(--primary-rgb),0.6), 0 0 24px rgba(var(--primary-rgb),0.3)',
              }}
            />
          )}
          {isDropBottom && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.3 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 h-[3px] z-10 origin-left"
              style={{
                background: 'linear-gradient(90deg, rgba(var(--primary-rgb),0.9), rgba(var(--primary-rgb),0.4), transparent)',
                boxShadow: '0 0 12px rgba(var(--primary-rgb),0.6), 0 0 24px rgba(var(--primary-rgb),0.3)',
              }}
            />
          )}

          <div className="flex items-center gap-1.5 overflow-hidden mr-2">
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                className="p-0.5 shrink-0 wb-text-muted hover:wb-text"
                aria-label={isExpanded ? 'Collapse layer' : 'Expand layer'}
              >
                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {createElement(getNodeIcon(node), {
              className: `w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : ''}`,
              style: { color: isSelected ? undefined : nodeColor },
            })}
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setEditValue((node.meta?.label as string) || node.id);
                    setIsEditing(false);
                  }
                }}
                aria-label={`Rename layer ${node.id}`}
                className="wb-surface-inset border border-primary/50 text-[10px] font-mono uppercase px-1 py-0.5 rounded-xs wb-text focus:outline-none max-w-[120px]"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex flex-col overflow-hidden min-w-0" onDoubleClick={() => { setIsEditing(true); setEditValue((node.meta?.label as string) || node.id); }}>
                <span className="font-mono text-[10px] uppercase tracking-wider truncate leading-tight" title={node.id}>{node.id}</span>
                {(node.meta?.label as string) && (
                  <span className="text-[9px] opacity-50 uppercase tracking-widest truncate leading-tight" title={node.meta?.label as string}>{node.meta?.label as string}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {hasChildren && childCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[12px] h-3 px-[3px] rounded-[2px] text-[8px] font-black leading-none tabular-nums"
                style={{
                  backgroundColor: `${nodeColor}22`,
                  color: nodeColor,
                  border: `1px solid ${nodeColor}44`,
                }}
                title={`${childCount} child${childCount !== 1 ? 'ren' : ''}`}
              >
                {childCount}
              </span>
            )}
            {isHidden && <span className="text-[8px] font-black text-red-400/60 uppercase tracking-widest mr-0.5" title="Hidden">H</span>}
            {isLocked && <span className="text-[8px] font-black text-amber-400/60 uppercase tracking-widest mr-0.5" title="Locked">L</span>}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onToggleVisibility(node.id)}
                className={`p-1 rounded hover:bg-primary/10 transition-colors ${isHidden ? 'text-red-400' : 'wb-text-muted hover:wb-text'}`}
                title={isHidden ? 'Show' : 'Hide'}
                aria-label={isHidden ? 'Show' : 'Hide'}
              >
                {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
              </button>
              <button
                onClick={() => onToggleLock(node.id)}
                className={`p-1 rounded hover:bg-primary/10 transition-colors ${isLocked ? 'text-amber-400' : 'wb-text-muted hover:wb-text'}`}
                title={isLocked ? 'Unlock' : 'Lock'}
                aria-label={isLocked ? 'Unlock' : 'Lock'}
              >
                {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
              </button>
              {onRemoveItem && node.kind !== 'rack' && (
                <button
                  onClick={() => onRemoveItem(node.id)}
                  className="p-1 rounded wb-text-muted hover:text-red-400 hover:bg-primary/10 transition-colors"
                  title="Delete"
                  aria-label="Delete"
                >
                  <span className="text-[9px] font-black">DEL</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
