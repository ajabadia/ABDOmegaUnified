/**
 * @purpose Gestiona vistas para editar manifestos OMEGA, incluyendo una superficie de trabajo, controles y panel de historia según el modo de vista, mientras maneja selecciones de marquee y guías de ventana.
 * @purpose_en Renders a viewport for editing OMEGA manifests, including a canvas, controls, and history panel based on the view mode, while managing marquee selection and viewport guides.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:20,sig:12b6k8b
 * @lastUpdated 2026-06-20T20:07:30.666Z
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import NodeCanvas from './NodeCanvas';
import VirtualRack from './VirtualRack';
import ViewportControls from './ViewportControls';
import RulerOverlay from './RulerOverlay';
import ViewportToolbar from './ViewportToolbar';
import type { OMEGA_Manifest, LayoutContainer, OMEGA_Contract, OMEGA_Modulation, HybridEntityUpdate, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import type { UpdateManifestFn, GhostItem } from '@/features/manifest-editor/utils/alignmentConstants';

import { HistoryPanel } from '../inspector/HistoryPanel';
import type { HistoryEntry } from '../../types/document';
import ViewWrapper from './ViewWrapper';
import RackMiniMap from './RackMiniMap';
import { useRackLayout } from '@/features/manifest-editor/hooks/rack/useRackLayout';
import { useViewportMarquee, type MarqueeState } from '@/features/manifest-editor/hooks/viewport/useViewportMarquee';
import { useViewportGuides } from '@/features/manifest-editor/hooks/viewport/useViewportGuides';
import { useViewportContainerSize } from '@/features/manifest-editor/hooks/viewport/useViewportContainerSize';
import { computeMarqueeSelection, mergeMarqueeSelection } from '../../utils/viewportUtils';

// ── Categorized sub-interfaces ──────────────────────────────────

interface ViewportProps {
  viewMode: 'orbital' | 'rack' | 'source' | 'history';
  zoom: number;
  pan: { x: number; y: number };
  handleZoom: (delta: number) => void;
  handlePan: (dx: number, dy: number) => void;
  handleResetViewport: () => void;
  handleFitViewport: (mode: string) => void;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null | undefined;
  uiTheme?: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast' | undefined;
}

interface DataProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  auditResult: AuditResult;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  pushParameterUpdate?: ((id: string, value: number) => void) | undefined;
}

interface SelectionProps {
  selectedItemId: string | null;
  multiSelectedIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  hiddenNodeIds?: string[] | undefined;
  lockedNodeIds?: string[] | undefined;
}

interface ManipulationProps {
  updateItem: (id: string, updates: HybridEntityUpdate) => void;
  /** Batch update multiple nodes atomically (Bug 1 fix) */
  updateItems?: ((updatesMap: Record<string, Partial<OmegaNode>>) => void) | undefined;
  updateContainer?: ((id: string, updates: Partial<LayoutContainer>) => void) | undefined;
  onUpdateManifest?: UpdateManifestFn | undefined;
  onDuplicateItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onGroupSelected?: (ids: string[]) => void;
  onUngroupNode?: (groupId: string) => void;
}

interface HistoryProps {
  past?: HistoryEntry[] | undefined;
  onUndoTo?: ((index: number) => void) | undefined;
  onCompareWithHistory?: ((index: number) => void) | undefined;
}

interface StartupProps {
  onOpenGallery?: (() => void) | undefined;
  onLinkWorkspace?: (() => void) | undefined;
  onCreateFromScratch?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;
}

interface GhostProps {
  ghostPosition?: { x: number; y: number } | null | undefined;
  ghostSize?: { width: number; height: number } | undefined;
  isGhostCollision?: boolean | undefined;
  isGhostVisible?: boolean | undefined;
  onGhostMouseMove?: ((clientX: number, clientY: number) => void) | undefined;
  onGhostClick?: ((x: number, y: number) => void) | undefined;
  onGhostCancel?: (() => void) | undefined;
  showMiniMap?: boolean | undefined;
  onToggleMiniMap?: (() => void) | undefined;
}

interface ModulationProps {
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
  alignGhostItems?: GhostItem[] | undefined;
  alignGhostType?: string | undefined;
  onGhostPreviewChange?: ((items: GhostItem[] | null, type?: string) => void) | undefined;

  // Clipboard actions
  onCopyItems?: ((ids: string[]) => void) | undefined;
  onCutItems?: ((ids: string[]) => void) | undefined;
  onPaste?: ((targetPos?: { x: number; y: number }) => void) | undefined;
  canPaste?: boolean | undefined;
  // Empty space context menu
  onToggleGrid?: (() => void) | undefined;
  onToggleGuides?: (() => void) | undefined;
  onAddEntity?: ((type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void) | undefined;
  onReset?: (() => void) | undefined;
  // Extended context menu / shortcuts
  onRenameItem?: ((id: string) => void) | undefined;
  onBringToFront?: ((id: string) => void) | undefined;
  onSendToBack?: ((id: string) => void) | undefined;
  onSaveAsBlueprint?: ((id: string) => void) | undefined;
  onSelectAll?: (() => void) | undefined;
}

type WorkbenchViewportProps = ViewportProps & DataProps & SelectionProps & ManipulationProps & HistoryProps & StartupProps & GhostProps & ModulationProps & TransformProps;


 
export function WorkbenchViewport({
  viewMode,
  manifest,
  contract,
  selectedItemId,
  onSelectItem,
  updateItem,
  onUpdateManifest,
  auditResult,
  zoom,
  pan,
  handleZoom,
  handlePan,
  handleResetViewport,
  handleFitViewport,
  isLiveMode,
  setIsLiveMode,
  resolveAsset,
  pushParameterUpdate,
  past,
  onUndoTo,
  onCompareWithHistory,
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
  updateItems,
  activeTool,
  uiTheme,
  onOpenGallery,
  onLinkWorkspace,
  onCreateFromScratch,
  isDirectoryLinked,
  ghostPosition,
  ghostSize,
  isGhostCollision,
  isGhostVisible,
  onGhostMouseMove,
  onGhostClick,
  onGhostCancel,
  showMiniMap = true,
  onToggleMiniMap,
  onAddModulation,
  onRemoveModulation,
  startTransaction,
  commitTransaction,
  onNumericResize,
  onNumericRotate,
  onCopyTransform,
  onPasteTransform,
  onAlign,
  onDistribute,
  alignGhostItems: alignGhostItemsProp,
  alignGhostType: alignGhostTypeProp,
  onGhostPreviewChange,
  onCopyItems,
  onCutItems,
  onPaste,
  canPaste: canPasteProp,
  onToggleGrid,
  onToggleGuides,
  onAddEntity,
  onReset,
  onRenameItem,
  onBringToFront,
  onSendToBack,
  onSaveAsBlueprint,
  onSelectAll,
  // Expose internal refs for hook wiring
}: WorkbenchViewportProps) {
  const { width: rackWidth, height: rackHeight } = useRackLayout(manifest);
  
  const [isBindingMode, setIsBindingMode] = useState(false);
  const toggleBindingMode = useCallback(() => setIsBindingMode(prev => !prev), []);

  // ── Guides state sync + handlers (now include manifest sync via hook) ──
  const {
    showGuides,
    guides,
    handleToggleRulers,
    handleGuidesChange,
  } = useViewportGuides(manifest, onUpdateManifest);

  const sectionRef = useRef<HTMLElement>(null);

  // ── Marquee selection + drag-to-pan ───────────────────────────────
  const {
    isDraggingPan,
    marquee,
    handleSectionMouseDown,
    didMarqueeRef,
    setOnMarqueeComplete,
    setPanHandler,
  } = useViewportMarquee();

  // Wire up pan handler
  useEffect(() => {
    setPanHandler(() => handlePan);
  }, [handlePan, setPanHandler]);

  // Wire up marquee completion (with Shift/Ctrl merge support)
  useEffect(() => {
    setOnMarqueeComplete(() => (m: MarqueeState, isShiftKey: boolean) => {
      const section = sectionRef.current;
      if (!section) return;
      const selected = computeMarqueeSelection(section, m);
      mergeMarqueeSelection(selected, multiSelectedIds, isShiftKey, onSelectMultiple);
    });
  }, [sectionRef, onSelectMultiple, multiSelectedIds, setOnMarqueeComplete]);

  // ── Container size tracking for Mini-Map ──────────────────────────
  const { containerSize } = useViewportContainerSize(sectionRef);

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (viewMode !== 'rack' && viewMode !== 'orbital') return;
    e.preventDefault();
    const zoomStep = e.deltaY * -0.001;
    handleZoom(zoomStep);
  }, [viewMode, handleZoom]);

  // Click-to-deselect on empty area
  const handleSectionClick = useCallback(() => {
    if (didMarqueeRef.current) {
      didMarqueeRef.current = false;
      return;
    }
    onSelectItem(null);
  }, [didMarqueeRef, onSelectItem]);

  const TOOLBAR_H = 28;
  
  return (
    <section 
      ref={sectionRef}
      className={`flex-1 relative wb-bg overflow-hidden transition-colors duration-500 ${isDraggingPan ? 'cursor-grabbing' : ''}`}
      onWheel={handleWheel}
      onMouseDown={(e) => handleSectionMouseDown(e, viewMode, activeTool, isLiveMode)}
      onClickCapture={(e) => { if (didMarqueeRef.current) { didMarqueeRef.current = false; e.stopPropagation(); } }}
      onClick={handleSectionClick}
    >
      {viewMode !== 'source' && viewMode !== 'history' && (
        <ViewportControls 
          zoom={zoom} 
          onZoom={handleZoom} 
          onPan={handlePan} 
          onReset={handleResetViewport} 
          onFit={() => handleFitViewport(viewMode)}
          viewMode={viewMode}
          onToggleRulers={viewMode === 'rack' ? handleToggleRulers : undefined}
          rulersVisible={showGuides}
          isLiveMode={isLiveMode}
        />
      )}

      {/* RULER OVERLAY — rack view only (hidden in live mode) */}
      {viewMode === 'rack' && (
        <RulerOverlay
          showGuides={showGuides}
          guides={guides}
          onGuidesChange={handleGuidesChange}
          toolbarHeight={TOOLBAR_H}
          pan={pan}
          zoom={zoom}
          rackWidth={rackWidth}
          rackHeight={rackHeight}
          uiTheme={uiTheme}
          isLiveMode={isLiveMode}
        />
      )}

      {/* MINI-MAP — rack view only */}
      {viewMode === 'rack' && (
        <RackMiniMap
          manifest={manifest}
          zoom={zoom}
          pan={pan}
          onPan={handlePan}
          onResetViewport={handleResetViewport}
          onFitViewport={() => handleFitViewport(viewMode)}
          rackWidth={rackWidth}
          rackHeight={rackHeight}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          selectedItemId={selectedItemId}
          onSelectItem={onSelectItem}
          lockedNodeIds={lockedNodeIds}
          isVisible={showMiniMap ?? true}
          onToggleVisible={() => onToggleMiniMap?.()}
        />
      )}
 
      <AnimatePresence mode="wait">
        {viewMode === 'orbital' && (
          <ViewWrapper id="orbital" zoom={zoom} pan={pan}>
            <NodeCanvas 
              manifest={manifest} 
              contract={contract} 
              selectedItemId={selectedItemId} 
              onSelectItem={onSelectItem} 
              multiSelectedIds={multiSelectedIds}
              onSelectMultiple={onSelectMultiple}
              audit={auditResult} 
            />
          </ViewWrapper>
        )}
 
        {viewMode === 'rack' && (
          <ViewWrapper id="rack" applyTransform={false} zoom={zoom} pan={pan}>
            {!isLiveMode && (
              <ViewportToolbar
                manifest={manifest}
                selectedIds={multiSelectedIds}
                onUpdateItem={updateItem}
                onUpdateManifest={onUpdateManifest ?? undefined}
                onGhostPreviewChange={onGhostPreviewChange}
                showMiniMap={showMiniMap ?? true}
                onToggleMiniMap={() => onToggleMiniMap?.()}
                isBindingMode={isBindingMode}
                onToggleBindingMode={toggleBindingMode}
              />
            )}
            <VirtualRack 
              manifest={manifest} 
              contract={contract}
              isBindingMode={isBindingMode}
              activeTool={activeTool}
              startTransaction={startTransaction}
              commitTransaction={commitTransaction}
              onSelectItem={onSelectItem} 
              selectedItemId={selectedItemId} 
              multiSelectedIds={multiSelectedIds}
              onSelectMultiple={onSelectMultiple}
              onUpdateItem={updateItem} 
              onUpdateItems={updateItems} 
              zoom={zoom} 
              pan={pan}
              isLiveMode={isLiveMode} 
              setIsLiveMode={setIsLiveMode} 
              audit={auditResult} 
              resolveAsset={resolveAsset}
              pushParameterUpdate={pushParameterUpdate}
              hiddenNodeIds={hiddenNodeIds}
              lockedNodeIds={lockedNodeIds}
              {...(onAddModulation != null && { onAddModulation })}
              {...(onRemoveModulation != null && { onRemoveModulation })}
              {...(onDuplicateItem != null && { onDuplicateItem })}
              {...(onRemoveItem != null && { onRemoveItem })}
              {...(onToggleLock != null && { onToggleLock })}
              {...(onToggleVisibility != null && { onToggleVisibility })}
              {...(onGroupSelected != null && { onGroupSelected })}
              {...(onUngroupNode != null && { onUngroupNode })}
              {...(onOpenGallery != null && { onOpenGallery })}
              {...(onLinkWorkspace != null && { onLinkWorkspace })}
              {...(onCreateFromScratch != null && { onCreateFromScratch })}
              {...(isDirectoryLinked != null && { isDirectoryLinked })}
              ghostPosition={ghostPosition}
              ghostSize={ghostSize}
              isGhostCollision={isGhostCollision}
              isGhostVisible={isGhostVisible}
              {...(onGhostMouseMove != null && { onGhostMouseMove })}
              {...(onGhostClick != null && { onGhostClick })}
              {...(onGhostCancel != null && { onGhostCancel })}
              alignGhostItems={alignGhostItemsProp}
              alignGhostType={alignGhostTypeProp}
              onNumericResize={onNumericResize}
              onNumericRotate={onNumericRotate}
              onCopyTransform={onCopyTransform}
              onPasteTransform={onPasteTransform}
              onAlign={onAlign}
              onDistribute={onDistribute}
              onCopyItems={onCopyItems}
              onCutItems={onCutItems}
              onPaste={onPaste}
              canPaste={canPasteProp}
              onToggleGrid={onToggleGrid}
              onToggleGuides={onToggleGuides}
              onAddEntity={onAddEntity}
              onReset={onReset}
              onRenameItem={onRenameItem}
              onBringToFront={onBringToFront}
              onSendToBack={onSendToBack}
              onSaveAsBlueprint={onSaveAsBlueprint}
              onSelectAll={onSelectAll}
            />
          </ViewWrapper>
        )}
 
        {viewMode === 'history' && (
          <ViewWrapper id="history" applyTransform={false} zoom={zoom} pan={pan}>
            <div className="h-full p-8 bg-black/40">
              <div className="max-w-2xl mx-auto h-full">
                <HistoryPanel 
                  past={past || []} 
                  onUndoTo={onUndoTo || (() => {})} 
                  onCompare={onCompareWithHistory || (() => {})}
                  className="h-full shadow-2xl border-white/10"
                />
              </div>
            </div>
          </ViewWrapper>
        )}
      </AnimatePresence>
      {/* MARQUEE SELECTION RECTANGLE */}
      {marquee && (
        <div
          className="absolute pointer-events-none border border-[#00b4ff] bg-[#00b4ff]/10 z-[200]"
          style={{
            left: Math.min(marquee.startX, marquee.currentX) - marquee.sectionLeft,
            top: Math.min(marquee.startY, marquee.currentY) - marquee.sectionTop,
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
          }}
        />
      )}
    </section>
  );
}
