'use client';

/**
 * @purpose Gestiona un panel para administrar la historia de documentos con opciones para comparar y revertir a estados anteriores.
 * @purpose_en Manages a panel for administrating document history with options to compare and revert to previous states.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1k01dzk
 * @lastUpdated 2026-06-15T11:30:53.163Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import { History, GitCompare, RotateCcw, Clock } from 'lucide-react';
import type { HistoryEntry } from '../../types/history';

interface HistoryPanelProps {
  past: HistoryEntry[];
  onUndoTo: (index: number) => void;
  onCompare: (index: number) => void;
  className?: string;
}

/**
 * HistoryPanel (Phase 8/9 Integration)
 * Industrial-grade UI for managing document timeline and triggering diffs.
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  past, 
  onUndoTo, 
  onCompare, 
  className 
}) => {
  return (
    <div className={`flex flex-col wb-surface rounded-xs border wb-outline overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 wb-surface-strong border-b wb-outline">
        <History className="w-4 h-4 text-primary/60" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] wb-text-muted">Document Timeline</h3>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {past.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 opacity-20">
            <Clock className="w-8 h-8 mb-2" />
            <span className="text-[8px] font-black uppercase tracking-widest wb-text">No history recorded</span>
          </div>
        ) : (
          [...past].reverse().map((entry, revIdx) => {
            const originalIndex = past.length - 1 - revIdx;
            return (
              <motion.div
                key={`${entry.timestamp}-${originalIndex}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: revIdx * 0.02 }}
                className="group relative flex flex-col p-3 rounded-xs border wb-outline wb-surface-subtle hover:wb-surface-strong transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-tight wb-text group-hover:text-primary transition-colors">
                      {entry.label}
                    </span>
                    <span className="text-[8px] font-mono wb-text-muted opacity-60 mt-1 uppercase tracking-tighter">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => onCompare(originalIndex)}
                      title="Compare with Current"
                      className="p-1.5 rounded-xs wb-surface border wb-outline hover:bg-primary/20 wb-text-muted hover:text-primary transition-all"
                    >
                      <GitCompare className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onUndoTo(originalIndex)}
                      title="Revert to this state"
                      className="p-1.5 rounded-xs wb-surface border wb-outline hover:bg-red-400/20 wb-text-muted hover:text-red-400 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 wb-surface-strong border-t wb-outline">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-black uppercase wb-text-muted opacity-60">Snapshot Count</span>
          <span className="text-[8px] font-mono text-primary/60 font-black">{past.length}</span>
        </div>
      </div>
    </div>
  );
};
