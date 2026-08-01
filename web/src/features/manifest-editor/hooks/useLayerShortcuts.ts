/**
 * @purpose Gestiona atajos de teclado para operaciones de capas en el panel de capas del editor de manifesto OMEGA.
 * @purpose_en Manages keyboard shortcuts for layer operations in the LayersPanel of the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:d9p9gp
 * @lastUpdated 2026-06-19T22:20:34.859Z
 */

import { useEffect } from 'react';
import type { ComponentTypeFilter } from '@/features/manifest-editor/hooks/useLayerFilters';

interface UseLayerShortcutsProps {
  selectedItemId: string | null;
  onMoveNodeUpDown?: ((nodeId: string, direction: 'up' | 'down') => void) | undefined;
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  showLocked: boolean;
  setShowLocked: (v: boolean) => void;
  showAuditIssues: boolean;
  setShowAuditIssues: (v: boolean) => void;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  clearAllFilters: () => void;
  setTypeFilter: (filter: ComponentTypeFilter) => void;
}

export function useLayerShortcuts({
  selectedItemId,
  onMoveNodeUpDown,
  showHidden, setShowHidden,
  showLocked, setShowLocked,
  showAuditIssues, setShowAuditIssues,
  showTemplates, setShowTemplates,
  clearAllFilters,
  setTypeFilter,
}: UseLayerShortcutsProps): void {
  // Alt+ArrowUp/Down — move node up/down
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (selectedItemId && onMoveNodeUpDown) {
          e.preventDefault();
          e.stopPropagation();
          onMoveNodeUpDown(selectedItemId, e.key === 'ArrowUp' ? 'up' : 'down');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, onMoveNodeUpDown]);

  // Ctrl+Shift+Alt+H/L/A/T/C — toggle filters
  useEffect(() => {
    const handleFilterKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || !e.altKey) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'h':
          e.preventDefault();
          e.stopPropagation();
          setShowHidden(!showHidden);
          break;
        case 'l':
          e.preventDefault();
          e.stopPropagation();
          setShowLocked(!showLocked);
          break;
        case 'a':
          e.preventDefault();
          e.stopPropagation();
          setShowAuditIssues(!showAuditIssues);
          break;
        case 't':
          e.preventDefault();
          e.stopPropagation();
          setShowTemplates(!showTemplates);
          break;
        case 'c':
          e.preventDefault();
          e.stopPropagation();
          clearAllFilters();
          break;
      }
    };
    window.addEventListener('keydown', handleFilterKeyDown);
    return () => window.removeEventListener('keydown', handleFilterKeyDown);
  }, [showHidden, showLocked, showAuditIssues, showTemplates, setShowHidden, setShowLocked, setShowAuditIssues, setShowTemplates, clearAllFilters]);

  // Ctrl+Shift+Alt+0-8 — set component type filter
  useEffect(() => {
    const handleTypeKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || !e.altKey) return;
      const num = parseInt(e.key, 10);
      if (isNaN(num) || num < 0 || num > 8) return;
      e.preventDefault();
      e.stopPropagation();
      const types: ComponentTypeFilter[] = ['all', 'knob', 'port', 'slider', 'display', 'container', 'label', 'switch', 'button'];
      setTypeFilter(types[num]);
    };
    window.addEventListener('keydown', handleTypeKeyDown);
    return () => window.removeEventListener('keydown', handleTypeKeyDown);
  }, [setTypeFilter]);
}
