'use client';

/**
 * @purpose Renderiza un selector de tema visual para el editor de manifesto OMEGA.
 * @purpose_en Renders a visual theme selector for the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:vxxiyl
 * @lastUpdated 2026-06-17T22:30:12.493Z
 */

import { Palette, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export type OmegaUiTheme = 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast';

interface ThemeSelectorProps {
  uiTheme: OmegaUiTheme;
  setUiTheme: (theme: OmegaUiTheme) => void;
}

const THEMES: { id: OmegaUiTheme; label: string; color: string }[] = [
  { id: 'dark', label: 'Dark (Industrial)', color: '#00f0ff' },
  { id: 'light', label: 'Light (Minimal)', color: '#0ea5e9' },
  { id: 'amber', label: 'Amber (Warm)', color: '#f59e0b' },
  { id: 'cyberpunk', label: 'Cyberpunk (Neon)', color: '#ff2d95' },
  { id: 'high-contrast', label: 'High Contrast', color: '#ffffff' },
];

export default function ThemeSelector({ uiTheme, setUiTheme }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    // Delay to avoid immediate close from same click that opened it
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const activeTheme = THEMES.find(t => t.id === uiTheme) || THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 p-1.5 wb-surface border wb-outline rounded-xs hover:bg-primary/10 hover:border-primary/40 transition-all wb-text-muted hover:text-primary group text-[7px]"
        title={`Theme: ${activeTheme.label} (click to change)`}
        aria-label={`Theme selector: ${activeTheme.label}`}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: activeTheme.color }}
        />
        <Palette className="w-3 h-3 group-hover:scale-110 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-[180px] wb-surface border wb-outline rounded-xs shadow-2xl backdrop-blur-xl z-[200] py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              aria-label={`Select ${theme.label} theme`}
              onClick={() => {
                setUiTheme(theme.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-all text-left ${
                theme.id === uiTheme
                  ? 'bg-primary/10 text-primary'
                  : 'wb-text-muted hover:wb-text hover:bg-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: theme.color }}
              />
              <span className="flex-1 truncate">{theme.label}</span>
              {theme.id === uiTheme && (
                <Check className="w-2.5 h-2.5 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
