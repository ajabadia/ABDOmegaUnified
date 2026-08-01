'use client';

/**
 * @purpose Renderiza un toolbar para el viewport en el editor de manifesto OMEGA, proporcionando controles para alineación, distribución, configuraciones del grid y visibilidad de mini mapa.
 * @purpose_en Renders a toolbar for the viewport in the OMEGA manifest editor, providing controls for alignment, distribution, grid settings, and mini map visibility.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:ssl5zy
 * @lastUpdated 2026-06-20T09:44:52.880Z
 */

import React, { useState, useCallback } from 'react';
import {
  Grid3X3, Layout, ChevronDown, Map, Link2,
} from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode, GridConfig } from '@/omega-ui-core/types/manifest';
import type { UpdateManifestFn, GhostItem, AlignTarget } from '@/features/manifest-editor/utils/alignmentConstants';
import {
  EURORACK_MM_PER_HP,
  EURORACK_3U_MM,
  DEFAULT_PX_PER_HP,
  EURORACK_PRESETS,
  SHORTCUT_LABELS,
  mmFromHP,
} from '@/features/manifest-editor/utils/alignmentConstants';
import { useAlignment } from '@/features/manifest-editor/hooks/useAlignment';
import { gatherPositions } from '@/features/manifest-editor/utils/alignmentUtils';
import { buildGridManifestUpdate } from '../../utils/gridHelpers';
import {
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  DistributeVIcon,
  AlignTopIcon,
  AlignCenterVIcon,
  AlignBottomIcon,
  DistributeHIcon,
} from './AlignIcons';

interface ViewportToolbarProps {
  manifest: OMEGA_Manifest;
  selectedIds: string[];
  onUpdateItem: (id: string, updates: Partial<OmegaNode>) => void;
  onUpdateManifest?: UpdateManifestFn | undefined;
  /** Called when hovering over an alignment button to show ghost preview */
  onGhostPreviewChange?: ((items: GhostItem[] | null, alignType?: string) => void) | undefined;
  showMiniMap?: boolean;
  onToggleMiniMap?: () => void;
  isBindingMode?: boolean;
  onToggleBindingMode?: () => void;
}

const TOOLBAR_H = 28;
const CORNER_W = 22;

export default function ViewportToolbar({
  manifest,
  selectedIds,
  onUpdateItem,
  onUpdateManifest,
  onGhostPreviewChange,
  showMiniMap,
  onToggleMiniMap,
  isBindingMode,
  onToggleBindingMode,
}: ViewportToolbarProps) {
  const [alignTarget, setAlignTarget] = useState<AlignTarget>('selection');
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [pxPerHP, setPxPerHP] = useState(DEFAULT_PX_PER_HP);

  // ── Alignment logic via extracted hook ─────────────────────────────
  const {
    showGhostPreview,
    hideGhostPreview,
    handleAlign,
    handleDistribute,
    canAlign,
    canDistribute,
  } = useAlignment(manifest, selectedIds, onUpdateManifest, onGhostPreviewChange);

  const grid = manifest.ui?.layout?.grid;
  const gridVisible = grid?.visible ?? false;
  const gridEnabled = grid?.enabled ?? false;
  const spacingX = grid?.spacingX ?? 24;
  const spacingY = grid?.spacingY ?? 24;

  const updateGrid = useCallback((patch: Partial<GridConfig>) => {
    onUpdateManifest?.(buildGridManifestUpdate(manifest, patch));
  }, [manifest, onUpdateManifest]);

  const handleSnapAllToGrid = useCallback(() => {
    if (selectedIds.length === 0) return;
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return;
    const items = gatherPositions(rootTree, selectedIds);
    items.forEach(i => {
      onUpdateItem(i.id, {
        layout: {
          pos: {
            x: Math.round(i.x / spacingX) * spacingX,
            y: Math.round(i.y / spacingY) * spacingY,
          },
        },
      });
    });
  }, [manifest, selectedIds, spacingX, spacingY, onUpdateItem]);

  const applyPreset = useCallback((hp: number) => {
    const sx = Math.round(hp * pxPerHP);
    const sy = Math.round((EURORACK_3U_MM / EURORACK_MM_PER_HP) * pxPerHP / 3);
    updateGrid({ spacingX: sx, spacingY: sy, enabled: true, visible: true });
  }, [pxPerHP, updateGrid]);

  const currentHP = (spacingX / pxPerHP).toFixed(1);
  const currentRowHP = (spacingY / pxPerHP / (EURORACK_3U_MM / EURORACK_MM_PER_HP)).toFixed(1);

  return (
    <div
      data-toolbar
      className="absolute top-0 left-0 right-0 z-[61] flex items-center bg-[#111] border-b border-white/8"
      style={{ height: TOOLBAR_H, paddingLeft: CORNER_W }}
    >
      {/* ALIGNMENT — order matches the user-supplied icon set */}
      <div className="flex items-center gap-px px-1" data-align-toolbar="true">
        <AlignBtn icon={<AlignLeftIcon size={14} />} ariaLabel="Align left edges" title={`Align left edges (${SHORTCUT_LABELS['l']})`} disabled={!canAlign} onClick={() => handleAlign('left')} onMouseEnter={() => showGhostPreview('left')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<AlignCenterHIcon size={14} />} ariaLabel="Center horizontally" title={`Center horizontally (${SHORTCUT_LABELS['h']})`} disabled={!canAlign} onClick={() => handleAlign('center-h')} onMouseEnter={() => showGhostPreview('center-h')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<AlignRightIcon size={14} />} ariaLabel="Align right edges" title={`Align right edges (${SHORTCUT_LABELS['r']})`} disabled={!canAlign} onClick={() => handleAlign('right')} onMouseEnter={() => showGhostPreview('right')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<DistributeVIcon size={14} />} ariaLabel="Distribute vertically" title={`Distribute vertically (${SHORTCUT_LABELS['v']})`} disabled={!canDistribute} onClick={() => handleDistribute('dist-v')} onMouseEnter={() => showGhostPreview('dist-v')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<AlignTopIcon size={14} />} ariaLabel="Align top edges" title={`Align top edges (${SHORTCUT_LABELS['t']})`} disabled={!canAlign} onClick={() => handleAlign('top')} onMouseEnter={() => showGhostPreview('top')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<AlignCenterVIcon size={14} />} ariaLabel="Center vertically" title={`Center vertically (${SHORTCUT_LABELS['m']})`} disabled={!canAlign} onClick={() => handleAlign('center-v')} onMouseEnter={() => showGhostPreview('center-v')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<AlignBottomIcon size={14} />} ariaLabel="Align bottom edges" title={`Align bottom edges (${SHORTCUT_LABELS['b']})`} disabled={!canAlign} onClick={() => handleAlign('bottom')} onMouseEnter={() => showGhostPreview('bottom')} onMouseLeave={hideGhostPreview} />
        <AlignBtn icon={<DistributeHIcon size={14} />} ariaLabel="Distribute horizontally" title={`Distribute horizontally (${SHORTCUT_LABELS['d']})`} disabled={!canDistribute} onClick={() => handleDistribute('dist-h')} onMouseEnter={() => showGhostPreview('dist-h')} onMouseLeave={hideGhostPreview} />
      </div>
      <div
        className="flex items-center px-1 gap-0.5 text-[7px] font-bold uppercase tracking-wider"
        title={
          selectedIds.length === 0
            ? 'No selection. Click a node, then Ctrl+click (or Shift+click) others to multi-select.'
            : selectedIds.length === 1
              ? '1 selected. Add more with Ctrl+click or Shift+click.'
              : `${selectedIds.length} selected. Click any align button.\nCtrl+Shift+L/H/R/B now align instead of panel toggles/reset.`
        }
      >
        <span className="text-[#555]">Sel:</span>
        <span className={selectedIds.length >= 2 ? 'text-primary' : 'text-[#888]'}>
          {selectedIds.length}
        </span>
      </div>
      <ToolbarDivider />
      {/* ALIGN TARGET */}
      <div className="flex items-center px-1 gap-0.5">
        <button
          onClick={() => setAlignTarget(alignTarget === 'selection' ? 'canvas' : 'selection')}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-[#999] hover:text-white hover:bg-white/5 transition-colors"
          title={`Align relative to: ${alignTarget}`}
          aria-label={`Align relative to: ${alignTarget}`}
        >
          <span className="text-[7px] text-[#666]">Align to:</span>
          <span className="text-primary">{alignTarget === 'selection' ? 'Selection' : 'Canvas'}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>
      </div>
      <ToolbarDivider />
      {/* SNAP TO GRID — Magnet icon toggle */}
      <div className="flex items-center gap-px px-1 relative">
        <button
          onClick={() => updateGrid({ enabled: !gridEnabled })}
          className={`flex items-center justify-center w-6 h-5 rounded transition-colors ${
            gridEnabled
              ? 'text-emerald-400 hover:bg-emerald-500/20'
              : 'text-[#666] hover:text-[#999] hover:bg-white/5'
          }`}
          title={`Snap to grid: ${gridEnabled ? 'ON' : 'OFF'}`}
          aria-label={`Snap to grid, currently ${gridEnabled ? 'enabled' : 'disabled'}`}
          aria-pressed={gridEnabled}
        >
          <Layout className="w-3 h-3" />
        </button>
        <button
          onClick={() => setShowGridSettings(!showGridSettings)}
          className={`flex items-center justify-center w-6 h-5 rounded transition-colors ${
            showGridSettings
              ? 'text-primary bg-white/10'
              : 'text-[#999] hover:text-white hover:bg-white/8'
          }`}
          title="Grid settings (Eurorack)"
          aria-label="Grid settings"
          aria-expanded={showGridSettings}
        >
          <Grid3X3 className="w-3 h-3" />
        </button>

        {/* GRID SETTINGS DROPDOWN — Eurorack-proportional */}
        {showGridSettings && (
          <div
            className="absolute top-full left-0 mt-1 bg-[#0a0a0b] border border-white/10 rounded p-3 shadow-2xl z-[9999]"
            style={{ width: 260 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[7px] text-primary font-black uppercase tracking-widest mb-2">Grid — Eurorack</div>

            {/* Grid visibility toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#999] uppercase">Show grid</span>
              <button
                onClick={() => updateGrid({ visible: !gridVisible })}
                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-colors ${
                  gridVisible
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-white/5 text-[#666] hover:text-[#999] border border-transparent'
                }`}
              >
                {gridVisible ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Snap action button */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#999] uppercase">Snap selection</span>
              <button
                onClick={handleSnapAllToGrid}
                disabled={!gridEnabled || selectedIds.length === 0}
                className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-white/5 text-[#999] hover:bg-white/10 hover:text-white border border-transparent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Snap
              </button>
            </div>

            <div className="border-t border-white/5 my-2" />

            {/* Scale factor */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#999] uppercase">Scale (px / HP)</span>
              <input
                type="number"
                value={pxPerHP}
                min={4}
                max={80}
                onChange={e => setPxPerHP(Math.max(4, parseInt(e.target.value) || DEFAULT_PX_PER_HP))}
                className="w-14 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white text-right font-mono"
                aria-label="Grid scale in pixels per HP"
              />
            </div>

            {/* Spacing X (horizontal) */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#999] uppercase">Spacing X</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={spacingX}
                  min={1}
                  onChange={e => updateGrid({ spacingX: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-14 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white text-right font-mono"
                  aria-label="Grid spacing X in pixels"
                />
                <span className="text-[7px] text-[#666] w-10 text-right">{currentHP} HP</span>
              </div>
            </div>
            <div className="text-[6px] text-[#555] mb-2 ml-auto text-right">≈ {mmFromHP(spacingX / pxPerHP)} mm</div>

            {/* Spacing Y (vertical) */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#999] uppercase">Spacing Y</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={spacingY}
                  min={1}
                  onChange={e => updateGrid({ spacingY: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-14 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white text-right font-mono"
                  aria-label="Grid spacing Y in pixels"
                />
                <span className="text-[7px] text-[#666] w-10 text-right">{currentRowHP} U</span>
              </div>
            </div>
            <div className="text-[6px] text-[#555] mb-2 ml-auto text-right">≈ {mmFromHP(spacingY / pxPerHP)} mm</div>

            {/* Eurorack HP presets */}
            <div className="border-t border-white/5 pt-2 mt-1">
              <div className="text-[6px] text-[#666] uppercase tracking-wider mb-1.5 font-bold">Eurorack presets</div>
              <div className="flex flex-wrap gap-1">
                {EURORACK_PRESETS.map(p => (
                  <button
                    key={p.hp}
                    onClick={() => applyPreset(p.hp)}
                    className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold transition-colors ${
                      Math.abs(spacingX - Math.round(p.hp * pxPerHP)) < 2
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'bg-white/5 text-[#999] hover:bg-white/10 hover:text-white border border-transparent'
                    }`}
                    title={`${p.label} = ${Math.round(p.hp * pxPerHP)}px = ${mmFromHP(p.hp)}mm`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div className="text-[5px] text-[#444] mt-2 leading-relaxed">
              1 HP = {EURORACK_MM_PER_HP}mm = {pxPerHP}px &nbsp;|&nbsp; 3U = {EURORACK_3U_MM}mm
            </div>
          </div>
        )}
      </div>
      {onToggleMiniMap && (
        <>
          <ToolbarDivider />
          <div className="flex items-center px-1">
            <button
              onClick={onToggleMiniMap}
              aria-label={`${showMiniMap ? 'Hide' : 'Show'} mini map`}
              className={`flex items-center justify-center w-6 h-5 rounded transition-colors ${
                showMiniMap
                  ? 'text-primary bg-white/10 hover:bg-white/15'
                  : 'text-[#666] hover:text-[#999] hover:bg-white/5'
              }`}
              title={`${showMiniMap ? 'Hide' : 'Show'} Mini Map`}
            >
              <Map className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
      {onToggleBindingMode && (
        <>
          <ToolbarDivider />
          <div className="flex items-center px-1">
            <button
              onClick={onToggleBindingMode}
              aria-label={isBindingMode ? 'Exit bind mode' : 'Enter bind mode'}
              className={`flex items-center justify-center w-6 h-5 rounded transition-colors ${
                isBindingMode
                  ? 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 ring-1 ring-emerald-500/40'
                  : 'text-[#666] hover:text-[#999] hover:bg-white/5'
              }`}
              title={`${isBindingMode ? 'Exit bind mode' : 'Enter bind mode — click controls to set WASM binding'}`}
            >
              <Link2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AlignBtn({ icon, title, ariaLabel, disabled, onClick, onMouseEnter, onMouseLeave }: {
  icon: React.ReactNode;
  title: string;
  ariaLabel?: string;
  disabled?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      className="flex items-center justify-center w-6 h-5 rounded text-[#999] hover:text-white hover:bg-white/8 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
      title={title}
      aria-label={ariaLabel || title}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-white/8 mx-1" />;
}
