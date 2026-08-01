'use client';

/**
 * @purpose Renderiza un componente para visualizar y interactuar con las diferencias entre dos archivos manifest en el editor de manifesto OMEGA.
 * @purpose_en Renders a component for visualizing and interacting with differences between two manifest files in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1f6vubf
 * @lastUpdated 2026-06-17T22:34:05.944Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Edit2, AlertCircle, Hash, Box, Check, Zap } from 'lucide-react';
import type { ManifestDiffResult, DiffEntry } from '../../types/diff';

interface ManifestDiffViewerProps {
  diff: ManifestDiffResult | null;
  onApplyEntry?: (entry: DiffEntry) => void;
  onApplyAll?: (entries: DiffEntry[]) => void;
  className?: string;
}

/**
 * ManifestDiffViewer (Phase 9.2 MVP)
 * Industrial-grade UI for visualizing structural and property deltas.
 */
export const ManifestDiffViewer: React.FC<ManifestDiffViewerProps> = ({ diff, onApplyEntry, onApplyAll, className }) => {
  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-foreground/40 space-y-4">
        <AlertCircle className="w-8 h-8 opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest">No comparison data available</p>
      </div>
    );
  }

  if (diff.entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-green-400/60 space-y-4">
        <div className="w-12 h-12 rounded-full border border-green-400/20 flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.1)]">
          <Hash className="w-6 h-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest">Manifests are identical</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-black/20 rounded-xs border border-white/5 overflow-hidden ${className}`}>
      {/* Summary Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Structural Delta</h3>
            <span className="text-[8px] font-mono text-foreground/40 mt-0.5">
              {diff.targetHash.slice(0, 8)} vs {diff.baseHash.slice(0, 8)}
            </span>
          </div>
          
          <div className="flex gap-4 ml-2 border-l border-white/10 pl-4">
            <StatBadge label="Added" count={diff.summary.added} color="text-green-400" />
            <StatBadge label="Removed" count={diff.summary.removed} color="text-red-400" />
            <StatBadge label="Modified" count={diff.summary.modified} color="text-amber-400" />
          </div>
        </div>

        {onApplyAll && (
          <button
            onClick={() => onApplyAll(diff.entries)}
            aria-label="Apply all changes"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-all group"
          >
            <Zap className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Apply All</span>
          </button>
        )}
      </div>

      {/* Change List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {diff.entries.map((entry, idx) => (
          <DiffItem 
            key={`${entry.entityId}-${idx}`} 
            entry={entry} 
            index={idx} 
            onApply={() => onApplyEntry?.(entry)}
          />
        ))}
      </div>
    </div>
  );
};

const StatBadge = ({ label, count, color }: { label: string, count: number, color: string }) => (
  <div className="flex flex-col items-end">
    <span className={`text-[10px] font-mono font-black ${color}`}>{count}</span>
    <span className="text-[7px] font-black uppercase tracking-tighter opacity-40">{label}</span>
  </div>
);

const DiffItem = ({ entry, index, onApply }: { entry: DiffEntry, index: number, onApply?: () => void }) => {
  const isAdded = entry.changeType === 'added';
  const isRemoved = entry.changeType === 'removed';
  const isModified = entry.changeType === 'modified';

  let Icon = Edit2;
  let colorClass = 'text-amber-400';
  let bgClass = 'bg-amber-400/5';
  let borderClass = 'border-amber-400/20';

  if (isAdded) {
    Icon = Plus;
    colorClass = 'text-green-400';
    bgClass = 'bg-green-400/5';
    borderClass = 'border-green-400/20';
  } else if (isRemoved) {
    Icon = Minus;
    colorClass = 'text-red-400';
    bgClass = 'bg-red-400/5';
    borderClass = 'border-red-400/20';
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`group relative flex flex-col p-3 rounded-xs border ${bgClass} ${borderClass} hover:bg-white/5 transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-xs ${bgClass} ${colorClass}`}>
          <Icon className="w-3 h-3" />
        </div>
        
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
              {entry.changeType}
            </span>
            <span className="text-[8px] font-mono opacity-30">[{entry.entityKind}]</span>
          </div>
          <span className="text-[10px] font-black tracking-tight text-foreground/80 mt-0.5">
            {entry.entityId}
          </span>
        </div>

        {entry.parentContainerId && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/20 transition-colors">
            <Box className="w-2.5 h-2.5 text-primary/60" />
            <span className="text-[7px] font-black uppercase text-foreground/40">{entry.parentContainerId}</span>
          </div>
        )}

        {onApply && (
          <button
            onClick={onApply}
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-xs bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all text-primary"
            title="Apply this change"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
      </div>

      {isModified && (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-black/40 p-2 rounded-xs border border-white/5">
          <div className="flex flex-col">
            <span className="text-[7px] font-black uppercase opacity-30 mb-1 tracking-tighter">Original</span>
            <span className="text-[9px] font-mono text-red-400/80 truncate max-w-[100px]">{formatValue(entry.before)}</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black uppercase opacity-30 mb-1 tracking-tighter">Target</span>
            <span className="text-[9px] font-mono text-green-400 truncate max-w-[100px]">{formatValue(entry.after)}</span>
          </div>
          
          <div className="col-span-3 mt-1.5 flex items-center gap-2">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[7px] font-mono uppercase tracking-[0.2em] opacity-40">{entry.fieldPath}</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 via-white/10 to-transparent" />
          </div>
        </div>
      )}

      {!isModified && (
        <div className="mt-2 text-[8px] font-mono opacity-40 italic px-1">
          {entry.description}
        </div>
      )}
    </motion.div>
  );
};

function formatValue(val: unknown): string {
  if (val === undefined || val === null) return 'NULL';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
