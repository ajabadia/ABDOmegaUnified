'use client';

/**
 * @purpose Renderiza una barra de progreso y una línea de tiempo para gestionar la visibilidad de capas, bloquear, agrupar y deshacer acciones en el panel de capas del editor de manifestos OMEGA.
 * @purpose_en Renders a batch bar and timeline for managing layer visibility, locking, grouping, and undoing actions in the LayersPanel of the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1mzp7u0
 * @lastUpdated 2026-06-19T18:46:24.809Z
 */

import { EyeOff, Eye, Lock, Unlock, Folder, FolderOpen, Clock } from 'lucide-react';
import type { HistoryEntry, BatchVariant } from '@/features/manifest-editor/hooks/useBatchHistory';
import {
  BATCH_VARIANT_PILL, BATCH_VARIANT_TOOLTIP,
  BATCH_VARIANT_TIMELINE, BATCH_VARIANT_BUTTON,
} from '@/features/manifest-editor/hooks/useBatchHistory';
import { variantClass } from './layersPanelUtils';

interface LayersPanelBatchBarProps {
  multiSelectedIds: string[];
  onBatchSetVisibility?: ((ids: string[], hidden: boolean) => void) | undefined;
  onBatchSetLocked?: ((ids: string[], locked: boolean) => void) | undefined;
  onGroupSelected?: (() => void) | undefined;
  onBatchUngroup?: ((ids: string[]) => void) | undefined;
  handleBatchHide: () => void;
  handleBatchShow: () => void;
  handleBatchLock: () => void;
  handleBatchUnlock: () => void;
  handleBatchGroup: () => void;
  handleBatchUngroupAction: () => void;
  // History
  batchNotification: { message: string; variant: BatchVariant } | null;
  fadingOut: boolean;
  batchHistory: HistoryEntry[];
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  hoverHistory: boolean;
  setHoverHistory: (v: boolean) => void;
  handleUndoLastBatch: () => void;
  clearBatchHistory: () => void;
  isEntryUndoable: (entry: HistoryEntry) => boolean;
}

export default function LayersPanelBatchBar({
  multiSelectedIds,
  onBatchSetVisibility,
  onBatchSetLocked,
  onGroupSelected,
  onBatchUngroup,
  handleBatchHide, handleBatchShow,
  handleBatchLock, handleBatchUnlock,
  handleBatchGroup, handleBatchUngroupAction,
  batchNotification, fadingOut,
  batchHistory, showHistory, setShowHistory,
  hoverHistory, setHoverHistory,
  handleUndoLastBatch,
  clearBatchHistory, isEntryUndoable,
}: LayersPanelBatchBarProps) {
  return (
    <>
      {/* ── BATCH ACTIONS TOOLBAR ─────────────────────────────────────── */}
      {multiSelectedIds.length >= 2 && (onBatchSetVisibility || onBatchSetLocked) && (
        <div className="px-2 py-1.5 border-b wb-outline bg-primary/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[6px] font-black uppercase tracking-widest text-primary/70 whitespace-nowrap">{multiSelectedIds.length} selected</span>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1 flex-wrap">
              {onBatchSetVisibility && (<>
                <button onClick={handleBatchHide} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON.hide}`} title="Hide all selected"><EyeOff className="w-2.5 h-2.5" /> Hide</button>
                <button onClick={handleBatchShow} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON.show}`} title="Show all selected"><Eye className="w-2.5 h-2.5" /> Show</button>
              </>)}
              {onBatchSetVisibility && onBatchSetLocked && <div className="w-px h-3 bg-white/10" />}
              {onBatchSetLocked && (<>
                <button onClick={handleBatchLock} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON.lock}`} title="Lock all selected"><Lock className="w-2.5 h-2.5" /> Lock</button>
                <button onClick={handleBatchUnlock} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON.unlock}`} title="Unlock all selected"><Unlock className="w-2.5 h-2.5" /> Unlock</button>
              </>)}
              {onGroupSelected && (<>
                {(onBatchSetVisibility || onBatchSetLocked) && <div className="w-px h-3 bg-white/10" />}
                <button onClick={handleBatchGroup} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON.group}`} title="Group all selected"><Folder className="w-2.5 h-2.5" /> Group</button>
              </>)}
              {onBatchUngroup && (<>
                <div className="w-px h-3 bg-white/10" />
                <button onClick={handleBatchUngroupAction} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON.ungroup}`} title="Ungroup"><FolderOpen className="w-2.5 h-2.5" /> Ungroup</button>
              </>)}
            </div>

            {/* Notification pill + history button */}
            <div className="flex items-center gap-1 ml-auto">
              {batchNotification && (
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[7px] font-black uppercase tracking-widest ${fadingOut ? 'opacity-0 transition-opacity duration-300' : 'animate-in fade-in slide-in-from-right-2 duration-200'} ${BATCH_VARIANT_PILL[batchNotification.variant] ?? 'bg-white/10 text-white/70 border border-white/20'}`}>
                  ✓ {batchNotification.message}
                </div>
              )}
              {batchHistory.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowHistory(!showHistory)} onMouseEnter={() => setHoverHistory(true)} onMouseLeave={() => setHoverHistory(false)}
                    className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-xs border transition-all text-[7px] font-black uppercase tracking-widest ${showHistory ? 'bg-primary/15 border-primary/40 text-primary' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/30'}`}
                    title={showHistory ? 'Hide batch history' : 'Show batch history'}
                    aria-label={showHistory ? 'Hide batch history' : 'Show batch history'}
                  ><Clock className="w-2.5 h-2.5" />{batchHistory.length > 0 && <span className="tabular-nums">{batchHistory.length}</span>}</button>
                  {hoverHistory && !showHistory && (
                    <div onMouseEnter={() => setHoverHistory(true)} onMouseLeave={() => setHoverHistory(false)}
                      className="absolute top-full right-0 mt-1 z-[120] min-w-[140px] bg-[#0c0c0d] border border-white/10 rounded-xs shadow-[0_0_15px_rgba(0,0,0,0.7)] p-1.5 flex flex-col gap-0.5">
                      <div className="text-[6px] font-black uppercase tracking-widest text-white/30 pb-0.5 border-b border-white/5 mb-0.5">Recent ({Math.min(3, batchHistory.length)}/{batchHistory.length})</div>
                      {batchHistory.slice(0, 3).map((entry: HistoryEntry, i: number) => {
                        const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const undoable = isEntryUndoable(entry);
                        return (
                          <div key={`tip-${entry.time}-${i}`}
                            className={`flex items-center justify-between px-1.5 py-0.5 rounded-xs border-l-2 text-[7px] font-mono ${variantClass(BATCH_VARIANT_TOOLTIP, entry.variant) || 'border-white/20 text-white/60'}`}
                          >
                            <span className="flex items-center gap-1">
                              <span className={`text-[6px] ${undoable ? 'text-primary/60' : 'text-white/20'}`}>{undoable ? '↶' : '—'}</span>
                              <span className="font-black uppercase tracking-widest">{entry.message}</span>
                            </span>
                            <span className="text-[6px] opacity-50 tabular-nums ml-2">{timeStr}</span>
                          </div>
                        );
                      })}
                      {(batchHistory.length > 0 && (batchHistory[0].action === 'visibility' || batchHistory[0].action === 'lock' || (batchHistory[0].action === 'group' && batchHistory[0].value === true))) && (
                        <button onClick={handleUndoLastBatch}
                          className="w-full flex items-center justify-center gap-1 px-1.5 py-1 mt-0.5 rounded-xs border border-white/10 hover:border-primary/40 hover:bg-primary/10 transition-all text-[7px] font-black uppercase tracking-widest text-white/50 hover:text-primary"
                          title="Undo last batch action">↶ Undo {batchHistory[0].message}</button>
                      )}
                      {batchHistory.length > 3 && <div className="text-[6px] text-white/20 text-center pt-0.5 border-t border-white/5 mt-0.5">+{batchHistory.length - 3} more</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BATCH HISTORY TIMELINE ─────────────────────────────────────── */}
      {showHistory && batchHistory.length > 0 && (
        <div className="border-b wb-outline bg-black/30 shrink-0 max-h-36 overflow-y-auto">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[6px] font-black uppercase tracking-widest text-white/30">Batch History ({batchHistory.length})</span>
            <button onClick={clearBatchHistory} title="Clear batch history" className="text-[6px] font-mono text-white/20 hover:text-red-400 transition-colors uppercase tracking-wider">Clear</button>
          </div>
          <div className="flex flex-col gap-0.5 px-2 pb-1.5">
            {batchHistory.map((entry: HistoryEntry, i: number) => {
              const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const undoable = isEntryUndoable(entry);
              return (
                <div key={`${entry.time}-${i}`}
                  className={`flex items-center justify-between px-1.5 py-0.5 rounded-xs border-l-2 text-[7px] font-mono ${variantClass(BATCH_VARIANT_TIMELINE, entry.variant) || 'border-white/20 bg-white/5 text-white/60'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`text-[7px] ${undoable ? 'text-primary/60' : 'text-white/20'}`}>{undoable ? '↶' : '—'}</span>
                    <span className="font-black uppercase tracking-widest">{entry.message}</span>
                  </span>
                  <span className="text-[6px] opacity-50 tabular-nums">{timeStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
