'use client';

/**
 * @purpose Gestiona un menú desplegable para seleccionar fuentes en el editor de manifesto OMEGA.
 * @purpose_en Manages a dropdown menu for selecting fonts in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1xgocea
 * @lastUpdated 2026-06-15T11:49:34.655Z
 */

import { Type } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { OMEGA_OFFICIAL_FONTS } from '@/omega-ui-core/typography/registry';
import { useRackTokens } from '@/features/manifest-editor/hooks/useRackTokens';

interface FontSelectorProps {
  manifest: OMEGA_Manifest;
  selectedFont?: string;
  onSelect: (font: string | undefined) => void;
  label?: string;
  category?: 'headings' | 'labels' | 'displays' | 'technical';
}
 
export default function FontSelector({ 
  manifest, 
  selectedFont, 
  onSelect, 
  label = 'Industrial Typography',
  category
}: FontSelectorProps) {
  const { defaultFont } = useRackTokens(manifest);
  const customFonts = manifest.resources?.fonts?.map((f: { name: string }) => f.name) || [];
  const systemFontNames = OMEGA_OFFICIAL_FONTS.map(f => f.name);
  
  const typography = manifest.ui?.typography;
  const categoryConfig = category && typography ? (typography[category] as { font?: string } | undefined) : undefined;
  const inheritedFont = categoryConfig?.font || defaultFont;
 
  return (
    <div className="space-y-3">
      <label className="text-[8px] wb-text-muted uppercase font-black tracking-widest flex items-center gap-2">
        <Type className="w-3 h-3 text-primary" />
        <span>{label}</span>
      </label>
      
      <div className="relative group">
        <select 
          value={selectedFont || ''} 
          onChange={(e) => onSelect(e.target.value || undefined)}
          className="w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2.5 text-[10px] font-bold wb-text outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer pr-10"
        >
          <option value="">-- INHERIT ({inheritedFont || 'Inter'}) --</option>
          <optgroup label="System Globals" className="bg-black text-foreground">
            {systemFontNames.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </optgroup>
          {customFonts.length > 0 && (
            <optgroup label="Module Resources" className="bg-black text-accent">
              {customFonts.map((font: string) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </optgroup>
          )}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-[8px] text-primary">▼</span>
        </div>
      </div>
      
      {!selectedFont && (
        <p className="text-[6px] wb-text-muted font-bold uppercase tracking-tighter italic px-1">
          * Using global system typography.
        </p>
      )}
    </div>
  );
}
