/**
 * @purpose Gestiona la personalización del panel flotante en el editor de manifesto OMEGA, incluyendo la reordenación de botones, su mostrado o ocultamiento y la persistencia de la configuración mediante localStorage.
 * @purpose_en Manages the customization of a floating toolbar in the OMEGA manifest editor, including reordering buttons, showing/hiding them, and persisting the configuration using localStorage.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:b97qvz
 * @lastUpdated 2026-06-20T11:07:39.109Z
 */

'use client';

import { useState, useCallback, useEffect, startTransition } from 'react';
import {
  TOOLBAR_BUTTONS,
  STORAGE_KEY,
  DEFAULT_CONFIG,
  type ToolbarConfig,
} from '@/features/manifest-editor/constants/toolbarDefinitions';

function loadConfig(): ToolbarConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as ToolbarConfig;
    // Validate: ensure all known button IDs are present in order
    const knownIds = new Set(TOOLBAR_BUTTONS.map(b => b.id));
    const validOrder = parsed.order.filter(id => knownIds.has(id));
    // Add any missing buttons at the end
    for (const def of TOOLBAR_BUTTONS) {
      if (!validOrder.includes(def.id)) {
        validOrder.push(def.id);
      }
    }
    const validHidden = parsed.hidden.filter(id => knownIds.has(id));
    return { order: validOrder, hidden: validHidden };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: ToolbarConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useToolbarCustomization() {
  const [config, setConfig] = useState<ToolbarConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadConfig();
    startTransition(() => {
      setConfig(loaded);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveConfig(config);
    }
  }, [config, isLoaded]);


  /** Mover un botón de una posición a otra */
  const moveButton = useCallback((fromIndex: number, toIndex: number) => {
    setConfig(prev => {
      const newOrder = [...prev.order];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return { ...prev, order: newOrder };
    });
  }, []);

  /** Alternar visibilidad de un botón por ID */
  const toggleVisibility = useCallback((id: string) => {
    setConfig(prev => {
      const isHidden = prev.hidden.includes(id);
      return {
        ...prev,
        hidden: isHidden
          ? prev.hidden.filter(h => h !== id)
          : [...prev.hidden, id],
      };
    });
  }, []);

  /** Restaurar configuración por defecto */
  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    moveButton,
    toggleVisibility,
    resetToDefault,
  };
}
