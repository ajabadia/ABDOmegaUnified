'use client';

/**
 * @purpose Renderiza un popover flotante para entrada de tamaño numérico, permitiendo a los usuarios ajustar el tamaño de un elemento en píxeles o porcentajes, con bloqueo de aspecto y presets.
 * @purpose_en Renders a floating popover for numeric resize input, allowing users to adjust the size of an element in pixels or percentage, with aspect ratio lock and presets.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:ymhjg9
 * @lastUpdated 2026-06-20T12:52:30.680Z
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { computeScaleUpdates } from '@/omega-ui-core/renderers/utils/scaleUtils';

interface NumericResizePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  node: OmegaNode | null;
  manifest: OMEGA_Manifest;
  onUpdateNodes?: (updatesMap: Record<string, Partial<OmegaNode>>) => void;
  onUpdateNode?: (id: string, updates: Partial<OmegaNode>) => void;
  commitTransaction?: () => void;
  abortTransaction?: () => void;
  anchorRect?: DOMRect | null;
}

const PRESETS = [24, 32, 48, 64, 96, 128, 200];

/** Elements that are visually symmetric — default aspect ratio lock ON */
const SYMMETRIC_TYPES = new Set(['knob', 'button', 'led', 'switch']);

export default function NumericResizePopover({ isOpen, node, ...rest }: NumericResizePopoverProps) {
  if (!isOpen || !node) return null;
  return <NumericResizePopoverInner node={node} {...rest} />;
}

/** Inner component — mounts only when popover is open, so state is always fresh */
type NumericResizePopoverInnerProps = Omit<NumericResizePopoverProps, 'isOpen'> & { node: OmegaNode };

function NumericResizePopoverInner({
  onClose,
  node,
  manifest,
  onUpdateNodes,
  onUpdateNode,
  commitTransaction,
  abortTransaction,
  anchorRect,
}: NumericResizePopoverInnerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const widthInputRef = useRef<HTMLInputElement>(null);

  // State initialised directly from props — component remounts each time popover opens
  const origSize = React.useMemo(() => node.layout?.size || { width: 48, height: 48 }, [node.layout?.size]);
  const ratio = origSize.width > 0 ? origSize.width / origSize.height : 1;
  const isSymmetric = SYMMETRIC_TYPES.has(node.cellRef || node.kind || '');

  const [unit, setUnit] = useState<'px' | '%'>('px');
  const [widthVal, setWidthVal] = useState(String(origSize.width));
  const [heightVal, setHeightVal] = useState(String(origSize.height));
  const [aspectLocked, setAspectLocked] = useState(isSymmetric);
  const [error, setError] = useState<string | null>(null);

  // Auto-focus width input on mount
  useEffect(() => {
    setTimeout(() => widthInputRef.current?.focus(), 50);
  }, []);

  // Click outside / Escape to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        abortTransaction?.();
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        abortTransaction?.();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, abortTransaction]);

  const clampSize = (val: number): number => Math.max(8, Math.min(2000, val));

  const validateAndCommit = useCallback(() => {
    if (!node || !manifest) return;

    const w = parseInt(widthVal, 10);
    const h = parseInt(heightVal, 10);

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      setError('Invalid dimensions');
      return;
    }

    const finalW = Math.round(unit === '%' ? (origSize.width * w / 100) : w);
    const finalH = Math.round(unit === '%' ? (origSize.height * h / 100) : h);

    const clampedW = clampSize(finalW);
    const clampedH = clampSize(finalH);

    // If aspect locked, ensure height follows ratio
    const aspectH = aspectLocked ? Math.round(clampedW / ratio) : clampedH;

    const updates = computeScaleUpdates(
      node.id,
      clampedW,
      aspectH,
      node.layout?.pos?.x ?? 0,
      node.layout?.pos?.y ?? 0,
      manifest
    );

    if (onUpdateNodes) {
      onUpdateNodes(updates);
    } else {
      Object.entries(updates).forEach(([id, upd]) => {
        onUpdateNode?.(id, upd);
      });
    }

    commitTransaction?.();
    onClose();
  }, [node, manifest, widthVal, heightVal, unit, aspectLocked, ratio, onUpdateNodes, onUpdateNode, commitTransaction, onClose, origSize]);

  const handleWidthChange = (val: string) => {
    setWidthVal(val);
    setError(null);
    if (aspectLocked && val !== '' && !isNaN(Number(val))) {
      const num = Number(val);
      if (num > 0) {
        const newH = Math.round(unit === '%' ? (origSize.height * num / 100) : num / ratio);
        setHeightVal(String(newH));
      }
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightVal(val);
    setError(null);
    if (aspectLocked && val !== '' && !isNaN(Number(val))) {
      const num = Number(val);
      if (num > 0) {
        const newW = Math.round(unit === '%' ? (origSize.width * num / 100) : num * ratio);
        setWidthVal(String(newW));
      }
    }
  };

  const nudgeValue = (setter: (v: string) => void, current: string, delta: number) => {
    const val = parseInt(current, 10);
    if (!isNaN(val)) {
      setter(String(Math.max(1, val + delta)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, setter: (v: string) => void, current: string) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); nudgeValue(setter, current, e.shiftKey ? 24 : 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nudgeValue(setter, current, e.shiftKey ? -24 : -1); }
    else if (e.key === 'Enter') { e.preventDefault(); validateAndCommit(); }
  };

  const gridSpacing = manifest.ui?.layout?.grid?.spacingX ?? 24;
  const hpValue = (origSize.width / gridSpacing).toFixed(1);

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: 0.12 }}
        className="fixed z-[300] w-[220px] bg-[#0e0e0f] border border-[#00f0ff]/40 shadow-[0_0_20px_rgba(0,240,255,0.15)] rounded-xs p-3"
        style={{
          left: anchorRect ? `${Math.min(anchorRect.left, window.innerWidth - 240)}px` : '50%',
          top: anchorRect ? `${anchorRect.bottom + 8}px` : '50%',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/10">
          <span className="text-[7px] font-black uppercase tracking-[0.15em] text-[#00f0ff]">
            Numeric Resize
          </span>
          <span className="text-[6px] font-mono text-white/30">
            Ctrl+Alt+R
          </span>
        </div>

        {/* Width */}
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-[7px] font-bold uppercase text-white/50 w-[32px] shrink-0">W</label>
          <input
            ref={widthInputRef}
            type="text"
            inputMode="numeric"
            value={widthVal}
            onChange={(e) => handleWidthChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, setWidthVal, widthVal)}
            className={`flex-1 bg-black/60 border ${error ? 'border-red-500 shadow-[0_0_8px_rgba(255,0,0,0.4)]' : 'border-white/10 focus:border-[#00f0ff]'} rounded-[2px] px-2 py-1 text-[9px] font-mono text-white outline-none transition-all`}
            aria-label="Width in pixels"
          />
          <span className="text-[7px] font-mono text-white/30 w-[20px]">{unit === 'px' ? 'px' : '%'}</span>
        </div>

        {/* Height */}
        <div className="flex items-center gap-2 mb-2">
          <label className="text-[7px] font-bold uppercase text-white/50 w-[32px] shrink-0">H</label>
          <input
            type="text"
            inputMode="numeric"
            value={heightVal}
            onChange={(e) => handleHeightChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, setHeightVal, heightVal)}
            className={`flex-1 bg-black/60 border ${error ? 'border-red-500 shadow-[0_0_8px_rgba(255,0,0,0.4)]' : 'border-white/10 focus:border-[#00f0ff]'} rounded-[2px] px-2 py-1 text-[9px] font-mono text-white outline-none transition-all`}
            aria-label="Height in pixels"
          />
          <span className="text-[7px] font-mono text-white/30 w-[20px]">{unit === 'px' ? 'px' : '%'}</span>
        </div>

        {/* Aspect Ratio Lock + Unit Toggle */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setAspectLocked(!aspectLocked)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[7px] font-bold uppercase tracking-wider transition-all ${
              aspectLocked ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'text-white/40 hover:text-white/70'
            }`}
            title={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            aria-label={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {aspectLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            <span>{aspectLocked ? 'Locked' : 'Free'}</span>
          </button>

          <div className="flex gap-0.5">
            <button
              onClick={() => setUnit('px')}
              className={`px-1.5 py-0.5 rounded-[2px] text-[7px] font-bold uppercase tracking-wider transition-all ${
                unit === 'px' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              PX
            </button>
            <button
              onClick={() => setUnit('%')}
              className={`px-1.5 py-0.5 rounded-[2px] text-[7px] font-bold uppercase tracking-wider transition-all ${
                unit === '%' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              %
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-2">
          <div className="text-[6px] font-bold uppercase text-white/30 tracking-wider mb-1">Presets</div>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setWidthVal(String(p));
                  setHeightVal(aspectLocked ? String(Math.round(p / ratio)) : String(p));
                  setError(null);
                }}
                className="px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[7px] font-mono text-white/60 hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/40 hover:text-[#00f0ff] transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[6px] font-mono text-white/20">
            ≈ {hpValue} HP (grid: {gridSpacing}px)
          </span>
          <span className="text-[6px] font-mono text-white/20">
            {origSize.width}×{origSize.height}px original
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              const defW = origSize.width;
              const defH = origSize.height;
              setWidthVal(String(defW));
              setHeightVal(String(defH));
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-[2px] bg-white/5 border border-white/10 text-[7px] font-bold uppercase text-white/50 hover:bg-white/10 hover:text-white transition-all"
          >
            <RotateCcw className="w-2 h-2" />
            Reset
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { abortTransaction?.(); onClose(); }}
            className="px-2 py-1 rounded-[2px] text-[7px] font-bold uppercase text-white/40 hover:text-white/70 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={validateAndCommit}
            className="px-3 py-1 rounded-[2px] bg-[#00f0ff] text-black text-[7px] font-black uppercase tracking-wider hover:bg-[#00f0ff]/80 transition-all"
          >
            Apply
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-1.5 text-[7px] font-mono text-red-400 animate-in fade-in slide-in-from-top-1 duration-150">
            ⚠ {error}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
