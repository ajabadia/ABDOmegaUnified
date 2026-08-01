'use client';

/**
 * @purpose Gestiona y renderiza un contenedor de dock para inspeccionar aspectos variados de una manifestación OMEGA en el ABDOmegaEditor.
 * @purpose_en Manages and renders a dock container for inspecting various aspects of an OMEGA manifest in the ABDOmegaEditor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:19,sig:xduio4
 * @lastUpdated 2026-06-20T12:52:08.499Z
 */

import { useState, useCallback } from 'react';
import {
  Layers, Sliders, Info, History,
  Settings, Zap, Terminal, Shield
} from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { OMEGA_Manifest, OMEGA_Contract, ManifestEntity, OMEGA_Modulation, ExtraResource, LayoutContainer, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { BlueprintDefinition, V2BlueprintData } from '@/omega-ui-core/types';
import type { WorkbenchLayout } from '../../types/workbench';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import { WorkbenchInspector } from './WorkbenchInspector';
import LayersPanel from './LayersPanel';
import BlueprintLibraryPanel from './BlueprintLibraryPanel';
import CompliancePanel from './CompliancePanel';
import LogTerminal from '../logs/LogTerminal';
import { DockPanel } from './dock/DockPanel';
import { DockIconStrip } from './dock/DockIconStrip';
import { DockRackSectionToolbar } from './dock/DockRackSectionToolbar';
import { DockInfoPanel } from './dock/DockInfoPanel';
import { DockHistoryPanel } from './dock/DockHistoryPanel';
import { findNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import type { GroupNode } from '@/omega-ui-core/types/rack';
import { loadPanelSizes, savePanelSizes, loadDockWidth, saveDockWidth } from './dockPanelSizes';

// ── Categorized sub-interfaces ─────────────────────────────────────────

/** Window visibility state + toggle */
interface PanelStateProps {
  windowStates: {
    window_layers: boolean;
    window_properties: boolean;
    window_rack_properties: boolean;
    window_blueprints: boolean;
    window_compliance: boolean;
    window_info: boolean;
    window_history: boolean;
    window_logs: boolean;
  };
  onToggleWindow: (name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/** Core data objects */
interface DataProps {
  manifest: OMEGA_Manifest;
  contract: OMEGA_Contract | null;
  audit: AuditResult;
  isLiveMode: boolean;
  uiTheme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast';
  logs: string[];
  extraResources: ExtraResource[];
}

/** Selection state and navigation */
interface SelectionProps {
  selectedItem: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  selectedItemId: string | null;
  highlightPath: string | null;
  pinnedNodeId: string | null;
  multiSelectedIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  /** Navigation for compliance issues (locate in workbench) */
  onNavigate?: ((path: string) => void) | undefined;
  activeSection?: string | undefined;
}

/** Layer visibility / lock state */
interface LayerManagementProps {
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBatchSetVisibility?: ((ids: string[], hidden: boolean) => void) | undefined;
  onBatchSetLocked?: ((ids: string[], locked: boolean) => void) | undefined;
}

/** Entity CRUD + inspector manipulation */
interface ManipulationProps {
  onUpdateItem: (id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  onUpdateManifest: (updates: Partial<OMEGA_Manifest>) => void;
  onAddEntity: (type: 'control' | 'jack') => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
  onUpdateModulation: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onOpenModGrid: () => void;
  addContainer: (c?: Partial<LayoutContainer>) => void;
  updateContainer: (id: string, updates: Partial<LayoutContainer>) => void;
  removeContainer: (id: string) => void;
  onHelp: (sectionId?: string | undefined) => void;
  onRemoveResource: (fileName: string) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  onTriggerUpload: (id: string) => void;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
}

/** Blueprint library operations */
interface BlueprintProps {
  availableBinds: string[];
  onLoadAcepack?: (() => void) | undefined;
  onSelectBlueprint?: ((blueprint: V2BlueprintData) => void) | undefined;
  onAltClickBlueprint?: ((blueprint: V2BlueprintData) => void) | undefined;
  onSelectUserBlueprint?: ((blueprint: BlueprintDefinition) => void) | undefined;
  userBlueprints?: Array<{ label: string; description: string | undefined; version: string | undefined; blueprint: BlueprintDefinition | undefined }> | undefined;
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
  onSaveGroupAsBlueprint?: ((groupNode: GroupNode) => void) | undefined;
  onSaveGroupAsBlueprintFromNodeId?: ((id: string) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
}

/** Layout / dimension state */
interface LayoutProps {
  layout: WorkbenchLayout;
  onSetLayoutRatio: (ratio: number) => void;
  onSetLayoutRatioEnd?: () => void;
  pastHistory: Array<{ label: string; timestamp: number }>;
  onUndoTo: (index: number) => void;
  onTogglePin: (id: string | null) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

/** Rack section visibility */
interface RackSectionProps {
  rackSections: {
    identity?: boolean;
    essentialIdentity?: boolean;
    identityBranding?: boolean;
    globalUiSkin?: boolean;
    activeConstructionPlane?: boolean;
    moduleTaxonomy?: boolean;
    physicalEmulationProfile?: boolean;
    aestheticsGlobals?: boolean;
    aestheticsElements?: boolean;
    architecture?: boolean;
    diagnostics?: boolean;
  };
  onToggleRackSection: (section: string) => void;
}

/** Tree / group operations */
interface TreeOperationProps {
  onGroupSelected?: (() => void) | undefined;
  onBatchUngroup?: ((ids: string[]) => void) | undefined;
  onBatchUndoGroup?: ((childIds: string[]) => void) | undefined;
  onGroupDown?: ((id: string) => void) | undefined;
  onMoveNode?: ((sourceId: string, targetParentId: string, index?: number) => void) | undefined;
  onMoveNodeUpDown?: ((nodeId: string, direction: 'up' | 'down') => void) | undefined;
}

type RightDockContainerProps =
  & PanelStateProps
  & DataProps
  & SelectionProps
  & LayerManagementProps
  & ManipulationProps
  & BlueprintProps
  & LayoutProps
  & RackSectionProps
  & TreeOperationProps;


// ── Panel size persistence (extraído a dockPanelSizes.ts en Fase 4) ────

/**
 * RightDockContainer — Contenedor principal del dock derecho del inspector.
 * Orquestra los paneles de Layers, Element Properties, Rack Properties,
 * Blueprint Library, Terminal Logs, Info e History.
 *
 * Origen: era un monolito de 701 líneas.
 * Archivos extraídos:
 *   - dock/DockPanel.tsx               -> panel genérico reutilizable
 *   - dock/DockIconStrip.tsx           -> barra de iconos vertical
 *   - dock/DockRackSectionToolbar.tsx  -> barra de secciones de rack
 *   - dock/DockInfoPanel.tsx           -> panel de información + diagnóstico
 */
export default function RightDockContainer(props: RightDockContainerProps) {
  const {
    windowStates, onToggleWindow, isCollapsed, onToggleCollapse,
    hiddenNodeIds, lockedNodeIds, onToggleVisibility, onToggleLock,
    onBatchSetVisibility, onBatchSetLocked,
    manifest, selectedItem, selectedItemId, onSelectItem, pastHistory, onUndoTo,
    onRemoveItem, rackSections, onToggleRackSection, inspectorLevel
  } = props;

  const activeCount = Object.values(windowStates).filter(Boolean).length;
  const showContent = !isCollapsed && activeCount > 0;

  // ── Panel sizes (persisted) ─────────────────────────────────────────
  const [panelSizes, setPanelSizes] = useState<Record<string, number>>(loadPanelSizes);
  const [customWidth, setCustomWidth] = useState<number>(loadDockWidth);

  const handleLayout = useCallback((layout: Record<string, number>) => {
    setPanelSizes(layout);
    savePanelSizes(layout);
  }, []);

  // Get persisted size for a panel or use default fraction
  const getPanelSize = (id: string, defaultPct: number): number => {
    return panelSizes[id] ?? defaultPct;
  };

  const defaultWidth = activeCount * 260;
  const currentWidth = showContent
    ? Math.max(customWidth || defaultWidth, activeCount * 200)
    : 0;

  return (
    <div className="h-full flex flex-row select-none" role="complementary" aria-label="Inspector panels">

      {/* Drag handle for resizing the whole dock (left edge of content drawer) */}
      {showContent && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const initialWidth = currentWidth;
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const newWidth = Math.min(window.innerWidth * 0.7, Math.max(activeCount * 200, initialWidth - deltaX));
              setCustomWidth(newWidth);
              saveDockWidth(newWidth);
            };
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          className="w-1.5 hover:w-2 wb-surface-inset hover:bg-accent/20 border-l border-r wb-outline/40 cursor-col-resize transition-all duration-200 z-40 shrink-0 flex items-center justify-center"
          title="Drag to resize inspector panels"
        >
          <div className="w-[1px] h-4 bg-foreground/20 hover:bg-primary/50 transition-colors" />
        </div>
      )}

      {/* 1. DOCK EXPANDED CONTENT DRAWER — uses react-resizable-panels */}
      <div
        className="flex-shrink-0 flex flex-row wb-surface overflow-hidden transition-all duration-300 relative"
        style={{ width: `${currentWidth}px`, maxWidth: '70vw' }}
      >
        <PanelGroup orientation="horizontal" onLayoutChange={handleLayout} className="h-full">

          {/* PANEL: LAYERS */}
          {windowStates.window_layers && (
            <>
              <Panel defaultSize={getPanelSize('layers', 14)} minSize={8}>
                <DockPanel
                  title="Layers"
                  icon={<Layers className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_layers')}
                  accentColor="var(--wb-primary)"
                >
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <LayersPanel
                      manifest={manifest}
                      selectedItemId={selectedItemId}
                      onSelectItem={onSelectItem}
                      hiddenNodeIds={hiddenNodeIds}
                      lockedNodeIds={lockedNodeIds}
                      onToggleVisibility={onToggleVisibility}
                      onToggleLock={onToggleLock}
                      onRemoveItem={onRemoveItem}
                      multiSelectedIds={props.multiSelectedIds}
                      onSelectMultiple={props.onSelectMultiple}
                      onGroupSelected={props.onGroupSelected}
                      onGroupDown={props.onGroupDown}
                      onDuplicateItem={props.onDuplicateItem}
                      onDuplicateGroup={props.onDuplicateItem}
                      onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprintFromNodeId || (props.onSaveGroupAsBlueprint ? (id: string) => {
                        const tree = manifest.ui?.tree;
                        if (!tree) return;
                        const node = findNodeInTree(tree, id);
                        if (node) {
                          const groupNode = {
                            id: node.id,
                            label: (node.meta?.label as string) || node.id,
                            pos: node.layout?.pos || { x: 0, y: 0 },
                            children: (node.children || []).map((c: OmegaNode) => ({
                              id: c.id,
                              type: c.cellRef || c.kind || 'knob',
                              label: (c.meta?.label as string) || c.id,
                              pos: c.layout?.pos || { x: 0, y: 0 },
                              size: c.layout?.size || { width: 48, height: 48 },
                              style: c.style || {},
                              bind: c.bind ? { target: c.bind } : undefined
                            }))
                          };
                          props.onSaveGroupAsBlueprint!(groupNode as GroupNode);
                        }
                      } : undefined)}
                      onUngroupNode={props.onUngroupNode}
                      onMoveNode={props.onMoveNode}
                      onMoveNodeUpDown={props.onMoveNodeUpDown}
                      onUpdateItem={props.onUpdateItem}
                      onBatchSetVisibility={onBatchSetVisibility}
                      onBatchSetLocked={onBatchSetLocked}
                      onBatchUngroup={props.onBatchUngroup}
                      onBatchUndoGroup={props.onBatchUndoGroup}
                    />
                  </div>
                </DockPanel>
              </Panel>
              <PanelResizeHandle className="w-1 hover:w-1.5 wb-surface-strong hover:bg-primary/20 transition-all cursor-col-resize shrink-0" />
            </>
          )}

          {/* PANEL: ELEMENT PROPERTIES */}
          {windowStates.window_properties && (
            <>
              <Panel defaultSize={getPanelSize('properties', 17)} minSize={10}>
                <DockPanel
                  title="Element Properties"
                  icon={<Sliders className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_properties')}
                  accentColor="var(--wb-accent)"
                >
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedItemId ? (
                      <WorkbenchInspector
                        isLiveMode={props.isLiveMode} uiTheme={props.uiTheme}
                        manifest={manifest} selectedItem={selectedItem}
                        selectedItemId={selectedItemId} highlightPath={props.highlightPath}
                        availableBinds={props.availableBinds} extraResources={props.extraResources}
                        audit={props.audit}
                        onUpdateItem={props.onUpdateItem} onUpdateManifest={props.onUpdateManifest}
                        onSelectItem={onSelectItem} onAddEntity={props.onAddEntity}
                        onDuplicateItem={props.onDuplicateItem} onRemoveItem={props.onRemoveItem}
                        onAddModulation={props.onAddModulation} onRemoveModulation={props.onRemoveModulation}
                        onUpdateModulation={props.onUpdateModulation} onOpenModGrid={props.onOpenModGrid}
                        addContainer={props.addContainer} updateContainer={props.updateContainer}
                        removeContainer={props.removeContainer} onHelp={props.onHelp}
                        onRemoveResource={props.onRemoveResource}
                        resolveAsset={props.resolveAsset}
                        onTriggerUpload={props.onTriggerUpload}
                        onOpenConfig={props.onOpenConfig}
                        onOpenLibrary={props.onOpenLibrary}
                        onSelectBlueprint={props.onSelectBlueprint}
                        exportSelectedAsBlueprint={props.exportSelectedAsBlueprint}
                        onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint}
                        onUngroupNode={props.onUngroupNode}
                        pinnedNodeId={props.pinnedNodeId}
                        onTogglePin={props.onTogglePin}
                        layout={props.layout}
                        onSetLayoutRatio={props.onSetLayoutRatio}
                        onSetLayoutRatioEnd={props.onSetLayoutRatioEnd}
                        multiSelectedIds={props.multiSelectedIds}
                        onSelectMultiple={props.onSelectMultiple}
                        inspectorLevel={inspectorLevel}
                        activeSection={props.activeSection}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-foreground/30 text-xs uppercase tracking-widest gap-2 py-20">
                        <Sliders className="w-5 h-5 opacity-40 text-primary" />
                        <span>Select an element</span>
                      </div>
                    )}
                  </div>
                </DockPanel>
              </Panel>
              <PanelResizeHandle className="w-1 hover:w-1.5 wb-surface-strong hover:bg-primary/20 transition-all cursor-col-resize shrink-0" />
            </>
          )}

          {/* PANEL: RACK PROPERTIES */}
          {windowStates.window_rack_properties && (
            <>
              <Panel defaultSize={getPanelSize('rack', 17)} minSize={10}>
                <DockPanel
                  title="Rack Properties"
                  icon={<Settings className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_rack_properties')}
                  accentColor="#a855f7"
                >
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <WorkbenchInspector
                      isLiveMode={props.isLiveMode} uiTheme={props.uiTheme}
                      manifest={manifest} selectedItem={manifest}
                      selectedItemId={null} highlightPath={props.highlightPath}
                      availableBinds={props.availableBinds} extraResources={props.extraResources}
                      audit={props.audit}
                      onUpdateItem={props.onUpdateItem} onUpdateManifest={props.onUpdateManifest}
                      onSelectItem={onSelectItem} onAddEntity={props.onAddEntity}
                      onDuplicateItem={props.onDuplicateItem} onRemoveItem={props.onRemoveItem}
                      onAddModulation={props.onAddModulation} onRemoveModulation={props.onRemoveModulation}
                      onUpdateModulation={props.onUpdateModulation} onOpenModGrid={props.onOpenModGrid}
                      addContainer={props.addContainer} updateContainer={props.updateContainer}
                      removeContainer={props.removeContainer} onHelp={props.onHelp}
                      onRemoveResource={props.onRemoveResource}
                      resolveAsset={props.resolveAsset}
                      onTriggerUpload={props.onTriggerUpload}
                      onOpenConfig={props.onOpenConfig}
                      onOpenLibrary={props.onOpenLibrary}
                      onSelectBlueprint={props.onSelectBlueprint}
                      exportSelectedAsBlueprint={props.exportSelectedAsBlueprint}
                      onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint}
                      onUngroupNode={props.onUngroupNode}
                      pinnedNodeId={props.pinnedNodeId}
                      onTogglePin={props.onTogglePin}
                      layout={props.layout}
                      onSetLayoutRatio={props.onSetLayoutRatio}
                      onSetLayoutRatioEnd={props.onSetLayoutRatioEnd}
                      multiSelectedIds={props.multiSelectedIds}
                      onSelectMultiple={props.onSelectMultiple}
                      visibleSections={rackSections}
                      onToggleRackSection={onToggleRackSection}
                      inspectorLevel={inspectorLevel}
                      activeSection={props.activeSection}
                    />
                  </div>
                </DockPanel>
              </Panel>
              <PanelResizeHandle className="w-1 hover:w-1.5 wb-surface-strong hover:bg-primary/20 transition-all cursor-col-resize shrink-0" />
            </>
          )}

          {/* PANEL: COMPLIANCE */}
          {windowStates.window_compliance && (
            <>
              <Panel defaultSize={getPanelSize('compliance', 14)} minSize={8}>
                <DockPanel
                  title="Compliance"
                  icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_compliance')}
                  variant="subtle"
                  accentColor="#22c55e"
                >
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <CompliancePanel
                      audit={props.audit}
                      manifest={manifest}
                      {...(props.onNavigate ? { onNavigate: props.onNavigate } : {})}
                    />
                  </div>
                </DockPanel>
              </Panel>
              <PanelResizeHandle className="w-1 hover:w-1.5 wb-surface-strong hover:bg-primary/20 transition-all cursor-col-resize shrink-0" />
            </>
          )}

          {/* PANEL: BLUEPRINT LIBRARY */}
          {windowStates.window_blueprints && (
            <>
              <Panel defaultSize={getPanelSize('blueprints', 14)} minSize={8}>
                <DockPanel
                  title="Blueprint Library"
                  icon={<Zap className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_blueprints')}
                  variant="subtle"
                  accentColor="#fbbf24"
                >
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <BlueprintLibraryPanel
                      onSelectBlueprint={props.onSelectBlueprint || (() => {})}
                      onAltClickBlueprint={props.onAltClickBlueprint}
                      onLoadAcepack={props.onLoadAcepack}
                      onSelectUserBlueprint={props.onSelectUserBlueprint}
                      userBlueprints={props.userBlueprints}
                    />
                  </div>
                </DockPanel>
              </Panel>
              <PanelResizeHandle className="w-1 hover:w-1.5 wb-surface-strong hover:bg-primary/20 transition-all cursor-col-resize shrink-0" />
            </>
          )}

          {/* PANEL: TERMINAL LOGS */}
          {windowStates.window_logs && (
            <>
              <Panel defaultSize={getPanelSize('logs', 13)} minSize={8}>
                <DockPanel
                  title="Terminal Logs"
                  icon={<Terminal className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_logs')}
                  variant="subtle"
                  accentColor="#ef4444"
                >
                  <div className="flex-1 overflow-hidden flex flex-col relative wb-surface-inset">
                    <LogTerminal logs={props.logs || []} />
                  </div>
                </DockPanel>
              </Panel>
              <PanelResizeHandle className="w-1 hover:w-1.5 wb-surface-strong hover:bg-primary/20 transition-all cursor-col-resize shrink-0" />
            </>
          )}

          {/* INFO PANEL */}
          {windowStates.window_info && (
            <Panel defaultSize={getPanelSize('info', 8)} minSize={4}>
              <div className="h-full flex flex-col overflow-hidden wb-surface">
                <DockPanel
                  title="Information"
                  icon={<Info className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_info')}
                >
                  <DockInfoPanel
                    selectedItem={selectedItem}
                    selectedItemId={selectedItemId}
                    contract={props.contract}
                    isLiveMode={props.isLiveMode}
                    uiTheme={props.uiTheme}
                  />
                </DockPanel>
              </div>
            </Panel>
          )}

          {/* HISTORY PANEL */}
          {windowStates.window_history && (
            <Panel defaultSize={getPanelSize('history', 8)} minSize={4}>
              <div className="h-full flex flex-col overflow-hidden wb-surface">
                <DockPanel
                  title="History"
                  icon={<History className="w-3.5 h-3.5 text-primary" />}
                  onClose={() => onToggleWindow('window_history')}
                >
                  <DockHistoryPanel pastHistory={pastHistory} onUndoTo={onUndoTo} />
                </DockPanel>
              </div>
            </Panel>
          )}

        </PanelGroup>
      </div>

      {/* 2. DOCK COLLAPSE HANDLE */}
      {activeCount > 0 && (
        <div
          onClick={onToggleCollapse}
          className="w-1.5 hover:w-2 wb-surface-inset hover:bg-accent/20 border-l border-r wb-outline/40 flex items-center justify-center cursor-pointer select-none transition-all duration-200 group z-40 shrink-0"
          title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
        >
          <span className="text-[8px] opacity-40 group-hover:opacity-100 transition-opacity text-foreground select-none">
            {isCollapsed ? '◀' : '▶'}
          </span>
        </div>
      )}

      {/* 2.5. RACK SECTION TOOLBAR */}
      {windowStates.window_rack_properties && !isCollapsed && (
        <DockRackSectionToolbar
          rackSections={rackSections}
          onToggleRackSection={onToggleRackSection}
        />
      )}

      {/* 3. RIGHT ICON STRIP */}
      <DockIconStrip
        isCollapsed={isCollapsed}
        windowStates={windowStates}
        onToggleWindow={onToggleWindow}
      />

    </div>
  );
}
