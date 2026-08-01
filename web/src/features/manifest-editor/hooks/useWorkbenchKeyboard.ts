'use client';

/**
 * @purpose Registra atajos de teclado globales del workbench (Ctrl+O, Ctrl+K).
 * @purpose_en Registers global workbench keyboard shortcuts (Ctrl+O, Ctrl+K).
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import { useEffect } from 'react';

export function useWorkbenchKeyboard(
  handleLoadOmegaProject: () => void,
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>,
): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        e.stopPropagation();
        handleLoadOmegaProject();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleLoadOmegaProject]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setIsCommandPaletteOpen]);
}
