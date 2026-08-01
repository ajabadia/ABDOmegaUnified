'use client';

/**
 * @purpose Gestiona el renderizado y la interacción de una popover flotante para entrada de rotación numérica con grados, presets y un slider.
 * @purpose_en Manages the rendering and interaction of a floating popover for numeric rotation input with degrees, presets, and a slider.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:12vvrot
 * @lastUpdated 2026-06-20T12:52:35.718Z
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

interface NumericRotatePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentAngle?: number;
  onApplyRotation?: (angle: number) => void;
  commitTransaction?: () => void;
  abortTransaction?: () => void;
  anchorRect?: DOMRect | null;
}

const ANGLE_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function NumericRotatePopover({ isOpen, currentAngle = 0, ...rest }: NumericRotatePopoverProps) {
  if (!isOpen) return null;
  return <NumericRotatePopoverInner currentAngle={currentAngle} {...rest} />;
}

/** Inner component — mounts only when popover is open, so state is always fresh */
type NumericRotatePopoverInnerProps = Omit<NumericRotatePopoverProps, 'isOpen'>;

function NumericRotatePopoverInner({
  onClose,
  currentAngle = 0,
  onApplyRotation,
  commitTransaction,
  abortTransaction,
  anchorRect,
}: NumericRotatePopoverInnerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State initialised directly from props — component remounts each time popover opens
  const [angleStr, setAngleStr] = useState(String(currentAngle));
  const [error, setError] = useState<string | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
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
      if (e.key === 'Escape') { abortTransaction?.(); onClose(); }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, abortTransaction]);

  const validateAngle = (val: string): number | null => {
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    return ((num % 360) + 360) % 360;
  };

  const handleApply = useCallback(() => {
    const angle = validateAngle(angleStr);
    if (angle === null) {
      setError('Invalid angle');
      return;
    }
    commitTransaction?.();
    onApplyRotation?.(angle);
    onClose();
  }, [angleStr, onApplyRotation, commitTransaction, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const val = parseFloat(angleStr);
    if (e.key === 'ArrowUp') { e.preventDefault(); setAngleStr(String((isNaN(val) ? 0 : val) + (e.shiftKey ? 15 : 1))); setError(null); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAngleStr(String((isNaN(val) ? 0 : val) - (e.shiftKey ? 15 : 1))); setError(null); }
    else if (e.key === 'Enter') { e.preventDefault(); handleApply(); }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: 0.12 }}
        className="fixed z-[300] w-[200px] bg-[#0e0e0f] border border-[#00f0ff]/40 shadow-[0_0_20px_rgba(0,240,255,0.15)] rounded-xs p-3"
        style={{
          left: anchorRect ? `${Math.min(anchorRect.left, window.innerWidth - 220)}px` : '50%',
          top: anchorRect ? `${anchorRect.bottom + 8}px` : '50%',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/10">
          <span className="text-[7px] font-black uppercase tracking-[0.15em] text-[#00f0ff]">
            Numeric Rotate
          </span>
          <span className="text-[6px] font-mono text-white/30">
            Ctrl+Alt+T
          </span>
        </div>

        {/* Angle input */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-[7px] font-bold uppercase text-white/50">Angle</label>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={angleStr}
            onChange={(e) => { setAngleStr(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-black/60 border ${error ? 'border-red-500 shadow-[0_0_8px_rgba(255,0,0,0.4)]' : 'border-white/10 focus:border-[#00f0ff]'} rounded-[2px] px-2 py-1 text-[9px] font-mono text-white outline-none transition-all`}
            aria-label="Rotation angle in degrees"
          />
          <span className="text-[7px] font-mono text-white/40">°</span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min="0"
          max="360"
          value={validateAngle(angleStr) ?? 0}
          onChange={(e) => { setAngleStr(e.target.value); setError(null); }}
          className="w-full h-1 appearance-none bg-white/10 rounded-full outline-none mb-3 accent-[#00f0ff]"
          aria-label="Rotation angle slider"
        />

        {/* Presets */}
        <div className="mb-3">
          <div className="text-[6px] font-bold uppercase text-white/30 tracking-wider mb-1">Presets</div>
          <div className="flex flex-wrap gap-1">
            {ANGLE_PRESETS.map((a) => (
              <button
                key={a}
                onClick={() => { setAngleStr(String(a)); setError(null); }}
                className={`px-1.5 py-0.5 rounded-[2px] text-[7px] font-mono transition-all ${
                  Math.abs((validateAngle(angleStr) ?? 0) - a) < 1
                    ? 'bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff]'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/40 hover:text-[#00f0ff]'
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={() => { setAngleStr('0'); setError(null); }}
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
            onClick={handleApply}
            className="px-3 py-1 rounded-[2px] bg-[#00f0ff] text-black text-[7px] font-black uppercase tracking-wider hover:bg-[#00f0ff]/80 transition-all"
          >
            Apply
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-1.5 text-[7px] font-mono text-red-400 animate-in fade-in slide-in-from-top-1 duration-150">
            ⚠ {error}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
