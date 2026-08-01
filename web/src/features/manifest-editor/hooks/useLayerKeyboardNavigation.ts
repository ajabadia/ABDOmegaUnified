/**
 * @purpose Gestiona la navegación del teclado para los elementos de capa en el editor de manifesto.
 * @purpose_en Manages keyboard navigation for layer items in the manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1wbgiqz
 * @lastUpdated 2026-06-19T22:20:30.178Z
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { FlatTreeItem } from '@/features/manifest-editor/components/inspector/LayerRow';
import { ROW_HEIGHT } from '@/features/manifest-editor/components/inspector/layersPanelUtils';

interface UseLayerKeyboardNavigationProps {
  flatItems: FlatTreeItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onSelectMultiple?: ((ids: string[]) => void) | undefined;
  toggleExpand: (id: string) => void;
  listRef: { current: { element: HTMLElement | null } | null };
  treeHeight: number;
}

interface UseLayerKeyboardNavigationReturn {
  focusedLayerIndex: number;
  handleTreeKeyDown: (e: React.KeyboardEvent) => void;
}

export function useLayerKeyboardNavigation({
  flatItems,
  selectedItemId,
  onSelectItem,
  onSelectMultiple,
  toggleExpand,
  listRef,
  treeHeight,
}: UseLayerKeyboardNavigationProps): UseLayerKeyboardNavigationReturn {
  const [focusedLayerIndex, setFocusedLayerIndex] = useState<number>(-1);
  const focusedLayerIndexRef = useRef(-1);

  // Sync focusedLayerIndex when selectedItemId changes from external clicks
  useEffect(() => {
    if (!selectedItemId || flatItems.length === 0) return;
    const idx = flatItems.findIndex((fi) => fi.id === selectedItemId);
    if (idx >= 0 && idx !== focusedLayerIndexRef.current) {
      setFocusedLayerIndex(idx);
      focusedLayerIndexRef.current = idx;
    }
  }, [selectedItemId, flatItems]);

  // Scroll the virtual list to the focused item
  useEffect(() => {
    if (focusedLayerIndex < 0 || !listRef.current?.element) return;
    const scrollEl = listRef.current.element;
    const targetScrollTop = focusedLayerIndex * ROW_HEIGHT - (treeHeight / 2 - ROW_HEIGHT / 2);
    scrollEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }, [focusedLayerIndex, treeHeight, listRef]);

  const handleTreeKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = flatItems;
    if (items.length === 0) return;

    let currentIdx = focusedLayerIndexRef.current;
    if (currentIdx < 0 || currentIdx >= items.length) {
      currentIdx = 0;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        e.stopPropagation();
        const nextIdx = Math.min(currentIdx + 1, items.length - 1);
        const nextItem = items[nextIdx];
        if (nextItem) {
          focusedLayerIndexRef.current = nextIdx;
          setFocusedLayerIndex(nextIdx);
          onSelectItem(nextItem.id);
          onSelectMultiple?.([nextItem.id]);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        const prevIdx = Math.max(currentIdx - 1, 0);
        const prevItem = items[prevIdx];
        if (prevItem) {
          focusedLayerIndexRef.current = prevIdx;
          setFocusedLayerIndex(prevIdx);
          onSelectItem(prevItem.id);
          onSelectMultiple?.([prevItem.id]);
        }
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        e.stopPropagation();
        const item = items[currentIdx];
        if (item && item.hasChildren && !item.isExpanded) {
          toggleExpand(item.id);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        e.stopPropagation();
        const item = items[currentIdx];
        if (item && item.hasChildren && item.isExpanded) {
          toggleExpand(item.id);
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        const firstItem = items[0];
        if (firstItem) {
          focusedLayerIndexRef.current = 0;
          setFocusedLayerIndex(0);
          onSelectItem(firstItem.id);
          onSelectMultiple?.([firstItem.id]);
        }
        break;
      }
      case 'End': {
        e.preventDefault();
        const lastIdx = items.length - 1;
        const lastItem = items[lastIdx];
        if (lastItem) {
          focusedLayerIndexRef.current = lastIdx;
          setFocusedLayerIndex(lastIdx);
          onSelectItem(lastItem.id);
          onSelectMultiple?.([lastItem.id]);
        }
        break;
      }
    }
  }, [flatItems, onSelectItem, onSelectMultiple, toggleExpand]);

  return { focusedLayerIndex, handleTreeKeyDown };
}
