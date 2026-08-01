'use client';

/**
 * @purpose Renderiza la lista de entradas históricas para el panel de arrastre derecho del editor de manifesto OMEGA.
 * @purpose_en Renders the history entries list for the right dock panel in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:wx3vpj
 * @lastUpdated 2026-06-20T09:15:59.002Z
 */

import { History } from 'lucide-react';

interface HistoryEntry {
  label: string;
  timestamp: number;
}

interface DockHistoryPanelProps {
  pastHistory: HistoryEntry[];
  onUndoTo: (index: number) => void;
}

/**
 * DockHistoryPanel — Lista de entradas del historial con navegación por clic.
 * Extraído de RightDockContainer.tsx para aislar la lógica de renderizado del historial.
 */
export function DockHistoryPanel({ pastHistory, onUndoTo }: DockHistoryPanelProps) {
  if (pastHistory.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center text-foreground/20 text-[10px] uppercase tracking-widest gap-1 py-4 select-none">
        <History className="w-3 h-3" />
        <span>Clean History</span>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto wb-surface-subtle flex flex-col py-1 select-none">
      {pastHistory.map((entry, index) => (
        <div
          key={index}
          onClick={() => onUndoTo(index)}
          className="w-full text-left px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-foreground/60 hover:bg-primary/10 hover:text-primary border-l-2 border-transparent hover:border-primary transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-primary opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">&gt;</span>
            <span className="truncate" title={entry.label}>{entry.label}</span>
          </div>
          <span className="text-[8px] opacity-30 shrink-0">
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}
