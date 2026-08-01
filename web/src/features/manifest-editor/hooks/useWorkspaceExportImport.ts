'use client';

import { useCallback } from 'react';
import type { UserPreferences } from '@/features/manifest-editor/providers/PreferencesProvider';
import type { WorkbenchState, WorkbenchAction } from '@/features/manifest-editor/types/workbench';

interface WorkspaceExport {
  formatVersion: number;
  exportedAt: string;
  workbench: {
    tabsById: WorkbenchState['tabsById'];
    panesById: WorkbenchState['panesById'];
    focusedPaneId: WorkbenchState['focusedPaneId'];
    layout: WorkbenchState['layout'];
    tabViewState: WorkbenchState['tabViewState'];
    uiTheme: WorkbenchState['uiTheme'];
    isRightPanelCollapsed: boolean;
    isZenMode: boolean;
    window_layers: boolean;
    window_properties: boolean;
    window_rack_properties: boolean;
    window_blueprints: boolean;
    window_compliance: boolean;
    window_info: boolean;
    window_history: boolean;
    window_logs: boolean;
    hiddenNodeIds: string[];
    lockedNodeIds: string[];
    isPrimarySplitH: boolean;
    isSecondarySplitH: boolean;
    primarySplitRatio: number;
    secondarySplitRatio: number;
  };
  preferences: UserPreferences | null;
}

export function useWorkspaceExportImport(
  state: WorkbenchState,
  dispatch: React.Dispatch<WorkbenchAction>,
  preferences: UserPreferences,
) {
  const exportWorkspaceState = useCallback(() => {
    const workspace: WorkspaceExport = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      workbench: {
        tabsById: state.tabsById,
        panesById: state.panesById,
        focusedPaneId: state.focusedPaneId,
        layout: state.layout,
        tabViewState: state.tabViewState,
        uiTheme: state.uiTheme,
        isRightPanelCollapsed: state.isRightPanelCollapsed,
        isZenMode: state.isZenMode,
        window_layers: state.window_layers,
        window_properties: state.window_properties,
        window_rack_properties: state.window_rack_properties,
        window_blueprints: state.window_blueprints,
        window_compliance: state.window_compliance,
        window_info: state.window_info,
        window_history: state.window_history,
        window_logs: state.window_logs,
        hiddenNodeIds: state.hiddenNodeIds,
        lockedNodeIds: state.lockedNodeIds,
        isPrimarySplitH: state.isPrimarySplitH,
        isSecondarySplitH: state.isSecondarySplitH,
        primarySplitRatio: state.primarySplitRatio,
        secondarySplitRatio: state.secondarySplitRatio,
      },
      preferences,
    };

    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace.omega-workspace';
    a.click();
    URL.revokeObjectURL(url);
  }, [state, preferences]);

  const importWorkspaceState = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result;
          if (typeof text !== 'string') {
            reject(new Error('Failed to read file'));
            return;
          }
          const data: WorkspaceExport = JSON.parse(text);
          if (data.formatVersion !== 1) {
            reject(new Error(`Unsupported workspace format version: ${data.formatVersion}`));
            return;
          }
          dispatch({
            type: 'HYDRATE_WORKBENCH',
            payload: { state: data.workbench },
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [dispatch]);

  return { exportWorkspaceState, importWorkspaceState };
}
