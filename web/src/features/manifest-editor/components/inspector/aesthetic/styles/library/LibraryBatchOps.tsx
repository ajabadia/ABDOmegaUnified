'use client';

/**
 * @purpose Renderiza un componente con botones para exportar e importar datos JSON en el editor de manifesto OMEGA.
 * @purpose_en Renders a component with buttons for exporting and importing JSON data in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1nrkmie
 * @lastUpdated 2026-06-17T22:31:24.635Z
 */

import { Download, Upload } from 'lucide-react';

interface LibraryBatchOpsProps {
  onExport: () => void;
  onImport: () => void;
}

export default function LibraryBatchOps({ onExport, onImport }: LibraryBatchOpsProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button 
        onClick={onExport} 
        aria-label="Export style library as JSON"
        className="flex-1 flex items-center justify-center gap-2 py-2 bg-black/40 border wb-outline rounded-xs hover:bg-primary/5 group transition-all"
      >
        <Download className="w-3 h-3 wb-text-muted group-hover:text-primary" />
        <span className="text-[8px] font-black uppercase wb-text-muted group-hover:text-primary">Export JSON</span>
      </button>
      <button 
        onClick={onImport} 
        aria-label="Import style library from JSON"
        className="flex-1 flex items-center justify-center gap-2 py-2 bg-black/40 border wb-outline rounded-xs hover:bg-primary/5 group transition-all"
      >
        <Upload className="w-3 h-3 wb-text-muted group-hover:text-primary" />
        <span className="text-[8px] font-black uppercase wb-text-muted group-hover:text-primary">Import JSON</span>
      </button>
    </div>
  );
}
