'use client';

/**
 * @purpose Persistencia de tamaños de paneles y ancho del dock del inspector (extraído de RightDockContainer.tsx en Fase 4).
 * @purpose_en Inspector dock panel-size and dock-width persistence (extracted from RightDockContainer.tsx in Fase 4).
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @lastUpdated 2026-07-31
 */

export const PANEL_STORAGE_KEY = 'omega_dock_panel_sizes';
export const DOCK_WIDTH_STORAGE_KEY = 'omega_dock_width';

export function loadPanelSizes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePanelSizes(sizes: Record<string, number>): void {
  try { localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(sizes)); } catch { /* noop */ }
}

export function loadDockWidth(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(DOCK_WIDTH_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch { return 0; }
}

export function saveDockWidth(width: number): void {
  try { localStorage.setItem(DOCK_WIDTH_STORAGE_KEY, String(width)); } catch { /* noop */ }
}
