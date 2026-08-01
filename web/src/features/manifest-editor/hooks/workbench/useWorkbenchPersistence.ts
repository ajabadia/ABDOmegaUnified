'use client';

/**
 * @purpose Gestiona la hidratación desde localStorage y sincronización atómica del estado de diseño para el editor de manifesto OMEGA workbench.
 * @purpose_en Manages hydration from localStorage and atomic sync of layout state for the OMEGA manifest editor workbench.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1x2vbjv
 * @lastUpdated 2026-06-15T15:15:58.294Z
 */

import { useEffect } from "react";
import type { WorkbenchState, WorkbenchAction } from "../../types/workbench";
import { STORAGE_KEYS } from "../../constants/storage";

/**
 * OMEGA ERA 8.0.0 - WORKBENCH PERSISTENCE HOOK
 * Handles hydration from localStorage and atomic sync of layout state.
 */
export function useWorkbenchPersistence(
  state: WorkbenchState, 
  dispatch: React.Dispatch<WorkbenchAction>
) {
  // 1. Client-Side Hydration
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.WORKBENCH_SESSION);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WorkbenchState>;
        
        // Sanitize activeTabIds mapping from legacy/prefixed formats
        const sanitizeActiveTabId = (paneId: string, activeId: string | null | undefined): string | null => {
          if (!activeId) return null;
          const type = activeId.includes("-") ? activeId.split("-").pop() : activeId;
          const validTypes = ["orbital", "rack", "source", "history"];
          if (type && validTypes.includes(type)) {
            return `${paneId}-${type}`;
          }
          return null;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sanitizedPanes: Record<string, any> = { ...(parsed.panesById || {}) };
        Object.keys(sanitizedPanes).forEach((pid) => {
          const p = sanitizedPanes[pid];
          if (p) {
            p.activeTabId = sanitizeActiveTabId(pid, p.activeTabId);
          }
        });

        dispatch({ 
          type: "HYDRATE_WORKBENCH", 
          payload: { 
            state: {
              ...parsed,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              panesById: sanitizedPanes as any
            }
          } 
        });
      }
    } catch (err) {
      console.warn("[OMEGA WORKBENCH] Session restore failed:", err);
    }
  }, [dispatch]);

  // 2. Persistence Layer: Industrial Sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = {
        tabsById: state.tabsById,
        panesById: state.panesById,
        focusedPaneId: state.focusedPaneId,
        layout: state.layout,
        tabViewState: state.tabViewState,
        selectedNodeId: state.selectedNodeId,
        pinnedNodeId: state.pinnedNodeId,
        primarySplitRatio: state.primarySplitRatio,
        secondarySplitRatio: state.secondarySplitRatio
      };
      window.localStorage.setItem(STORAGE_KEYS.WORKBENCH_SESSION, JSON.stringify(data));
    }
  }, [state.tabsById, state.panesById, state.focusedPaneId, state.layout, state.tabViewState, state.selectedNodeId, state.pinnedNodeId, state.primarySplitRatio, state.secondarySplitRatio]);
}
