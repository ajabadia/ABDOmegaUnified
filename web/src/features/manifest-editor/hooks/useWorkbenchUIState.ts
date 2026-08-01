'use client';

/**
 * @purpose Gestiona el estado local de UI del workbench: herramientas, minimapa, inspector, modales, paleta de comandos.
 * @purpose_en Manages local UI state for the workbench: tools, minimap, inspector, modals, command palette.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import { useState, useCallback } from 'react';

export interface WorkbenchUIState {
  activeTool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null;
  setActiveTool: React.Dispatch<React.SetStateAction<'select' | 'marquee' | 'add' | 'studio' | 'transform' | null>>;
  showMiniMap: boolean;
  inspectorLevel: 'simple' | 'medium' | 'advanced';
  setInspectorLevel: React.Dispatch<React.SetStateAction<'simple' | 'medium' | 'advanced'>>;
  showNumericResize: boolean;
  setShowNumericResize: React.Dispatch<React.SetStateAction<boolean>>;
  showNumericRotate: boolean;
  setShowNumericRotate: React.Dispatch<React.SetStateAction<boolean>>;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleMiniMap: () => void;
}

export function useWorkbenchUIState(): WorkbenchUIState {
  const [inspectorLevel, setInspectorLevel] = useState<'simple' | 'medium' | 'advanced'>('medium');
  const [activeTool, setActiveTool] = useState<'select' | 'marquee' | 'add' | 'studio' | 'transform' | null>('select');
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showNumericResize, setShowNumericResize] = useState(false);
  const [showNumericRotate, setShowNumericRotate] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleToggleMiniMap = useCallback(() => {
    setShowMiniMap(prev => !prev);
  }, []);

  return {
    activeTool, setActiveTool, showMiniMap, inspectorLevel, setInspectorLevel,
    showNumericResize, setShowNumericResize, showNumericRotate, setShowNumericRotate,
    isCommandPaletteOpen, setIsCommandPaletteOpen, handleToggleMiniMap,
  };
}
