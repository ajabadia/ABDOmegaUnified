'use client';

/**
 * @purpose Gestiona y renderiza un componente para agregar, mostrar y eliminar activos de fuente de tipografía personalizados en el editor de manifesto OMEGA.
 * @purpose_en Manages and renders a component for adding, displaying, and removing custom font assets in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1jxgdoz
 * @lastUpdated 2026-06-17T22:31:51.649Z
 */

import React from 'react';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import IndustrialButton from '@/features/manifest-editor/components/inspector/shared/IndustrialButton';
import { PROTECTED_FONT_NAMES } from '@/omega-ui-core/typography/registry';

interface FontResourceManagerProps {
  fonts: { name: string; file: string }[];
  onAdd: (name: string, file: string) => void;
  onRemove: (index: number) => void;
}

const RESERVED_NAMES = PROTECTED_FONT_NAMES.map(n => n.toLowerCase());

export default function FontResourceManager({ fonts, onAdd, onRemove }: FontResourceManagerProps) {
  const [newFontName, setNewFontName] = React.useState('');
  const [newFontFile, setNewFontFile] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleAdd = () => {
    const name = newFontName.trim();
    const file = newFontFile.trim();

    if (!name || !file) {
      setError('Name and File path are required');
      return;
    }

    if (RESERVED_NAMES.includes(name.toLowerCase())) {
      setError(`'${name}' is a system reserved font name.`);
      return;
    }

    onAdd(name, file);
    setNewFontName('');
    setNewFontFile('');
    setError(null);
  };

  return (
    <div className="p-4 border wb-outline wb-surface-subtle rounded-xs space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Plus className="w-3.5 h-3.5 text-accent" />
        <span className="text-[10px] font-black wb-text uppercase tracking-wider">Industrial Font Resources</span>
      </div>
      
      <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter italic">
        Register your module&apos;s custom .ttf / .woff assets here. 
        They will appear in all typography selectors once registered.
      </p>

      <div className="space-y-2">
        {fonts.map((font, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 border wb-outline wb-surface-strong rounded-xs group">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-accent">{font.name}</span>
              <span className="text-[7px] font-mono wb-text-muted uppercase">{font.file}</span>
            </div>
            <button 
              onClick={() => onRemove(idx)}
              aria-label={`Remove font ${font.name}`}
              className="p-1.5 text-foreground/20 hover:text-red-400 hover:wb-surface-subtle rounded-xs transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <div className="p-4 border border-dashed wb-outline rounded-xs space-y-3 bg-black/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[7px] font-black uppercase wb-text-muted ml-1">Font Family Name</label>
              <input 
                type="text" 
                value={newFontName}
                onChange={(e) => setNewFontName(e.target.value)}
                placeholder="e.g. MoogAntique"
                className="w-full wb-surface-strong border wb-outline rounded-xs px-2 py-1.5 text-[9px] font-bold wb-text outline-none focus:border-accent/40 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black uppercase wb-text-muted ml-1">File Path (Relative)</label>
              <input 
                type="text" 
                value={newFontFile}
                onChange={(e) => setNewFontFile(e.target.value)}
                placeholder="fonts/myfont.ttf"
                className="w-full wb-surface-strong border wb-outline rounded-xs px-2 py-1.5 text-[9px] font-mono wb-text outline-none focus:border-accent/40 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[7px] text-red-400 font-bold uppercase animate-pulse px-1">
              <ShieldAlert className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <IndustrialButton 
              label="Register Font Asset"
              icon={Plus}
              onClick={handleAdd}
              size="sm"
              variant="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
