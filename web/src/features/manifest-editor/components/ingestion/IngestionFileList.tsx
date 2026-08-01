'use client';

/**
 * @purpose Gestiona una lista de archivos de ingestión categorizados por tipo y proporciona controles para establecer archivos principales y activar selecciones.
 * @purpose_en Renders a list of ingestion files categorized by type and provides controls to set primary files and toggle selections.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1w6gnu4
 * @lastUpdated 2026-06-17T22:30:43.003Z
 */

import { FileCode, Binary, ScrollText, Image as ImageIcon, Check } from 'lucide-react';
import type { IngestionFile } from '@/features/manifest-editor/hooks/useIngestionLogic';

interface IngestionFileListProps {
  ingestionList: IngestionFile[];
  setPrimary: (id: string) => void;
  toggleSelect: (id: string) => void;
}

export default function IngestionFileList({ ingestionList, setPrimary, toggleSelect }: IngestionFileListProps) {
  return (
    <div className="space-y-4">
      {['manifest', 'wasm', 'contract'].map(type => {
        const items = ingestionList.filter(i => i.type === type);
        if (items.length === 0) return null;

        return (
          <div key={type} className="space-y-2">
            <h3 className="text-[8px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
              {type === 'manifest' && <FileCode className="w-3 h-3 text-blue-400" />}
              {type === 'wasm' && <Binary className="w-3 h-3 text-primary" />}
              {type === 'contract' && <ScrollText className="w-3 h-3 text-purple-400" />}
              <span>{type}s identified ({items.length})</span>
            </h3>
            <div className="space-y-1">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setPrimary(item.id)}
                  aria-label={`Set ${item.file.name} as primary`}
                  className={`w-full flex items-center justify-between p-3 rounded-xs border transition-all ${
                    item.selected 
                      ? 'bg-primary/5 border-primary/40 text-primary' 
                      : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${item.selected ? 'border-primary bg-primary' : 'border-white/10'}`}>
                      {item.selected && <Check className="w-2.5 h-2.5 text-black" />}
                    </div>
                    <span className="text-[10px] font-mono truncate max-w-[300px]">{item.file.name}</span>
                  </div>
                  <span className="text-[7px] font-bold opacity-40 uppercase">
                    {Math.round(item.file.size / 1024)} KB
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {ingestionList.some(i => i.type === 'resource') && (
        <div className="space-y-2">
          <h3 className="text-[8px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
            <ImageIcon className="w-3 h-3" />
            <span>Other Resources ({ingestionList.filter(i => i.type === 'resource').length})</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {ingestionList.filter(i => i.type === 'resource').map(item => (
              <button
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                aria-label={`Toggle ${item.file.name} selection`}
                className={`flex items-center gap-3 p-2 rounded-xs border transition-all ${
                  item.selected 
                    ? 'bg-black/10 wb-outline wb-text' 
                    : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
                }`}
              >
                <div className={`w-3 h-3 rounded-xs border flex items-center justify-center transition-all ${item.selected ? 'border-white bg-white' : 'border-white/10'}`}>
                  {item.selected && <Check className="w-2 h-2 text-black" />}
                </div>
                <span className="text-[9px] font-mono truncate">{item.file.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
