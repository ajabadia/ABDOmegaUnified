'use client';

/**
 * @purpose Renderiza una barra de herramientas para el editor de manifesto OMEGA con herramientas para seleccionar, agregar, agrupar y gestionar entidades en modo vivo.
 * @purpose_en Renders a toolbar for the OMEGA manifest editor with tools for selecting, adding, grouping, and managing entities in live mode.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:1ghctef
 * @lastUpdated 2026-06-21T00:00:00.000Z
 */

import { motion } from 'framer-motion';
import ToolbarCustomizePopover from './ToolbarCustomizePopover';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import NumericResizePopover from '@/features/manifest-editor/components/viewport/NumericResizePopover';
import NumericRotatePopover from '@/features/manifest-editor/components/viewport/NumericRotatePopover';
import { getNodeRotation, computeRotationUpdates } from '@/omega-ui-core/renderers/utils/scaleUtils';
import { useToolbarLogic, type ToolType } from '@/features/manifest-editor/hooks/layout/useToolbarLogic';
import ToolbarButtons from './ToolbarButtons';

interface ToolbarProps {
  isLiveMode: boolean;
  onToggleLive: () => void;
  onOpenGallery: () => void;
  onOpenConfig: () => void;
  onOpenCellStudio: () => void;
  onAddEntity: (type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void;
  isZenMode: boolean;
  onToggleZen: () => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  selectedNodeId?: string | null;
  multiSelectedIds: string[];
  onGroupSelected?: ((ids: string[]) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
  findItem?: ((id: string) => unknown) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  onUpdateItems?: (updatesMap: Record<string, Partial<OmegaNode>>) => void;
  startTransaction?: (label: string) => void;
  commitTransaction?: () => void;
  abortTransaction?: () => void;
  showNumericResize?: boolean;
  showNumericRotate?: boolean;
  onOpenNumericResize?: () => void;
  onOpenNumericRotate?: () => void;
  onCloseNumericResize?: () => void;
  onCloseNumericRotate?: () => void;
}

export default function Toolbar({
  isLiveMode,
  onToggleLive,
  onOpenGallery,
  onOpenConfig,
  onOpenCellStudio,
  onAddEntity,
  isZenMode,
  onToggleZen,
  activeTool,
  setActiveTool,
  selectedNodeId,
  multiSelectedIds,
  onGroupSelected,
  onUngroupNode,
  findItem,
  manifest,
  onUpdateItems,
  commitTransaction,
  abortTransaction,
  showNumericResize: showNumericResizeProp,
  showNumericRotate: showNumericRotateProp,
  onOpenNumericResize,
  onOpenNumericRotate,
  onCloseNumericResize,
  onCloseNumericRotate
}: ToolbarProps) {
  // ── All logic delegated to hook ──────────────────────────────────────
  const {
    showAddMenu, setShowAddMenu,
    showCustomize, setShowCustomize,
    handleSelectTool,
    isGroupEnabled, isUngroupEnabled, targetGroupId,
    selectedNodeData,
    handleToolbarKeyDown,
    showNumericResize, showNumericRotate,
    handleOpenNumericResize, handleOpenNumericRotate,
    handleCloseNumericResize, handleCloseNumericRotate,
    config, moveButton, toggleVisibility, resetToDefault,
    renderedButtons, cols, items,
  } = useToolbarLogic({
    setActiveTool,
    selectedNodeId: selectedNodeId ?? null,
    multiSelectedIds,
    onOpenCellStudio,
    findItem,
    manifest,
    showNumericResize: showNumericResizeProp,
    showNumericRotate: showNumericRotateProp,
    onOpenNumericResize,
    onOpenNumericRotate,
    onCloseNumericResize,
    onCloseNumericRotate,
  });

  // ── Button context (all state/handlers for button rendering) ────────
  const buttonCtx = {
    activeTool,
    handleSelectTool,
    setActiveTool,
    showAddMenu,
    setShowAddMenu,
    onAddEntity,
    selectedNodeId: selectedNodeId ?? null,
    isGroupEnabled,
    isUngroupEnabled,
    targetGroupId,
    onGroupSelected,
    onUngroupNode,
    multiSelectedIds,
    onOpenGallery,
    onOpenConfig,
    isLiveMode,
    onToggleLive,
    isZenMode,
    onToggleZen,
    showNumericResize,
    showNumericRotate,
    handleOpenNumericResize,
    handleOpenNumericRotate,
  };

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragTransition={{ power: 0 }}
        className="absolute left-3 top-20 z-50 wb-surface border wb-outline rounded-xs flex flex-col items-center py-2.5 px-2 gap-1.5 shadow-xl cursor-grab active:cursor-grabbing select-none"
        style={{
          touchAction: 'none',
          width: cols === 1 ? 44 : 'auto'
        }}
        role="toolbar"
        aria-label="Floating tools"
        onKeyDown={handleToolbarKeyDown}
      >
        {/* Drag handle dots */}
        <div className="w-5 h-2 flex flex-col gap-0.5 justify-center items-center opacity-30 cursor-move mb-1 shrink-0">
          <div className="w-full h-[1px] bg-foreground" />
          <div className="w-full h-[1px] bg-foreground" />
          <div className="w-full h-[1px] bg-foreground" />
        </div>

        <ToolbarButtons
          ctx={buttonCtx}
          layout={{ renderedButtons, items, cols }}
          onToggleCustomize={() => setShowCustomize(prev => !prev)}
        />
      </motion.div>

      {/* ── Numeric Resize Popover ── */}
      <NumericResizePopover
        isOpen={showNumericResize}
        onClose={handleCloseNumericResize}
        node={selectedNodeData ?? null}
        manifest={manifest!}
        onUpdateNodes={onUpdateItems ?? (() => {})}
        commitTransaction={commitTransaction ?? (() => {})}
        abortTransaction={abortTransaction ?? (() => {})}
      />

      {/* ── Numeric Rotate Popover ── */}
      <NumericRotatePopover
        isOpen={showNumericRotate}
        onClose={handleCloseNumericRotate}
        currentAngle={selectedNodeData ? getNodeRotation(selectedNodeData) : 0}
        onApplyRotation={(angle) => {
          if (!selectedNodeId || !manifest?.ui?.tree) return;
          const updates = computeRotationUpdates(selectedNodeId, angle, manifest);
          onUpdateItems?.(updates);
        }}
        commitTransaction={commitTransaction ?? (() => {})}
        abortTransaction={abortTransaction ?? (() => {})}
      />

      {showCustomize && (
        <ToolbarCustomizePopover
          config={config}
          moveButton={moveButton}
          toggleVisibility={toggleVisibility}
          resetToDefault={resetToDefault}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </>
  );
}
