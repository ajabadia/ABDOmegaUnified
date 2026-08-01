'use client';

/**
 * @purpose Renderiza puntos de estado de unión sobre controles en el viewport del bastidor, con una popover de unión al hacer clic.
 * @purpose_en Renders binding status dots over controls in the rack viewport, with a click-to-bind popover.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:163csct
 * @lastUpdated 2026-06-20T09:43:40.713Z
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';

interface BindingOverlayProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isBindingMode: boolean;
  onBindNode: (nodeId: string, bind: string) => void;
}

interface BindDot {
  nodeId: string;
  label: string;
  currentBind: string;
  status: 'bound' | 'unbound' | 'orphan' | 'no-contract';
  x: number;
  y: number;
}

// ── Walk UCA tree to collect all bindable nodes ──────────────────────
function collectBindableNodes(tree: OmegaNode | undefined): Array<{ id: string; label: string; bind: string | undefined }> {
  const nodes: Array<{ id: string; label: string; bind: string | undefined }> = [];
  const walk = (node: OmegaNode) => {
    if (node.kind === 'cell' || node.kind === 'port' || (node.children && node.children.length === 0)) {
      nodes.push({
        id: node.id,
        label: (node.meta?.label as string) || node.id,
        bind: node.bind
      });
    }
    if (node.children) node.children.forEach(walk);
  };
  if (tree) walk(tree);
  return nodes;
}

// ── Get available bind targets from contract ─────────────────────────
function getAvailableBinds(contract: (OmegaContract | OMEGA_Contract) | null): string[] {
  if (!contract) return [];
  const c = contract as OmegaContract;
  return [
    ...(c.parameters?.map((p: { id: string }) => p.id) || []),
    ...(c.ports?.map((p: { id: string }) => p.id) || [])
  ];
}

/**
 * BindingOverlay
 * 
 * Shows color-coded dots on each bindable control in the rack viewport.
 * - Green: bound to valid contract parameter/port
 * - Amber: unbound (no bind set)
 * - Red: orphan bind (not found in contract)
 * - Gray: no contract loaded
 * 
 * In binding mode (isBindingMode=true), dots are clickable and open
 * a popover to change the binding directly.
 */
export default function BindingOverlay({
  manifest,
  contract,
  containerRef,
  isBindingMode,
  onBindNode,
}: BindingOverlayProps) {
  const [dots, setDots] = useState<BindDot[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const contractBindIds = useMemo(() => getAvailableBinds(contract), [contract]);

  // ── Refresh positions periodically ─────────────────────────────────
  useEffect(() => {
    const refresh = () => setRefreshKey(k => k + 1);
    const interval = setInterval(refresh, 500);
    const ro = new ResizeObserver(refresh);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      clearInterval(interval);
      ro.disconnect();
    };
  }, [containerRef]);

  // ── Compute dot positions from DOM ─────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tree = manifest.ui?.tree || manifest.nodes?.[0];
    const bindableNodes = collectBindableNodes(tree);
    const newDots: BindDot[] = [];
    const containerRect = container.getBoundingClientRect();

    bindableNodes.forEach(({ id, label, bind }) => {
      const el = container.querySelector(`[id="uca-${id}"]`);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = rect.left - containerRect.left + rect.width;
      const y = rect.top - containerRect.top;

      let status: BindDot['status'];
      if (!contractBindIds.length) {
        status = 'no-contract';
      } else if (!bind || bind === '') {
        status = 'unbound';
      } else if (contractBindIds.includes(bind)) {
        status = 'bound';
      } else {
        status = 'orphan';
      }

      newDots.push({ nodeId: id, label, currentBind: bind || '', status, x, y });
    });

    setDots(newDots);
  }, [manifest, contractBindIds, containerRef, refreshKey]);

  // ── Close popover on outside click + Escape ──────────────────────
  useEffect(() => {
    if (!activePopover) return;

    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Ignore clicks on the dot itself (so it can toggle)
        const dotEl = (e.target as HTMLElement).closest('[data-bind-dot]');
        if (!dotEl) setActivePopover(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePopover(null);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activePopover]);

  const handleBindSelect = useCallback((nodeId: string, bind: string) => {
    onBindNode(nodeId, bind);
    setActivePopover(null);
  }, [onBindNode]);

  const activeDot = dots.find(d => d.nodeId === activePopover);

  // ── Color maps ──────────────────────────────────────────────────────
  const dotColorMap: Record<BindDot['status'], string> = {
    bound: 'bg-emerald-400',
    unbound: 'bg-amber-400',
    orphan: 'bg-red-500',
    'no-contract': 'bg-gray-500',
  };

  const ringColorMap: Record<BindDot['status'], string> = {
    bound: 'ring-emerald-400/40',
    unbound: 'ring-amber-400/40',
    orphan: 'ring-red-500/40',
    'no-contract': 'ring-gray-500/40',
  };

  const statusLabel: Record<BindDot['status'], string> = {
    bound: 'Bound',
    unbound: 'Unbound',
    orphan: 'Orphan',
    'no-contract': 'No contract',
  };

  // Don't render anything when there are no dots
  if (dots.length === 0) return null;

  return (
    <>
      {/* Binding status dots */}
      {dots.map(dot => {
        const isActive = activePopover === dot.nodeId;
        const dotColor = dotColorMap[dot.status];
        const ringColor = ringColorMap[dot.status];

        return (
          <div
            key={dot.nodeId}
            data-bind-dot={dot.nodeId}
            className={`absolute z-[90] ${isBindingMode ? 'cursor-pointer' : 'pointer-events-none'}`}
            style={{ left: dot.x - 6, top: dot.y - 6 }}
            onClick={() => {
              if (isBindingMode) {
                setActivePopover(prev => prev === dot.nodeId ? null : dot.nodeId);
              }
            }}
            title={`${dot.label}: ${dot.currentBind || 'Unbound'} (${statusLabel[dot.status]})`}
          >
            <div className={`relative w-[12px] h-[12px] ${isBindingMode ? 'hover:scale-150' : ''} transition-transform duration-150`}>
              {/* Dot */}
              <div className={`absolute inset-0 rounded-full ${dotColor} ring-2 ${ringColor} ${isActive ? 'scale-125' : ''} transition-all`} />
              {/* Ping animation for bound in binding mode */}
              {dot.status === 'bound' && isBindingMode && (
                <div className={`absolute inset-0 rounded-full ${dotColor} animate-ping opacity-25 ${isActive ? 'scale-125' : ''}`} />
              )}
              {/* Active glow */}
              {isActive && (
                <div className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse" />
              )}
            </div>
          </div>
        );
      })}

      {/* Binding popover */}
      <AnimatePresence>
        {activePopover && activeDot && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] bg-[#0a0a0b] border border-white/10 rounded-sm shadow-2xl p-2.5"
            style={{
              left: Math.min(activeDot.x + 14, window.innerWidth - 230),
              top: Math.max(20, Math.min(activeDot.y - 100, window.innerHeight - 220)),
              width: 210,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColorMap[activeDot.status]} ring-1 ${ringColorMap[activeDot.status]}`} />
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/80 truncate">
                  {activeDot.label}
                </span>
              </div>
              <button
                onClick={() => setActivePopover(null)}
                aria-label="Close binding popover"
                className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white shrink-0 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Current binding */}
            <div className="text-[7px] text-white/30 uppercase mb-1.5 font-bold tracking-wider">
              Bind: <span className={activeDot.currentBind ? 'text-primary' : 'text-amber-400/60'}>{activeDot.currentBind || 'Unbound'}</span>
            </div>

            {/* Bind list */}
            <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto custom-scrollbar">
              {/* Empty option */}
              <button
                onClick={() => handleBindSelect(activeDot.nodeId, '')}
                aria-label="Clear binding"
                className={`text-left px-2 py-1.5 rounded text-[9px] font-mono transition-colors ${
                  !activeDot.currentBind
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                — Clear binding —
              </button>

              {/* No contract message */}
              {contractBindIds.length === 0 && (
                <div className="text-[7px] text-amber-500/60 px-2 py-2 animate-pulse font-bold uppercase tracking-wider">
                  ⚠ Load .wasm or .json contract
                </div>
              )}

              {/* Available binds from contract */}
              {contractBindIds.map(bindId => (
                <button
                  key={bindId}
                  onClick={() => handleBindSelect(activeDot.nodeId, bindId)}
                  aria-label={`Bind to ${bindId}`}
                  className={`text-left px-2 py-1.5 rounded text-[9px] font-mono transition-colors flex items-center gap-2 ${
                    activeDot.currentBind === bindId
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeDot.currentBind === bindId ? 'bg-primary' : 'bg-white/20'}`} />
                  <span className="truncate">{bindId}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
