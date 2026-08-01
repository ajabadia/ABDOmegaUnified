'use client';

/**
 * @purpose Renderiza un componente terminal-like para mostrar registros con una barra de herramientas y un indicador de estado en vivo.
 * @purpose_en Renders a terminal-like component to display logs with a toolbar and live status indicator.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:3kf7iq
 * @lastUpdated 2026-06-15T12:48:36.868Z
 */

import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LogTerminalProps {
  logs: string[];
}

export default function LogTerminal({ logs }: LogTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-t border-outline/30 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline/10 bg-black/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/60">Engineering Console</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/5 border border-green-500/20 rounded-full">
             <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[7px] text-green-500/60 font-mono font-bold uppercase">Live</span>
          </div>
        </div>
      </div>

      {/* LOG CONTENT */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono custom-scrollbar"
      >
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-2 text-[9px] leading-relaxed group border-l border-transparent hover:border-primary/20 pl-2 transition-all">
            <span className="text-foreground/40 group-hover:text-primary/60 transition-colors">
              {log}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 gap-3">
             <Terminal className="w-8 h-8 text-primary/20" />
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/40">Awaiting Signal...</span>
          </div>
        )}
      </div>
    </div>
  );
}
