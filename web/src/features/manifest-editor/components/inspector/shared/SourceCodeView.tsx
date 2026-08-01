'use client';

/**
 * @purpose Renderiza una vista para mostrar y copiar código fuente con un título del contrato técnico.
 * @purpose_en Renders a view for displaying and copying source code with a technical contract title.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:khzrsr
 * @lastUpdated 2026-06-15T11:50:05.719Z
 */

import React from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface SourceCodeViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  title: string;
}

export default function SourceCodeView({ data, title }: SourceCodeViewProps) {
  const [copied, setCopied] = React.useState(false);
  const code = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-4 bg-[#0a0a0a] rounded-xs border wb-outline overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b wb-outline">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-accent" />
          <span className="text-[8px] font-black text-accent uppercase tracking-widest leading-none">{title} Technical Contract</span>
        </div>
        <button 
          onClick={handleCopy} 
          className="p-1 hover:bg-white/10 rounded-xs transition-all text-foreground/40 hover:text-primary"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <div className="p-3 bg-black/60">
        <pre className="text-[9px] font-mono text-primary/70 overflow-x-auto whitespace-pre-wrap leading-relaxed selection:bg-primary/20 selection:text-primary">
          {code}
        </pre>
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[6px] wb-text-muted uppercase font-bold tracking-widest italic">Read-only live stream from manifest memory</span>
            <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                <span className="text-[6px] text-accent uppercase font-black">Sys_Ready</span>
            </div>
        </div>
      </div>
    </div>
  );
}
