'use client';

/**
 * @purpose Renderiza una vista modular de instrumento de alta fidelidad para editar manifestos OMEGA, incluyendo inyección de señal, líneas de modulación y componentes HUD del rack.
 * @purpose_en Renders a high-fidelity modular instrument view for editing OMEGA manifests, including signal injection, modulation lines, and rack HUD components.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:25,sig:1syizax
 * @lastUpdated 2026-06-20T18:49:08.392Z
 */

import React, { useMemo } from 'react';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';
import type { OMEGA_Manifest, OMEGA_Contract, OMEGA_Modulation, HybridEntityUpdate, OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { AuditResult } from '@/omega-ui-core/types/audit';

// Modular Components & Hooks
import { SignalInjector } from '../rack/SignalInjector';
import { ModulationLines } from '../rack/ModulationLines';
import { RackHUD } from '../rack/RackHUD';
import RenderedRackTree from '../rack/RenderedRackTree';
import { useRackSimulation } from '@/features/manifest-editor/hooks/rack/useRackSimulation';
import { useRackLayout } from '@/features/manifest-editor/hooks/rack/useRackLayout';
import { useRackContextMenu } from '@/features/manifest-editor/hooks/rack/useRackContextMenu';
import { useRackStartupAssistant } from '@/features/manifest-editor/hooks/rack/useRackStartupAssistant';
import { useRackGhostPreview } from '@/features/manifest-editor/hooks/rack/useRackGhostPreview';
import { useDesignTokens } from '@/omega-ui-core/hooks/useDesignTokens';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { InjectionPreviewOverlay } from './InjectionPreviewOverlay';
import { GhostPreviewOverlay } from './GhostPreviewOverlay';
import BindingOverlay from '../rack/BindingOverlay';
import ConnectionOverlay from '../rack/ConnectionOverlay';
import type { GhostItem as AlignGhostItem } from '@/features/manifest-editor/utils/alignmentConstants';
import AlignGhostOverlay from './AlignGhostOverlay';
import RackContextMenu from './RackContextMenu';
import RackStartupAssistant from './RackStartupAssistant';
import { handleSnapToGrid } from '../../utils/rackUtils';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

// ── Props interfaces (categorized) ─────────────────────────────────────

interface DataProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  audit: AuditResult;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  pushParameterUpdate?: ((id: string, value: number) => void) | undefined;
  previewManifest?: OMEGA_Manifest | null;
}

interface SelectionProps {
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
  hiddenNodeIds?: string[] | undefined;
  lockedNodeIds?: string[] | undefined;
  gridVisible?: boolean | undefined;
}

interface ViewportProps {
  zoom?: number;
  pan?: { x: number; y: number } | undefined;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null | undefined;
  alignGhostItems?: AlignGhostItem[] | undefined;
  alignGhostType?: string | undefined;
}

interface ManipulationProps {
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void;
  onUpdateItems?: ((updatesMap: Record<string, Partial<OmegaNode>>) => void) | undefined;
  onDuplicateItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onGroupSelected?: (ids: string[]) => void;
  onUngroupNode?: (groupId: string) => void;
}

interface GhostProps {
  ghostPosition?: { x: number; y: number } | null | undefined;
  ghostSize?: { width: number; height: number } | undefined;
  isGhostCollision?: boolean | undefined;
  isGhostVisible?: boolean | undefined;
  onGhostMouseMove?: ((clientX: number, clientY: number) => void) | undefined;
  onGhostClick?: ((x: number, y: number) => void) | undefined;
  onGhostCancel?: (() => void) | undefined;
}

interface StartupProps {
  onOpenGallery?: (() => void) | undefined;
  onLinkWorkspace?: (() => void) | undefined;
  onCreateFromScratch?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;
}

interface ModulationProps {
  isBindingMode?: boolean | undefined;
  onAddModulation?: ((mod: OMEGA_Modulation) => void) | undefined;
  onRemoveModulation?: ((id: string) => void) | undefined;
  startTransaction?: ((label: string) => void) | undefined;
  commitTransaction?: (() => void) | undefined;
}

interface TransformProps {
  onNumericResize?: (() => void) | undefined;
  onNumericRotate?: (() => void) | undefined;
  onCopyTransform?: (() => void) | undefined;
  onPasteTransform?: (() => void) | undefined;
  onAlign?: ((dir: string) => void) | undefined;
  onDistribute?: ((dir: string) => void) | undefined;
  // Clipboard actions
  onCopyItems?: ((ids: string[]) => void) | undefined;
  onCutItems?: ((ids: string[]) => void) | undefined;
  onPaste?: ((targetPos?: { x: number; y: number }) => void) | undefined;
  canPaste?: boolean | undefined;
  // Empty space context menu
  onToggleGrid?: (() => void) | undefined;
  onToggleGuides?: (() => void) | undefined;
  onAddEntity?: ((type: 'control' | 'jack', template?: Partial<ManifestEntity>) => void) | undefined;
  onReset?: (() => void) | undefined;
  onRenameItem?: ((id: string) => void) | undefined;
  onBringToFront?: ((id: string) => void) | undefined;
  onSendToBack?: ((id: string) => void) | undefined;
  onSaveAsBlueprint?: ((id: string) => void) | undefined;
  onSelectAll?: (() => void) | undefined;
}

type VirtualRackProps =
  DataProps &
  SelectionProps &
  ViewportProps &
  ManipulationProps &
  GhostProps &
  StartupProps &
  ModulationProps &
  TransformProps;



/**
 * VirtualRack (v7.2.3) - Aseptic Orchestrator
 * High-fidelity modular instrument viewport.
 */
export default function VirtualRack({
  manifest,
  contract,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  zoom = 1.0,
  pan = { x: 0, y: 0 },
  isLiveMode,
  setIsLiveMode,
  resolveAsset,
  pushParameterUpdate,
  previewManifest,
  multiSelectedIds,
  onSelectMultiple,
  hiddenNodeIds = [],
  lockedNodeIds = [],
  onDuplicateItem,
  onRemoveItem,
  onToggleLock,
  onToggleVisibility,
  onGroupSelected,
  onUngroupNode,
  onUpdateItems,
  gridVisible: gridVisibleProp,
  onOpenGallery,
  onLinkWorkspace,
  onCreateFromScratch,
  isDirectoryLinked,
  ghostPosition,
  ghostSize,
  isGhostCollision,
  isGhostVisible = false,
  onGhostMouseMove,
  onGhostClick,
  onGhostCancel,
  alignGhostItems,
  alignGhostType,
  isBindingMode = false,
  onAddModulation,
  onRemoveModulation,
  startTransaction,
  commitTransaction,
  activeTool,
  onNumericResize,
  onNumericRotate,
  onCopyTransform,
  onPasteTransform,
  onAlign,
  onDistribute,
  onCopyItems,
  onCutItems,
  onPaste,
  canPaste,
  onToggleGrid,
  onToggleGuides,
  onAddEntity,
  onReset,
  onRenameItem,
  onBringToFront,
  onSendToBack,
  onSaveAsBlueprint,
  onSelectAll,
}: VirtualRackProps) {
  const inputSignalService = getService(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE);
  const skin = manifest.ui?.skin || 'industrial';
  const { allVars } = useDesignTokens(manifest);
  const { rackRef, handleRackMouseMove, handleRackGhostClick } = useRackGhostPreview({
    isGhostVisible,
    ghostPosition,
    onGhostCancel,
    onGhostClick,
    onGhostMouseMove,
    zoom,
  });
  const [activePlane, setActivePlane] = React.useState('MAIN');
  const [activeDragOffset, setActiveDragOffset] = React.useState<{ x: number; y: number; draggedNodeId: string } | null>(null);
  const [activeResizeOffset, setActiveResizeOffset] = React.useState<{ x: number; y: number; width: number; height: number; resizedNodeId: string } | null>(null);
  const [activeRotationOffset, setActiveRotationOffset] = React.useState<{ angle: number; rotatedNodeId: string } | null>(null);


  // ── Hooks de layout, simulación, menú contextual y startup ─────────
  const { width, height, allElements } = useRackLayout(manifest);
  const { runtimeValues, activeInjectorPort, setActiveInjectorPort, updateValue } = useRackSimulation(allElements, isLiveMode, pushParameterUpdate);

  // ── Context Menu ───────────────────────────────────────────────────
  const {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    targetGroupId,
    isGroupEnabled: cmGroupEnabled,
    isUngroupEnabled: cmUngroupEnabled,
    selectedIds: cmSelectedIds,
  } = useRackContextMenu(
    manifest,
    isLiveMode,
    isGhostVisible,
    onGhostCancel,
  );

  // ── Startup Assistant ─────────────────────────────────────────────—
  const {
    showAssistant: showStartupAssistant,
    handleCreateFromScratch,
  } = useRackStartupAssistant(manifest, isLiveMode, allElements.length);

  const handleBindNode = React.useCallback((nodeId: string, bind: string) => {
    onUpdateItem(nodeId, { bind });
  }, [onUpdateItem]);

  // Active signal port IDs for modulation lines visualization
  const activeSignalPortIds = Object.keys(inputSignalService.getAllActiveSignals());

  const grid = manifest.ui?.layout?.grid;
  const gridSpacingX = grid?.spacingX ?? 24;
  const gridSpacingY = grid?.spacingY ?? 24;
  // Phase 39 — prefer prop from WorkbenchViewport, fall back to manifest-derived value.
  const gridVisible = gridVisibleProp ?? (grid?.visible ?? false);

  // RACK MASTER ENTITY (Era 7.2.3 Architectural Host)
  const rackNode = useMemo((): OmegaNode => ({
    id: 'RACK_MASTER',
    kind: 'rack',
    role: 'infrastructure',
    cellRef: 'rack',
    layout: {
      pos: { x: 0, y: 0 },
      size: { width: manifest.ui?.dimensions?.width || 800, height: manifest.ui?.dimensions?.height || 400 },
    },
    meta: { label: 'Master Rack Chassis' },
    style: {
      ...((manifest.ui as Record<string, unknown>)?.style || {}),
      attachments: (manifest.ui as Record<string, unknown>)?.attachments || [],
    },
  }), [manifest.ui]);

  const rackHTML = useMemo(() => CellRenderer.renderCellHTML(rackNode, {
    skin,
    zoom: 1.0,
    runtimeValue: 0,
    steps: 100,
    manifest,
    resolveAsset,
    isLiveMode,
  }), [rackNode, skin, manifest, resolveAsset, isLiveMode]);

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center gap-8 p-12 relative overflow-hidden" 
      onClick={() => onSelectItem(null)}
      style={allVars as React.CSSProperties}
    >
      <RackHUD 
        isLiveMode={isLiveMode} 
        setIsLiveMode={setIsLiveMode} 
        activeTab={activePlane} 
        setActiveTab={setActivePlane} 
        allElements={allElements} 
        planes={manifest.ui.layout?.planes || ['MAIN']}
      />
 
      {/* RACK FRAME (UNIFIED ENGINE) */}
      <div 
        ref={rackRef} 
        className={`rack-viewport relative transition-[box-shadow] duration-500 ${isLiveMode ? 'shadow-[0_0_120px_rgba(0,0,0,1)]' : ''}`}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          boxShadow: isLiveMode ? '0 0 120px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.3)',
          transform: `translate(${pan?.x ?? 0}px, ${pan?.y ?? 0}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
        onMouseDown={(e) => {
          if (isGhostVisible && ghostPosition) {
            e.stopPropagation();
            if (e.button === 0) {
              handleRackGhostClick(ghostPosition.x, ghostPosition.y);
            }
            return;
          }
        }}
        onClick={(e) => {
          if (isGhostVisible) {
            e.stopPropagation();
            return;
          }
          e.stopPropagation(); onSelectItem(null);
        }}
        onMouseMove={handleRackMouseMove}
        onContextMenu={(e) => {
          const rackElement = rackRef.current;
          if (rackElement) {
            const rect = rackElement.getBoundingClientRect();
            const rackX = (e.clientX - rect.left) / zoom;
            const rackY = (e.clientY - rect.top) / zoom;
            openContextMenu(e, multiSelectedIds, onSelectItem, rackX, rackY);
          } else {
            openContextMenu(e, multiSelectedIds, onSelectItem);
          }
        }}
      >
        {/* The Master Chassis HTML */}
        <div 
          className="absolute inset-0 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: rackHTML }}
        />

        {/* GRID OVERLAY */}
        {gridVisible && (
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255, 210, 0, 0.35) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 210, 0, 0.35) 1px, transparent 1px)
              `,
              backgroundSize: `${gridSpacingX}px ${gridSpacingY}px`,
            }}
          />
        )}

        {/* UCA NATIVE ENGINE (Recursive Tree) */}
        <div className="absolute inset-0 uca-native-layer">
          <RenderedRackTree
            manifest={manifest}
            hiddenNodeIds={hiddenNodeIds}
            resolveAsset={resolveAsset}
            selectedItemId={selectedItemId}
            multiSelectedIds={multiSelectedIds}
            onSelectItem={onSelectItem}
            onSelectMultiple={onSelectMultiple}
            onUpdateItem={onUpdateItem}
            onUpdateItems={onUpdateItems}
            runtimeValues={runtimeValues}
            lockedNodeIds={lockedNodeIds}
            isLiveMode={isLiveMode}
            updateValue={updateValue}
            zoom={zoom}
            pan={pan}
            activeDragOffset={activeDragOffset}
            setActiveDragOffset={setActiveDragOffset}
            activeResizeOffset={activeResizeOffset}
            setActiveResizeOffset={setActiveResizeOffset}
            activeRotationOffset={activeRotationOffset}
            setActiveRotationOffset={setActiveRotationOffset}
            startTransaction={startTransaction}
            commitTransaction={commitTransaction}
            activeTool={activeTool}
          />
        </div>

        {/* MODULATION LINES OVERLAY (vR2) */}
        {activeSignalPortIds.length > 0 && (
          <ModulationLines
            activePortIds={activeSignalPortIds}
            containerRef={rackRef}
          />
        )}

        {/* CONNECTION OVERLAY — interactive modulation editor (P11) */}
        {onAddModulation && onRemoveModulation && (
          <ConnectionOverlay
            manifest={manifest}
            containerRef={rackRef}
            onAddModulation={onAddModulation}
            onRemoveModulation={onRemoveModulation}
          />
        )}

        {/* BINDING OVERLAY — visual binding status + editor */}
        <BindingOverlay
          manifest={manifest}
          contract={contract}
          containerRef={rackRef}
          isBindingMode={isBindingMode}
          onBindNode={handleBindNode}
        />

        {/* BLUEPRINT STUDIO GHOST LAYER (Phase 11) */}
        {previewManifest && (
          <InjectionPreviewOverlay 
            previewManifest={previewManifest} 
            resolveAsset={resolveAsset} 
          />
        )}

        {/* INTERACTIVE GHOST PREVIEW LAYER (v9.2.1) */}
        {isGhostVisible && ghostPosition && ghostSize && (
          <GhostPreviewOverlay
            x={ghostPosition.x}
            y={ghostPosition.y}
            width={ghostSize.width}
            height={ghostSize.height}
            isCollision={isGhostCollision ?? false}
          />
        )}

        {/* ALIGNMENT GHOST PREVIEW — shown on hover over align buttons */}
        {alignGhostItems && alignGhostItems.length > 0 && alignGhostType && (
          <div data-ghost-overlay>
            <AlignGhostOverlay
              items={alignGhostItems}
              alignType={alignGhostType}
            />
          </div>
        )}

        {/* SIMULATION SIGNAL INJECTOR (Overlay) */}
        {activeInjectorPort && <SignalInjector portId={activeInjectorPort} onClose={() => setActiveInjectorPort(null)} />}

      </div>

      {/* EMPTY-RACK STARTUP ASSISTANT */}
      {showStartupAssistant && (
        <RackStartupAssistant
          onOpenGallery={onOpenGallery}
          onLinkWorkspace={onLinkWorkspace}
          onCreateFromScratch={() => handleCreateFromScratch(onCreateFromScratch)}
          isDirectoryLinked={isDirectoryLinked}
          elementCount={0}
        />
      )}

      {contextMenu && (
        <RackContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetId={contextMenu.targetId}
          {...(contextMenu.rackX !== undefined ? { rackX: contextMenu.rackX } : {})}
          {...(contextMenu.rackY !== undefined ? { rackY: contextMenu.rackY } : {})}
          isLocked={contextMenu.targetId ? lockedNodeIds.includes(contextMenu.targetId) : false}
          isHidden={contextMenu.targetId ? hiddenNodeIds.includes(contextMenu.targetId) : false}
          onClose={closeContextMenu}
          onSelect={onSelectItem}
          onDuplicate={(dupId) => { if (onDuplicateItem) { onDuplicateItem(dupId); } else { onSelectItem(dupId); } }}
          onDelete={(delId) => { if (onRemoveItem) { onRemoveItem(delId); } else { onSelectItem(null); } }}
          onToggleLock={onToggleLock || (() => {})}
          onToggleVisibility={onToggleVisibility || (() => {})}
          onSnapToGrid={(id) => handleSnapToGrid(id, manifest, onUpdateItem)}
          isGroupEnabled={cmGroupEnabled}
          isUngroupEnabled={cmUngroupEnabled}
          {...(onGroupSelected ? { onGroup: () => { onGroupSelected(cmSelectedIds); } } : {})}
          {...(onUngroupNode ? { onUngroup: () => { if (targetGroupId) onUngroupNode(targetGroupId); } } : {})}
          onNumericResize={onNumericResize}
          onNumericRotate={onNumericRotate}
          onCopyTransform={onCopyTransform}
          onPasteTransform={onPasteTransform}
          onAlign={onAlign}
          onDistribute={onDistribute}
          onCopy={() => {
            const ids = cmSelectedIds.length > 0 ? cmSelectedIds : (contextMenu.targetId ? [contextMenu.targetId] : []);
            if (ids.length > 0) onCopyItems?.(ids);
          }}
          onCut={() => {
            const ids = cmSelectedIds.length > 0 ? cmSelectedIds : (contextMenu.targetId ? [contextMenu.targetId] : []);
            if (ids.length > 0) onCutItems?.(ids);
          }}
          onPaste={(targetPos) => onPaste?.(targetPos)}
          canPaste={canPaste}
          onToggleGrid={onToggleGrid}
          onToggleGuides={onToggleGuides}
          onAddEntity={onAddEntity}
          onReset={onReset}
          onRename={onRenameItem}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
          onSaveAsBlueprint={onSaveAsBlueprint}
          onSelectAll={onSelectAll}
          isGroup={contextMenu.targetId ? findNodeInTree(manifest.ui?.tree || { id: 'root', kind: 'cell', layout: { pos: { x: 0, y: 0 }, size: { width: 0, height: 0 } } }, contextMenu.targetId)?.kind === 'group' : false}
        />
      )}
    </div>
  );
}
