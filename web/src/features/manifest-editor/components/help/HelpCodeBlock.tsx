'use client';

/**
 * @purpose Renderiza un bloque de código con resaltamiento sintáctico y función de copia para código C++/YAML en el editor de manifesto OMEGA.
 * @purpose_en Renders a code block with syntax highlighting and copy functionality for C++/YAML code in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1v9idp5
 * @lastUpdated 2026-06-15T11:03:18.207Z
 */

import { useState } from 'react';
import { Copy } from 'lucide-react';

interface HelpCodeBlockProps {
  code: string;
}

// HELPER: Simple Syntax Highlighter for C++/YAML
const highlightCode = (code: string) => {
  if (!code) return code;
  // Keywords (C++ & YAML)
  const keywords = /\b(extern|void|float|int|if|for|return|const|char|uint8_t|include|pragma|once|schemaVersion|id|metadata|ui|layout|tree|faces|children|cellRef|cell|layer|assets|controls|jacks|registry|bind|roles|kind|type|range|pos|size|style|presentation|acepack|acemm|wasm|OmegaNode|CellTemplate|BEGIN_OMEGA_PARAMETERS|END_OMEGA_PARAMETERS|OMEGA_PARAM|OMEGA_FAMILY|BEGIN_OMEGA_PORTS|OMEGA_PORT|EMSCRIPTEN_KEEPALIVE)\b/g;
  // Strings
  const strings = /("[^"]*"|'[^']*')/g;
  // Macros/Headers/YAML keys
  const macros = /(#\w+|omega_\w+|^\s*[\w-]+:)/gm;

  return code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // Escape HTML
    .replace(keywords, '<span class="text-primary">$1</span>')
    .replace(strings, '<span class="text-green-400/80">$1</span>')
    .replace(macros, '<span class="text-accent">$1</span>');
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="absolute top-3 right-3 z-[10] p-2 bg-black/60 hover:bg-primary/20 rounded-xs border border-white/10 hover:border-primary/40 transition-all group"
      title="Copiar código"
    >
      {copied ? (
        <span className="text-[8px] font-black text-green-400 uppercase tracking-widest px-1">Copiado!</span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-black text-white/20 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
          <Copy className="w-3 h-3 text-white/40 group-hover:text-primary transition-colors" />
        </div>
      )}
    </button>
  );
};

export function HelpCodeBlock({ code }: HelpCodeBlockProps) {
  return (
    <div className="relative group">
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xs blur opacity-20 group-hover:opacity-40 transition-opacity" />
      <CopyButton text={code} />
      <pre className="relative bg-[#0a0a0a] border border-white/10 p-5 pt-8 rounded-xs overflow-x-auto custom-scrollbar">
        <code 
          className="text-[10px] font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
        />
      </pre>
    </div>
  );
}
