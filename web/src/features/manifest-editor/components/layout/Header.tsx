/**
 * @purpose Renderiza el componente de encabezado para el editor de manifesto OMEGA, incluyendo menús, identidad del sistema y botones de control.
 * @purpose_en Renders the header component for the OMEGA manifest editor, including menus, system identity, and control buttons.
 * @refactorable true (contains too many props and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:1vxiccn
 * @lastUpdated 2026-06-20T09:40:06.698Z
 */

import { Shield } from 'lucide-react';

import type { AuditResult } from '@/omega-ui-core/types/audit';
import { ComplianceBadge } from '../shared/ComplianceBadge';
 
import ThemeSelector from '../header/ThemeToggle';
import MenuBar from './MenuBar';
import { SimulationStatusBadge } from '@/features/manifest-editor/components/header/SimulationStatusBadge';
import type { SimulationBridgeState } from '@/features/manifest-editor/hooks/useSimulationBridge';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

interface HeaderProps {
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportManifest: (mode: 'work' | 'distilled') => void;
  onExportPack: () => void;
  onExportOmegaRack: () => void;
  onExportCAD: () => void;
  onExportContract: (format: 'ts' | 'cpp') => void;
  onGenerateMockup: () => void;
  onDeploy: () => void;
  onToggleLogs: () => void;
  showLogs: boolean;
  activeTabType: 'orbital' | 'rack' | 'source' | 'history';
  onTabFocus: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  onHelp: () => void;
  uiTheme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast';
  setUiTheme: (theme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast') => void;
  audit: AuditResult;
  onOpenAudit: () => void;
  onTriggerUpload: (id: string) => void;
  onOpenAbout: () => void;
  onOpenConfig: () => void;
  onOpenCellEditor?: (() => void) | undefined;
  onToggleTour?: (() => void) | undefined;
  onOpenGallery?: (() => void) | undefined;
  onImportDistilledJson?: (() => void) | undefined;
  onLinkDirectory?: (() => void) | undefined;
  isDirectoryLinked?: boolean;
  isSplit?: boolean;
  onToggleSplit?: () => void;
  windowStates?: { window_layers: boolean; window_properties: boolean; window_rack_properties: boolean; window_blueprints: boolean; window_compliance: boolean; window_info: boolean; window_history: boolean; window_logs: boolean } | undefined;
  onToggleWindow?: ((name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void) | undefined;
  simulationBridge?: SimulationBridgeState;
  gridVisible?: boolean;
  showGuides?: boolean;
  onToggleGrid?: (() => void) | undefined;
  onToggleGuides?: (() => void) | undefined;
  miniMapVisible?: boolean;
  onToggleMiniMap?: (() => void) | undefined;
  rackSections?: {
    identity: boolean;
    essentialIdentity: boolean;
    identityBranding: boolean;
    globalUiSkin: boolean;
    activeConstructionPlane: boolean;
    moduleTaxonomy: boolean;
    physicalEmulationProfile: boolean;
    aestheticsGlobals: boolean;
    aestheticsElements: boolean;
    architecture: boolean;
    diagnostics?: boolean;
  } | undefined;
  onToggleRackSection?: ((section: 'identity' | 'essentialIdentity' | 'identityBranding' | 'globalUiSkin' | 'activeConstructionPlane' | 'moduleTaxonomy' | 'physicalEmulationProfile' | 'aestheticsGlobals' | 'aestheticsElements' | 'architecture' | 'diagnostics') => void) | undefined;
  // Phase 39 — recovered from backup MenuBar
  selectedNodeId?: string | null | undefined;
  multiSelectedIds?: string[] | undefined;
  onSaveCellAsBlueprint?: (() => void) | undefined;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  onSetInspectorLevel?: ((level: 'simple' | 'medium' | 'advanced') => void) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  onUpdateManifest?: ((updates: Partial<OMEGA_Manifest>) => void) | undefined;
  isLiveMode?: boolean;
  // Transform menu callbacks
  onSetTool?: ((tool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null) => void) | undefined;
  onOpenNumericResize?: (() => void) | undefined;
  onOpenNumericRotate?: (() => void) | undefined;
  onCopyTransform?: (() => void) | undefined;
  onPasteTransform?: (() => void) | undefined;
  onAlign?: ((dir: string) => void) | undefined;
  onDistribute?: ((dir: string) => void) | undefined;

  // Clipboard actions
  onCopy?: (() => void) | undefined;
  onCut?: (() => void) | undefined;
  onPaste?: (() => void) | undefined;
  canCopy?: boolean | undefined;
  canCut?: boolean | undefined;
  canPaste?: boolean | undefined;
}
 
export default function Header(props: HeaderProps) {
  return (
    <header role="banner" className="h-11 border-b wb-outline wb-surface backdrop-blur-md flex items-center justify-between px-6 z-[100] shrink-0 transition-colors duration-500">
      {/* LEFT: ENGINEERING MENUS */}
      <div className="flex-1 flex items-center gap-4">
        <MenuBar 
          onTriggerUpload={props.onTriggerUpload}
          onExportManifest={props.onExportManifest}
          onExportPack={props.onExportPack}
          onExportOmegaRack={props.onExportOmegaRack}
          onExportCAD={props.onExportCAD}
          onExportContract={props.onExportContract}
          onDeploy={props.onDeploy}
          onReset={props.onReset}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onToggleLogs={props.onToggleLogs}
          showLogs={props.showLogs}
          onHelp={props.onHelp}
          onGenerateMockup={props.onGenerateMockup}
          onTabFocus={props.onTabFocus}
          onOpenAudit={props.onOpenAudit}
          onOpenAbout={props.onOpenAbout}
          onOpenConfig={props.onOpenConfig}
          onOpenCellEditor={props.onOpenCellEditor}
          onToggleTour={props.onToggleTour}
          onOpenGallery={props.onOpenGallery}
          onImportDistilledJson={props.onImportDistilledJson}
          onLinkDirectory={props.onLinkDirectory}
          isDirectoryLinked={props.isDirectoryLinked}
          windowStates={props.windowStates}
          onToggleWindow={props.onToggleWindow}
          rackSections={props.rackSections}
          onToggleRackSection={props.onToggleRackSection}
          gridVisible={props.gridVisible}
          showGuides={props.showGuides}
          onToggleGrid={props.onToggleGrid}
          onToggleGuides={props.onToggleGuides}
          miniMapVisible={props.miniMapVisible}
          onToggleMiniMap={props.onToggleMiniMap}
          selectedNodeId={props.selectedNodeId}
          multiSelectedIds={props.multiSelectedIds}
          onSaveCellAsBlueprint={props.onSaveCellAsBlueprint}
          inspectorLevel={props.inspectorLevel}
          onSetInspectorLevel={props.onSetInspectorLevel}
          manifest={props.manifest}
          onUpdateManifest={props.onUpdateManifest}
          isLiveMode={props.isLiveMode}
          // Transform menu callbacks
          onSetTool={props.onSetTool}
          onOpenNumericResize={props.onOpenNumericResize}
          onOpenNumericRotate={props.onOpenNumericRotate}
          onCopyTransform={props.onCopyTransform}
          onPasteTransform={props.onPasteTransform}
          onAlign={props.onAlign}
          onDistribute={props.onDistribute}
          onCopy={props.onCopy}
          onCut={props.onCut}
          onPaste={props.onPaste}
          canCopy={props.canCopy}
          canCut={props.canCut}
          canPaste={props.canPaste}
        />
      </div>

      {/* CENTER: SYSTEM IDENTITY */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary/20 border border-primary/40 rounded-xs flex items-center justify-center">
            <Shield className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] wb-text whitespace-nowrap">
            OMEGA <span className="text-primary/60">Manifest Editor</span>
          </span>
        </div>
      </div>

      {/* RIGHT: SYSTEM CONTROLS */}
      <div className="flex-1 flex items-center justify-end gap-4">
        <div>
          <ComplianceBadge audit={props.audit} onClick={props.onOpenAudit} />
        </div>
        <div className="h-6 w-px wb-outline opacity-20 mx-1" />
        <ThemeSelector uiTheme={props.uiTheme} setUiTheme={props.setUiTheme} />

        {props.simulationBridge && (
          <SimulationStatusBadge 
            status={props.simulationBridge.status}
            lastSyncAt={props.simulationBridge.lastSuccessfulSyncAt}
            onForceResync={props.simulationBridge.forceResync}
          />
        )}
      </div>
    </header>
  );
}
