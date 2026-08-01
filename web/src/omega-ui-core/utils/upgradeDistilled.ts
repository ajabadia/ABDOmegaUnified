/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Migrar un manifesto distilado de OMEGA a un manifesto de trabajo con valores de metadata por defecto del editor.
 * @purpose_en Migrates a distilled OMEGA manifest to a work manifest with default editor metadata values.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:6,imports:1,sig:ideql7
 * @lastUpdated 2026-06-15T16:56:32.461Z
 */

/**
 * OMEGA upgradeDistilled.ts — Migración inversa de manifiesto destilado a work
 *
 * Cuando un usuario arrastra o carga un archivo .json que tiene el formato plano
 * de producción (destilado), este módulo lo detecta y lo convierte de vuelta a un
 * OMEGA_Manifest de trabajo (work) con valores por defecto para los metadatos
 * de editor que se perdieron durante la destilación.
 *
 * Advertencia:
 *   La migración inversa es *pérdida*: layouts dinámicos (stack-v, stack-h),
 *   variantes de estilo y guías de editor no pueden reconstruirse.
 *   El usuario recibe una advertencia visible.
 */

import type { OMEGA_Manifest, OmegaNode, OmegaStyleNode, NodeKind } from '@/omega-ui-core/types/manifest';

// ─── Types ─────────────────────────────────────────────────────────

/**
 * Formato plano de producción (destilado).
 * Es el formato que se genera para JUCE 8 / producción.
 */
export interface DistilledManifest {
  schemaVersion: string;
  name: string;
  author?: string;
  version?: string;
  rack: {
    width: number;
    height: number;
    children: DistilledNode[];
  };
  assets: string[];
}

/**
 * Nodo plano en el formato destilado (sin árbol recursivo).
 */
export interface DistilledNode {
  id: string;
  type: string;
  label?: string;
  pos: { x: number; y: number };
  size?: { width: number; height: number };
  style?: {
    color?: string;
    indicatorColor?: string;
    variant?: string;
    [key: string]: unknown;
  };
  bind?: string;
}

// ─── Constants ─────────────────────────────────────────────────────

export const CANONICAL_PALETTE: Record<string, string> = {
  background: '#0d0d0d',
  surface: '#1a1a1a',
  primary: '#00f2ff',
  accent: '#ff8c00',
  text: '#e0e0e0',
  muted: '#808080',
  error: '#ff4444',
  warning: '#ffaa00',
  success: '#44ff44',
  border: '#333333',
  knob: '#00f2ff',
  slider: '#00f2ff',
  led_off: '#333333',
  led_on: '#00f2ff',
};

export const UPGRADE_WARNING =
  'Importing production manifest. Static layout values have been generated and the undo history has been initialized. Some design metadata (auto layouts, style variants, editor guides) was lost during export.';

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Construye un contenedor raíz ficticio a partir de los hijos planos.
 * Cada nodo plano se convierte en un OmegaNode con kind='cell'.
 */
function buildFakeTree(children: DistilledNode[]): OmegaNode {
  return {
    id: 'imported_root',
    kind: 'rack' as NodeKind,
    role: 'structure',
    layout: {
      pos: { x: 0, y: 0 },
      mode: 'absolute',
    },
    children: children.map((child): OmegaNode => ({
      id: child.id,
      kind: 'cell' as NodeKind,
      cellRef: child.type,
      role: child.type === 'port' || child.type === 'terminal' ? 'io'
        : child.type === 'led' || child.type === 'scope' ? 'telemetry'
        : 'control',
      layout: {
        pos: { x: child.pos.x, y: child.pos.y },
        size: child.size ? { width: child.size.width, height: child.size.height } : { width: 48, height: 48 },
        mode: 'absolute',
      },
      style: child.style as OmegaStyleNode | undefined,
      bind: child.bind,
      meta: child.label ? { label: child.label } : undefined,
    })),
  };
}

// ─── Detection ─────────────────────────────────────────────────────

/**
 * Detecta si un objeto desconocido es un manifiesto destilado (plano).
 *
 * Criterios:
 *   1. schemaVersion === '10.0.0-distilled' (exacto), O
 *   2. Tiene `rack.children` (array) y NO tiene `ui` (ausencia de metadatos de editor)
 *
 * @param obj - Objeto a evaluar (ej: JSON.parse de un archivo .json)
 */
export function isDistilledManifest(obj: unknown): obj is DistilledManifest {
  if (!obj || typeof obj !== 'object') return false;
  const m = obj as Record<string, unknown>;

  // Check 1: schemaVersion exacto
  if (m.schemaVersion === '10.0.0-distilled') return true;

  // Check 2: heurística — tiene rack.children plano y no tiene ui.tree
  const rack = m.rack as Record<string, unknown> | undefined;
  const hasFlatChildren = !!rack && Array.isArray(rack.children);
  const hasUi = !!m.ui;
  return hasFlatChildren && !hasUi;
}

// ─── Migration ─────────────────────────────────────────────────────

/**
 * Convierte un manifiesto destilado (plano, producción) de vuelta a un
 * OMEGA_Manifest de trabajo (work) con valores por defecto.
 *
 * @param raw - Manifiesto destilado detectado por `isDistilledManifest()`
 * @returns OMEGA_Manifest listo para cargar en el editor
 */
export function upgradeDistilledToWork(raw: DistilledManifest): OMEGA_Manifest {
  return {
    schemaVersion: '10.0.0-omega',
    id: `imported_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    metadata: {
      name: raw.name || 'Imported (Distilled)',
      version: raw.version || '1.0.0',
      author: raw.author || '',
      family: 'utility',
      description: `Upgraded from distilled manifest v${raw.schemaVersion || 'unknown'}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    ui: {
      dimensions: {
        width: raw.rack?.width || 800,
        height: raw.rack?.height || 600,
      },
      layout: {
        width: raw.rack?.width || 800,
        height: raw.rack?.height || 600,
        grid: {
          enabled: true,
          spacingX: 10,
          spacingY: 10,
          snapMode: 'center',
          visible: true,
        },
      },
      palette: { ...CANONICAL_PALETTE },
      styles: {},
      tree: buildFakeTree(raw.rack?.children || []),
      // Inferir skin del schemaVersion o dejar por defecto
      skin: 'industrial',
    },
    resources: {
      assets: raw.assets.map((url, idx) => ({
        id: `asset_${idx}`,
        url,
        type: url.endsWith('.svg') ? 'svg' as const
          : url.endsWith('.png') ? 'filmstrip' as const
          : 'image' as const,
      })),
      extra: [],
    },
    nodes: [],
    entities: [],
    links: [],
  };
}
