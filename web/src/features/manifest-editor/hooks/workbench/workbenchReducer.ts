/**
 * @purpose Gestiona el estado del trabajobench en el editor de manifesto OMEGA, maneja operaciones de tab y pane, cambios de layout y hidratación desde estados externos.
 * @purpose_en Manages the state for the workbench in the OMEGA manifest editor, handling tab and pane operations, layout changes, and hydration from external states.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:4one9p
 * @lastUpdated 2026-06-15T20:50:00.506Z
 */

import type { 
  WorkbenchState, 
  WorkbenchAction, 
  WorkbenchTab, 
  WorkbenchPaneId,
  WorkbenchTabType
} from "../../types/workbench";
import { WORKBENCH_LAYOUT_CONSTRAINTS } from "../../constants/workbench";

const paneIds: WorkbenchPaneId[] = ["primary", "secondary", "primary_bottom", "secondary_bottom"];
const tabTypes: Array<"orbital" | "rack" | "source" | "history"> = ["orbital", "rack", "source", "history"];
const tabTitles: Record<"orbital" | "rack" | "source" | "history", string> = {
  orbital: "Orbital",
  rack: "Rack",
  source: "Source",
  history: "History"
};

export const createInitialState = (): WorkbenchState => {
  const tabsById: Record<string, WorkbenchTab> = {};
  paneIds.forEach(paneId => {
    tabTypes.forEach(type => {
      const id = `${paneId}-${type}`;
      tabsById[id] = { 
        id, 
        type, 
        title: tabTitles[type], 
        persistent: true, 
        closable: false, 
        payload: { documentId: 'primary' } 
      };
    });
  });

  return {
    tabsById,
    panesById: {
      primary: {
        id: "primary",
        tabIds: tabTypes.map(type => `primary-${type}`),
        activeTabId: "primary-rack",
      },
      secondary: {
        id: "secondary",
        tabIds: tabTypes.map(type => `secondary-${type}`),
        activeTabId: "secondary-source",
      },
      primary_bottom: {
        id: "primary_bottom",
        tabIds: tabTypes.map(type => `primary_bottom-${type}`),
        activeTabId: "primary_bottom-source",
      },
      secondary_bottom: {
        id: "secondary_bottom",
        tabIds: tabTypes.map(type => `secondary_bottom-${type}`),
        activeTabId: "secondary_bottom-history",
      },
    },
    focusedPaneId: "primary",
    layout: { mode: "single", ratio: WORKBENCH_LAYOUT_CONSTRAINTS.DEFAULT_RATIO },
    selectedNodeId: null,
    multiSelectedNodeIds: [],
    pinnedNodeId: null,
    expandedNodeIds: [],
    tabViewState: {},
    showLogs: false,
    isLiveMode: false,
    showModGrid: false,
    helpState: { isOpen: false },
    mockupOpen: false,
    blueprintGalleryOpen: false,
    // isAuditModalOpen removed — use CompliancePanel in right dock instead
    isAboutModalOpen: false,
    isCellEditorOpen: false,
    isOnboardingOpen: false,
    studioMode: { isOpen: false },
    isRightPanelCollapsed: true,
    isZenMode: false,
    window_layers: false,
    window_properties: false,
    window_rack_properties: false,
    window_blueprints: false,
    window_compliance: false,
    window_info: false,
    window_history: false,
    window_logs: false,
    hiddenNodeIds: [],
    lockedNodeIds: [],
    uiTheme: "dark",
    pendingFiles: [],
    isDiffModalOpen: false,
    activeDiff: null,
    isPrimarySplitH: false,
    isSecondarySplitH: false,
    primarySplitRatio: 0.5,
    secondarySplitRatio: 0.5,
  };
};

const clampRatio = (ratio: number) => 
  Math.min(WORKBENCH_LAYOUT_CONSTRAINTS.MAX_RATIO, Math.max(WORKBENCH_LAYOUT_CONSTRAINTS.MIN_RATIO, ratio));

const getNextActiveTabId = (parentActiveTabId: string | null, targetPaneId: WorkbenchPaneId): string => {
  const defaultTypes: WorkbenchTabType[] = ["orbital", "rack", "source", "history"];
  if (!parentActiveTabId) return `${targetPaneId}-rack`;
  const parentType = parentActiveTabId.split("-")[1] as WorkbenchTabType;
  const parentIndex = defaultTypes.indexOf(parentType);
  const nextType = defaultTypes[(parentIndex + 1) % defaultTypes.length];
  return `${targetPaneId}-${nextType}`;
};

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case "OPEN_TAB": {
      const paneId = action.payload.targetPaneId ?? state.focusedPaneId;
      const type = action.payload.type;
      const tabId = `${paneId}-${type}`;
      
      return {
        ...state,
        focusedPaneId: paneId,
        panesById: {
          ...state.panesById,
          [paneId]: {
            ...state.panesById[paneId],
            activeTabId: tabId,
          }
        }
      };
    }

    case "CLOSE_TAB":
      return state; // Tabs are static and cannot be closed individually

    case "REORDER_TABS": {
      const { paneId, tabIds } = action.payload;
      return {
        ...state,
        panesById: {
          ...state.panesById,
          [paneId]: {
            ...state.panesById[paneId],
            tabIds: Array.from(new Set(tabIds)),
          },
        },
      };
    }

    case "FOCUS_TAB": {
      const { paneId, tabId } = action.payload;
      const cleanTabId = tabId.startsWith("tab-") ? `${paneId}-${tabId.substring(4)}` : tabId;
      if (!state.panesById[paneId].tabIds.includes(cleanTabId)) return state;

      return {
        ...state,
        focusedPaneId: paneId,
        panesById: {
          ...state.panesById,
          [paneId]: {
            ...state.panesById[paneId],
            activeTabId: cleanTabId,
          },
        },
      };
    }

    case "FOCUS_PANE":
      return {
        ...state,
        focusedPaneId: action.payload.paneId,
      };

    case "MOVE_TAB_TO_PANE": {
      const { tabId, targetPaneId } = action.payload;
      const type = tabId.split("-")[1] as WorkbenchTabType;
      const targetTabId = `${targetPaneId}-${type}`;
      return {
        ...state,
        panesById: {
          ...state.panesById,
          [targetPaneId]: {
            ...state.panesById[targetPaneId],
            activeTabId: targetTabId,
          }
        },
        focusedPaneId: targetPaneId
      };
    }

    case "SET_LAYOUT_MODE": {
      const { mode } = action.payload;
      const nextPanes = { ...state.panesById };

      // Set secondary pane active tab to the next available one when splitting
      if (mode === "vertical") {
        nextPanes.secondary.activeTabId = getNextActiveTabId(nextPanes.primary.activeTabId, "secondary");
      }

      return {
        ...state,
        panesById: nextPanes,
        layout: {
          ...state.layout,
          mode: action.payload.mode,
        },
        isPrimarySplitH: mode === "single" ? false : state.isPrimarySplitH,
        isSecondarySplitH: mode === "single" ? false : state.isSecondarySplitH,
      };
    }

    case "SET_LAYOUT_RATIO":
      return {
        ...state,
        layout: {
          ...state.layout,
          ratio: clampRatio(action.payload.ratio),
        },
      };

    case "SET_PRIMARY_SPLIT_RATIO":
      return {
        ...state,
        primarySplitRatio: Math.min(0.9, Math.max(0.1, action.payload.ratio)),
      };

    case "SET_SECONDARY_SPLIT_RATIO":
      return {
        ...state,
        secondarySplitRatio: Math.min(0.9, Math.max(0.1, action.payload.ratio)),
      };

    case "SET_SELECTED_NODE":
      return {
        ...state,
        selectedNodeId: action.payload.nodeId,
        multiSelectedNodeIds: action.payload.nodeId ? [action.payload.nodeId] : []
      };
    
    case "SET_MULTI_SELECTED_NODES":
      return {
        ...state,
        multiSelectedNodeIds: action.payload.nodeIds,
        selectedNodeId: action.payload.nodeIds.length > 0 ? action.payload.nodeIds[action.payload.nodeIds.length - 1] : null
      };
    
    case "SET_PINNED_NODE":
      return {
        ...state,
        pinnedNodeId: action.payload.nodeId,
      };

    case "SET_EXPANDED_NODE_IDS":
      return {
        ...state,
        expandedNodeIds: action.payload.nodeIds,
      };

    case "CAPTURE_TAB_VIEW_STATE": {
      const { tabId, viewState } = action.payload;
      return {
        ...state,
        tabViewState: {
          ...state.tabViewState,
          [tabId]: {
            ...state.tabViewState[tabId],
            ...viewState,
          },
        },
      };
    }

    case "TOGGLE_UI_STATE": {
      const { key, value } = action.payload;
      return {
        ...state,
        [key]: value !== undefined ? value : !state[key]
      };
    }

    case "TOGGLE_RIGHT_PANEL":
      return {
        ...state,
        isRightPanelCollapsed: !state.isRightPanelCollapsed
      };

    case "TOGGLE_ZEN_MODE": {
      const nextZen = !state.isZenMode;
      return {
        ...state,
        isZenMode: nextZen,
        isRightPanelCollapsed: nextZen ? true : state.isRightPanelCollapsed
      };
    }

    case "TOGGLE_WINDOW": {
      const { name } = action.payload;
      const isCurrentlyOpen = state[name];
      const nextValue = !isCurrentlyOpen;
      
      // Toggle only the clicked panel — do NOT affect other panels
      const windowKeys = ['window_layers', 'window_properties', 'window_rack_properties', 'window_blueprints', 'window_compliance', 'window_info', 'window_history', 'window_logs'] as const;
      const anyOtherOpen = windowKeys.some(k => k !== name && state[k]);
      return {
        ...state,
        [name]: nextValue,
        // Collapse dock only if closing the last open panel
        isRightPanelCollapsed: nextValue ? false : !anyOtherOpen
      };
    }

    case "TOGGLE_NODE_VISIBILITY": {
      const { nodeId } = action.payload;
      const isHidden = state.hiddenNodeIds.includes(nodeId);
      return {
        ...state,
        hiddenNodeIds: isHidden 
          ? state.hiddenNodeIds.filter(id => id !== nodeId) 
          : [...state.hiddenNodeIds, nodeId]
      };
    }

    case "TOGGLE_NODE_LOCK": {
      const { nodeId } = action.payload;
      const isLocked = state.lockedNodeIds.includes(nodeId);
      return {
        ...state,
        lockedNodeIds: isLocked 
          ? state.lockedNodeIds.filter(id => id !== nodeId) 
          : [...state.lockedNodeIds, nodeId]
      };
    }

    case "BATCH_SET_VISIBILITY": {
      const { nodeIds, hidden } = action.payload;
      const existing = new Set(state.hiddenNodeIds);
      if (hidden) {
        nodeIds.forEach(id => existing.add(id));
      } else {
        nodeIds.forEach(id => existing.delete(id));
      }
      return {
        ...state,
        hiddenNodeIds: Array.from(existing),
      };
    }

    case "BATCH_SET_LOCK": {
      const { nodeIds, locked } = action.payload;
      const existing = new Set(state.lockedNodeIds);
      if (locked) {
        nodeIds.forEach(id => existing.add(id));
      } else {
        nodeIds.forEach(id => existing.delete(id));
      }
      return {
        ...state,
        lockedNodeIds: Array.from(existing),
      };
    }

    case "SET_STUDIO_MODE": {
      return {
        ...state,
        studioMode: action.payload
      };
    }

    case "SET_HELP_STATE": {
      return {
        ...state,
        helpState: { isOpen: action.payload.isOpen, sectionId: action.payload.sectionId }
      };
    }

    case "SET_UI_THEME":
      return { ...state, uiTheme: action.payload.theme };

    case "SET_PENDING_FILES":
      return { ...state, pendingFiles: action.payload.files };

    case "SET_ACTIVE_DIFF":
      return { ...state, activeDiff: action.payload.diff };

    case "TOGGLE_HORIZONTAL_SPLIT": {
      const { paneId } = action.payload;
      const isSplitH = paneId === "primary" ? !state.isPrimarySplitH : !state.isSecondarySplitH;
      const key = paneId === "primary" ? "isPrimarySplitH" : "isSecondarySplitH";
      
      const nextPanes = { ...state.panesById };
      
      if (isSplitH) {
        const bottomId = paneId === "primary" ? "primary_bottom" as const : "secondary_bottom" as const;
        nextPanes[bottomId].activeTabId = getNextActiveTabId(nextPanes[paneId].activeTabId, bottomId);
      }
      
      return {
        ...state,
        [key]: isSplitH,
        panesById: nextPanes,
        focusedPaneId: paneId
      };
    }

    case "CLOSE_PANE": {
      const { paneId } = action.payload;
      if (paneId === "primary") return state;
      
      let nextLayoutMode = state.layout.mode;
      let nextPrimarySplitH = state.isPrimarySplitH;
      let nextSecondarySplitH = state.isSecondarySplitH;

      if (paneId === "primary_bottom") {
        nextPrimarySplitH = false;
      } else if (paneId === "secondary") {
        nextLayoutMode = "single";
        nextSecondarySplitH = false;
      } else if (paneId === "secondary_bottom") {
        nextSecondarySplitH = false;
      }

      return {
        ...state,
        layout: {
          ...state.layout,
          mode: nextLayoutMode,
        },
        isPrimarySplitH: nextPrimarySplitH,
        isSecondarySplitH: nextSecondarySplitH,
        focusedPaneId: "primary"
      };
    }

    case "HYDRATE_WORKBENCH": {
      const hydratedState = action.payload.state;
      const initialState = createInitialState();
      
      const mergedPanes = {
        primary: {
          ...initialState.panesById.primary,
          activeTabId: hydratedState?.panesById?.primary?.activeTabId ?? initialState.panesById.primary.activeTabId
        },
        secondary: {
          ...initialState.panesById.secondary,
          activeTabId: hydratedState?.panesById?.secondary?.activeTabId ?? initialState.panesById.secondary.activeTabId
        },
        primary_bottom: {
          ...initialState.panesById.primary_bottom,
          activeTabId: hydratedState?.panesById?.primary_bottom?.activeTabId ?? initialState.panesById.primary_bottom.activeTabId
        },
        secondary_bottom: {
          ...initialState.panesById.secondary_bottom,
          activeTabId: hydratedState?.panesById?.secondary_bottom?.activeTabId ?? initialState.panesById.secondary_bottom.activeTabId
        },
      };

      return {
        ...state,
        ...hydratedState,
        tabsById: initialState.tabsById,
        panesById: mergedPanes,
        primarySplitRatio: hydratedState?.primarySplitRatio ?? initialState.primarySplitRatio,
        secondarySplitRatio: hydratedState?.secondarySplitRatio ?? initialState.secondarySplitRatio,
      };
    }

    default:
      return state;
  }
}
