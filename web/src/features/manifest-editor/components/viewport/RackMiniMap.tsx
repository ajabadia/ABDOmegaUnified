'use client';

/**
 * @purpose Renderiza una mini-mapa del rack, mostrando nodos y permitiendo interacción para panning y zooming.
 * @purpose_en Renders a mini-map of the rack, displaying nodes and allowing interaction for panning and zooming.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:j7yddk
 * @lastUpdated 2026-06-20T09:44:35.621Z
 */

import { Filter, RotateCcw, Target, Maximize, Eye, EyeOff } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { useMiniMapState, PANEL_CSS_TOP, PANEL_CSS_RIGHT } from '@/features/manifest-editor/hooks/useMiniMapState';
import MiniMapNodes, { getNodeColor } from './MiniMapNodes';

// Re-export constants used by tests
export { PANEL_CSS_TOP, PANEL_CSS_RIGHT };

// ── Categorized sub-interfaces ──────────────────────────────────────

interface DataProps {
  manifest: OMEGA_Manifest;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  lockedNodeIds?: string[];
}

interface ViewportProps {
  zoom: number;
  pan: { x: number; y: number };
  onPan: (dx: number, dy: number) => void;
  onResetViewport?: () => void;
  onFitViewport: () => void;
}

interface LayoutProps {
  rackWidth: number;
  rackHeight: number;
  containerWidth: number;
  containerHeight: number;
}

interface VisibilityProps {
  isVisible?: boolean;
  onToggleVisible?: () => void;
}

type RackMiniMapProps = DataProps & ViewportProps & LayoutProps & VisibilityProps;

// ── Kind Filter Dropdown sub-component ────────────────────────────────

interface KindFilterDropdownProps {
  availableKinds: string[];
  hiddenKinds: Set<string>;
  toggleKindFilter: (kind: string) => void;
  setHiddenKinds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function KindFilterDropdown({
  availableKinds,
  hiddenKinds,
  toggleKindFilter,
  setHiddenKinds,
}: KindFilterDropdownProps) {
  return (
    <div className="absolute bottom-full right-0 mb-1 w-32 bg-[#0a0a0b] border border-outline rounded-xs shadow-2xl p-1 z-[80]">
      <div className="text-[6px] font-black uppercase tracking-widest text-white/30 px-1.5 pb-1">
        Show Kinds
      </div>
      {availableKinds.map((kind) => {
        const isHidden = hiddenKinds.has(kind);
        const colors = getNodeColor(kind);
        return (
          <label
            key={kind}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-xs hover:bg-white/5 cursor-pointer text-[7px] font-bold uppercase tracking-wider transition-colors"
          >
            <input
              type="checkbox"
              checked={!isHidden}
              onChange={() => toggleKindFilter(kind)}
              aria-label={`Show ${kind} nodes`}
              className="w-2.5 h-2.5 accent-primary"
            />
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                opacity: isHidden ? 0.3 : 1,
              }}
            />
            <span className={isHidden ? 'text-white/20 line-through' : 'text-white/70'}>
              {kind}
            </span>
          </label>
        );
      })}
      {hiddenKinds.size > 0 && (
        <>
          <div className="h-px bg-white/5 my-1 mx-1" />
          <button
            onClick={() => setHiddenKinds(new Set())}
            className="w-full text-left px-1.5 py-1 rounded-xs hover:bg-red-500/10 text-[7px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}

// ── Keyboard handler helper ───────────────────────────────────────────

const PAN_STEP = 20;

function handleMiniMapKeyDown(
  e: React.KeyboardEvent,
  onPan: (dx: number, dy: number) => void,
  showKindFilter: boolean,
  setShowKindFilter: React.Dispatch<React.SetStateAction<boolean>>,
) {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      e.stopPropagation();
      onPan(0, -PAN_STEP);
      break;
    case 'ArrowDown':
      e.preventDefault();
      e.stopPropagation();
      onPan(0, PAN_STEP);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      e.stopPropagation();
      onPan(-PAN_STEP, 0);
      break;
    case 'ArrowRight':
      e.preventDefault();
      e.stopPropagation();
      onPan(PAN_STEP, 0);
      break;
    case 'Enter':
      e.preventDefault();
      e.stopPropagation();
      setShowKindFilter((p) => !p);
      break;
    case 'Escape':
      if (showKindFilter) {
        e.preventDefault();
        e.stopPropagation();
        setShowKindFilter(false);
      }
      break;
  }
}

// ── Component ─────────────────────────────────────────────────────────

export default function RackMiniMap({
  manifest,
  zoom,
  pan,
  onPan,
  onResetViewport,
  onFitViewport,
  rackWidth,
  rackHeight,
  containerWidth,
  containerHeight,
  selectedItemId,
  onSelectItem,
  lockedNodeIds = [],
  isVisible: isVisibleProp,
  onToggleVisible,
}: RackMiniMapProps) {
  const state = useMiniMapState({
    manifest,
    zoom,
    pan,
    onPan,
    rackWidth,
    rackHeight,
    containerWidth,
    containerHeight,
    isVisibleProp,
    onToggleVisible,
  });

  // Destructure refs at component level to avoid ESLint react-hooks/refs warnings
  const { panelRef, miniMapRef } = state;

  if (!state.isVisible) {
    return (
      <button
        data-testid="mini-map-toggle"
        onClick={state.toggleVisibility}
        onMouseDown={state.handleHeaderMouseDown}
        className={`absolute top-[40px] right-[10px] z-[70] p-1.5 wb-surface backdrop-blur-md border wb-outline rounded-xs shadow-2xl hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors ${
          state.isDraggingVisual ? 'shadow-[0_0_15px_rgba(0,242,255,0.3)] ring-1 ring-primary/30' : ''
        } ${
          state.isAtTopLimit ? 'shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]' : ''
        }`}
        style={{ transform: `translate(${state.panelOffset.x}px, ${state.panelOffset.y}px)` }}
        title="Show Mini Map · Drag to reposition"
      >
        <EyeOff className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      data-testid="mini-map"
      className={`absolute top-[40px] right-[10px] z-[70] flex flex-col wb-surface backdrop-blur-md border wb-outline rounded-xs shadow-2xl overflow-hidden transition-colors duration-500 ${
        state.isDraggingVisual ? 'shadow-[0_0_20px_rgba(0,242,255,0.25)] ring-1 ring-primary/20' : ''
      } ${
        state.isSnapped ? 'ring-2 ring-accent/40 shadow-[0_0_12px_rgba(251,191,36,0.25)]' : ''
      } ${
        state.isAtTopLimit ? 'shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]' : ''
      }`}
      style={{
        width: 200,
        transform: `translate(${state.panelOffset.x}px, ${state.panelOffset.y}px)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b wb-outline select-none">
        <span
          className="text-[7px] font-black uppercase tracking-widest text-white/30 cursor-move"
          onMouseDown={state.handleHeaderMouseDown}
          onDoubleClick={() => state.setPanelOffset({ x: 0, y: 0 })}
          title="Double-click to reset position"
        >
          Navigator
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-primary/50 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          {/* Kind filter toggle */}
          <div className="relative">
            <button
              onClick={() => state.setShowKindFilter((p) => !p)}
              className={`p-0.5 transition-all rounded-xs ${
                state.hiddenKinds.size > 0 ? 'text-accent bg-accent/10' : 'text-primary/40 hover:text-primary'
              }`}
              title="Filter node kinds"
            >
              <Filter className="w-3 h-3" />
            </button>
            {state.showKindFilter && (
              <KindFilterDropdown
                availableKinds={state.availableKinds}
                hiddenKinds={state.hiddenKinds}
                toggleKindFilter={state.toggleKindFilter}
                setHiddenKinds={state.setHiddenKinds}
              />
            )}
          </div>
          {(state.panelOffset.x !== 0 || state.panelOffset.y !== 0) && (
            <button
              onClick={() => state.setPanelOffset({ x: 0, y: 0 })}
              className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
              title="Reset panel position"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {onResetViewport && (
            <button
              data-testid="mini-map-center"
              onClick={onResetViewport}
              className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
              title="Center View"
            >
              <Target className="w-3 h-3" />
            </button>
          )}
          <button
            data-testid="mini-map-fit"
            onClick={onFitViewport}
            className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
            title="Fit to Screen"
          >
            <Maximize className="w-3 h-3" />
          </button>
          <button
            data-testid="mini-map-hide"
            onClick={state.toggleVisibility}
            className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
            title="Hide Mini Map"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mini-map canvas */}
      <div
        ref={miniMapRef}
        className={`relative cursor-pointer bg-black/20 ${state.isMiniMapFocused ? 'ring-1 ring-primary/40' : ''}`}
        tabIndex={0}
        role="grid"
        aria-label="Rack Mini Map — use Arrow keys to pan, Enter to toggle filter, Escape to blur"
        style={{
          width: 200,
          height: 200,
          padding: 8,
        }}
        onClick={state.handleMiniMapClick}
        onFocus={() => state.setIsMiniMapFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            state.setIsMiniMapFocused(false);
          }
        }}
        onKeyDown={(e) => handleMiniMapKeyDown(e, onPan, state.showKindFilter, state.setShowKindFilter)}
      >
        {/* Rack background + node rectangles */}
        <MiniMapNodes
          nodes={state.nodes}
          scale={state.scale}
          selectedItemId={selectedItemId}
          lockedNodeIds={lockedNodeIds}
          onSelectItem={onSelectItem}
          miniW={state.miniW}
          miniH={state.miniH}
          offsetX={state.offsetX}
          offsetY={state.offsetY}
        />

        {/* Viewport indicator — draggable */}
        <div
          data-testid="mini-map-viewport"
          className="absolute cursor-grab rounded-[1px] border border-primary/60 bg-primary/5 transition-opacity hover:opacity-80"
          style={{
            top: 8 + state.offsetY + state.viewportRect.y,
            left: 8 + state.offsetX + state.viewportRect.x,
            width: state.viewportRect.w,
            height: state.viewportRect.h,
          }}
          onMouseDown={state.handleMouseDown}
        />
      </div>
    </div>
  );
}
