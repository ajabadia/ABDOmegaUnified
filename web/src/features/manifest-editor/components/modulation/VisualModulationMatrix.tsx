'use client';

/**
 * @purpose Gestiona un arrastre y soltar basado en SVG para visualizar y gestionar conexiones entre fuentes y objetivos en un editor de manifesto OMEGA.
 * @purpose_en Manages a drag-and-drop SVG-based modulation matrix for visualizing and managing connections between sources and targets in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:xjegge
 * @lastUpdated 2026-06-20T09:43:26.987Z
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, GripVertical } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

interface VisualModulationMatrixProps {
  manifest: OMEGA_Manifest;
  onAdd: (mod: OMEGA_Modulation) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onClose: () => void;
}

const MOD_TYPE_COLORS: Record<string, string> = {
  unipolar: '#00f0ff',
  bipolar: '#ff8c00',
  additive: '#22c55e',
  multiplicative: '#a855f7',
};

const MOD_TYPE_LABELS: Record<string, string> = {
  unipolar: 'UNI',
  bipolar: 'BI',
  additive: 'ADD',
  multiplicative: 'MULT',
};

// ── Matrix Header sub-component ───────────────────────────────────────

interface MatrixHeaderProps {
  modulationCount: number;
  onClose: () => void;
}

function MatrixHeader({ modulationCount, onClose }: MatrixHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02] shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-primary/20 border border-primary/40 rounded flex items-center justify-center">
          <Zap className="w-3 h-3 text-primary" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            Visual Modulation Matrix
          </h2>
          <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">
            Drag from Source → Target to create connections
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[7px] font-mono text-white/20">
          {modulationCount} active
        </span>
        <button
          onClick={onClose}
          aria-label="Close modulation matrix"
          className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Matrix Footer sub-component ───────────────────────────────────────

function MatrixFooter() {
  return (
    <div className="p-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {Object.entries(MOD_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: color, opacity: 0.6 }} />
            <span className="text-[6px] font-black uppercase tracking-widest text-white/30">{type}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[6px] font-mono text-white/20">
        <span>Click cell to toggle</span>
        <span>Scroll wheel for amount</span>
        <span>Drag source → target to create</span>
      </div>
    </div>
  );
}

// ── Drag Ghost sub-component ──────────────────────────────────────────

interface DragGhostProps {
  sourceLabel: string;
  mouseX: number;
  mouseY: number;
}

function DragGhost({ sourceLabel, mouseX, mouseY }: DragGhostProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed pointer-events-none z-[9999] flex items-center gap-2 px-2 py-1 rounded border shadow-2xl text-[8px] font-black uppercase tracking-widest"
      style={{
        left: mouseX,
        top: mouseY,
        backgroundColor: 'rgba(0,240,255,0.15)',
        borderColor: 'rgba(0,240,255,0.5)',
        color: '#00f0ff',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Zap className="w-2.5 h-2.5" />
      <span>{sourceLabel}</span>
      <ArrowRightIcon />
      <span className="opacity-50">Drop on target</span>
    </motion.div>
  );
}

// ── SVG Connection Overlay sub-component ──────────────────────────────

interface ModulationLink {
  id: string;
  sourceId: string;
  targetId: string;
  amount: number;
  type: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

interface SvgConnectionOverlayProps {
  links: ModulationLink[];
  hoveredMod: string | null;
  dragState: {
    sourceId: string;
    sourceLabel: string;
    mouseX: number;
    mouseY: number;
    containerOffset: { left: number; top: number };
  } | null;
  sidebarWidth: number;
  headerHeight: number;
}

function SvgConnectionOverlay({ links, hoveredMod, dragState, sidebarWidth, headerHeight }: SvgConnectionOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ top: headerHeight, left: sidebarWidth }}
    >
      <defs>
        <filter id="mod-line-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {links.map(link => {
        const dx = link.tx - link.sx;
        const cp1x = link.sx + dx * 0.4;
        const cp1y = link.sy;
        const cp2x = link.tx - dx * 0.4;
        const cp2y = link.ty;
        const pathD = `M ${link.sx} ${link.sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${link.tx} ${link.ty}`;
        const color = MOD_TYPE_COLORS[link.type] || '#00f0ff';

        return (
          <g key={link.id}>
            <path d={pathD} fill="none" stroke={color} strokeWidth={1 + (link.amount || 0) * 2} opacity={0.2 + (link.amount || 0) * 0.4} strokeDasharray="6 3" filter="url(#mod-line-glow)" />
            <path d={pathD} fill="none" stroke={color} strokeWidth={0.5 + (link.amount || 0) * 1} opacity={0.5 + (link.amount || 0) * 0.3} strokeDasharray="6 3" />
            {hoveredMod === link.id && (
              <circle r="3" fill={color} opacity="0.9" filter="url(#mod-line-glow)">
                <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
              </circle>
            )}
            <text x={(link.sx + link.tx) / 2} y={(link.sy + link.ty) / 2 - 8} fill={color} opacity="0.6" fontSize="6" fontFamily="monospace" textAnchor="middle">
              {(link.amount || 0).toFixed(2)}
            </text>
          </g>
        );
      })}
      {dragState && (
        <line
          x1={dragState.mouseX - dragState.containerOffset.left - sidebarWidth}
          y1={dragState.mouseY - dragState.containerOffset.top - headerHeight}
          x2={dragState.mouseX - dragState.containerOffset.left - sidebarWidth + 50}
          y2={dragState.mouseY - dragState.containerOffset.top - headerHeight}
          stroke="#00f0ff" strokeWidth="2" strokeDasharray="4 4" opacity="0.6"
        />
      )}
    </svg>
  );
}

/**
 * VisualModulationMatrix
 * A drag-and-drop SVG-based modulation matrix replacing the table-based ModulationGrid.
 * Sources are listed vertically, targets horizontally.
 * Drag from source → target to create connections. SVG bezier curves show active modulations.
 */
export default function VisualModulationMatrix({
  manifest,
  onAdd,
  onRemove,
  onUpdate,
  onClose,
}: VisualModulationMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(true);
  const [links, setLinks] = useState<ModulationLink[]>([]);
  const [dragState, setDragState] = useState<{
    sourceId: string;
    sourceLabel: string;
    mouseX: number;
    mouseY: number;
    containerOffset: { left: number; top: number };
  } | null>(null);
  const [selectedMod, setSelectedMod] = useState<string | null>(null);
  const [hoveredMod, setHoveredMod] = useState<string | null>(null);

  const rowHeight = 48;
  const colWidth = 120;
  const sidebarWidth = 160;
  const headerHeight = 50;

  const allEntities = useMemo(() => [
    ...(manifest.ui?.controls || []),
    ...(manifest.ui?.jacks || []),
  ], [manifest]);

  const sources = allEntities;
  const targets = allEntities;

  const modMap = useMemo(() => {
    const map = new Map<string, OMEGA_Modulation>();
    (manifest.modulations || []).forEach(m => {
      map.set(`${m.source}::${m.target}`, m);
    });
    return map;
  }, [manifest.modulations]);

  const toggleMod = useCallback((srcId: string, tgtId: string) => {
    if (srcId === tgtId) return;
    const existing = modMap.get(`${srcId}::${tgtId}`);
    if (existing) {
      onRemove(existing.id);
    } else {
      onAdd({
        id: `mod_${srcId}_${tgtId}`,
        source: srcId,
        target: tgtId,
        amount: 0.75,
        type: 'unipolar',
      });
    }
  }, [modMap, onAdd, onRemove]);

  const handleDragStart = useCallback((e: React.MouseEvent, sourceId: string, sourceLabel: string) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    setDragState({
      sourceId,
      sourceLabel,
      mouseX: e.clientX,
      mouseY: e.clientY - 40,
      containerOffset: { left: rect?.left ?? 0, top: rect?.top ?? 0 },
    });
  }, [containerRef]);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY - 40 } : null);
  }, [dragState]);

  const handleDragEnd = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const dropTarget = (e.target as HTMLElement).closest('[data-target-id]');
    if (dropTarget) {
      const targetId = dropTarget.getAttribute('data-target-id');
      if (targetId && targetId !== dragState.sourceId) {
        toggleMod(dragState.sourceId, targetId);
      }
    }
    setDragState(null);
  }, [dragState, toggleMod]);

  // ── Build SVG link positions + recalculate on resize ──────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const computeLinks = () => {
      const rect = container.getBoundingClientRect();
      const result: ModulationLink[] = [];

      (manifest.modulations || []).forEach(mod => {
        const sourceEl = container.querySelector(`[data-source-id="${mod.source}"]`);
        const targetEl = container.querySelector(`[data-target-id="${mod.target}"]`);
        if (!sourceEl || !targetEl) return;

        const sRect = sourceEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();

        result.push({
          id: mod.id,
          sourceId: mod.source,
          targetId: mod.target,
          amount: mod.amount || 0,
          type: mod.type || 'unipolar',
          sx: sRect.left - rect.left + sRect.width - sidebarWidth,
          sy: sRect.top - rect.top + sRect.height / 2 - headerHeight,
          tx: tRect.left - rect.left - sidebarWidth,
          ty: tRect.top - rect.top + tRect.height / 2 - headerHeight,
        });
      });

      setLinks(result);
    };

    computeLinks();

    const observer = new ResizeObserver(() => {
      computeLinks();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [manifest.modulations]);

  return (
    <motion.div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visual modulation matrix"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-8"
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={() => setDragState(null)}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-6xl max-h-full bg-[#050505] border border-white/10 rounded-sm shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
      >
        <MatrixHeader modulationCount={(manifest.modulations || []).length} onClose={onClose} />

        {/* ── MATRIX BODY ───────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto custom-scrollbar relative bg-white/[0.01]"
        >
          {/* Column headers (targets) */}
          <div
            className="sticky top-0 z-30 flex"
            style={{ marginLeft: sidebarWidth }}
          >
            {targets.map(t => (
              <div
                key={t.id}
                className="shrink-0 flex items-end justify-center pb-2"
                style={{ width: colWidth, minWidth: colWidth, height: headerHeight }}
              >
                <div className="rotate-[-90deg] origin-center whitespace-nowrap text-[7px] font-black uppercase tracking-widest text-white/30">
                  {t.label || t.id}
                </div>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="relative">
            {sources.map((source) => (
              <div key={source.id} className="flex" style={{ height: rowHeight }}>
                {/* Source label */}
                <div
                  data-source-id={source.id}
                  className="shrink-0 flex items-center gap-2 px-3 bg-[#080808] border-b border-r border-white/5 sticky left-0 z-20"
                  style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                >
                  <button
                    onMouseDown={(e) => handleDragStart(e, source.id, source.label || source.id)}
                    className="p-0.5 text-white/20 hover:text-primary cursor-grab active:cursor-grabbing"
                    title="Drag to target to create modulation"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/60 truncate">
                    {source.label || source.id}
                  </span>
                </div>

                {/* Target cells */}
                <div className="flex flex-1">
                  {targets.map(target => {
                    const mod = modMap.get(`${source.id}::${target.id}`);
                    const isSelf = source.id === target.id;
                    const isActive = !!mod;
                    const isSelected = selectedMod === mod?.id;

                    return (
                      <div
                        key={target.id}
                        data-target-id={target.id}
                        onClick={() => {
                          if (!isSelf) toggleMod(source.id, target.id);
                        }}
                        onWheel={(e) => {
                          if (mod && !isSelf) {
                            e.preventDefault();
                            const delta = e.deltaY < 0 ? 0.05 : -0.05;
                            onUpdate(mod.id, {
                              amount: Math.max(0, Math.min(1, (mod.amount || 0) + delta)),
                            });
                          }
                        }}
                        onMouseEnter={() => mod && setHoveredMod(mod.id)}
                        onMouseLeave={() => setHoveredMod(null)}
                        className="shrink-0 border-b border-r border-white/5 flex items-center justify-center cursor-pointer transition-all relative group"
                        style={{
                          width: colWidth,
                          minWidth: colWidth,
                          backgroundColor: isSelf
                            ? 'transparent'
                            : isActive
                              ? `${MOD_TYPE_COLORS[mod?.type || 'unipolar']}08`
                              : 'transparent',
                        }}
                      >
                        {isSelf ? (
                          <div className="w-full h-full bg-white/[0.01]" />
                        ) : isActive && mod ? (
                          <div
            className="flex flex-col items-center gap-0.5"
            onClick={(e) => { e.stopPropagation(); setSelectedMod(isSelected ? null : mod.id); }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all"
              style={{
                backgroundColor: `${MOD_TYPE_COLORS[mod.type || 'unipolar']}22`,
                border: `1px solid ${MOD_TYPE_COLORS[mod.type || 'unipolar']}44`,
                opacity: 0.3 + (mod.amount || 0) * 0.7,
              }}
            >
              <span className="text-[8px] font-black" style={{ color: MOD_TYPE_COLORS[mod.type || 'unipolar'] }}>
                {MOD_TYPE_LABELS[mod.type || 'unipolar']}
              </span>
            </div>
            <span
              className="text-[6px] font-mono tabular-nums"
              style={{ color: `${MOD_TYPE_COLORS[mod.type || 'unipolar']}aa` }}
            >
              {(mod.amount || 0).toFixed(2)}
            </span>
          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/5 group-hover:bg-white/20 transition-all" />
                        )}

                        {/* Quick delete on selected */}
                        {isSelected && mod && (
                          <div className="absolute -top-1 -right-1 z-10">
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemove(mod.id); setSelectedMod(null); }}
                              aria-label={`Remove ${mod.type || 'modulation'}`}
                              className="w-3.5 h-3.5 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                            >
                              <X className="w-2 h-2 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <SvgConnectionOverlay links={links} hoveredMod={hoveredMod} dragState={dragState} sidebarWidth={sidebarWidth} headerHeight={headerHeight} />

          <AnimatePresence>
            {dragState && (
              <DragGhost sourceLabel={dragState.sourceLabel} mouseX={dragState.mouseX} mouseY={dragState.mouseY} />
            )}
          </AnimatePresence>
        </div>

        <MatrixFooter />
      </motion.div>
    </motion.div>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
