/**
 * @purpose Gestiona la estructura y configuración para los botones del toolbar en el Editor de Manifesto OMEGA.
 * @purpose_en Defines the structure and configuration for the toolbar buttons in the OMEGA Manifest Editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:6,imports:2,sig:1jgtpcc
 * @lastUpdated 2026-06-20T10:45:33.531Z
 */

import {
  MousePointer2,
  Plus,
  Cpu,
  Sparkles,
  Settings,
  Zap,
  Maximize2,
  Group,
  Ungroup,
  Scale,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Categoría visual para agrupar en la UI de personalización */
export type ToolbarButtonGroup = 'tools' | 'edit' | 'views' | 'system';

export interface ToolbarButtonDef {
  /** Identificador único del botón */
  id: string;
  /** Etiqueta para mostrar en la UI de personalización */
  label: string;
  /** Icono */
  icon: ComponentType<{ className?: string }>;
  /** Grupo de categoría */
  group: ToolbarButtonGroup;
  /** Si es visible por defecto */
  defaultVisible: boolean;
  /** Tooltip para el botón */
  title: string;
  /** Si el botón es condicional (solo se muestra bajo ciertas condiciones del estado) */
  conditional: boolean;
}

export const TOOLBAR_BUTTONS: ToolbarButtonDef[] = [
  {
    id: 'select',
    label: 'Select Tool',
    icon: MousePointer2,
    group: 'tools',
    defaultVisible: true,
    title: 'Select & Move Tool (V)',
    conditional: false,
  },
  {
    id: 'marquee',
    label: 'Marquee Select',
    icon: ({ className }: { className?: string }) => (
      <svg className={className ?? 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2.5" strokeDasharray="3 3" />
      </svg>
    ),
    group: 'tools',
    defaultVisible: true,
    title: 'Marquee Selection Tool (M)',
    conditional: false,
  },
  {
    id: 'transform',
    label: 'Transform Tool',
    icon: Scale,
    group: 'tools',
    defaultVisible: true,
    title: 'Transform/Scale Tool (T)',
    conditional: false,
  },
  {
    id: 'add',
    label: 'Add Primitives',
    icon: Plus,
    group: 'tools',
    defaultVisible: true,
    title: 'Add Primitives & Ports (A)',
    conditional: false,
  },
  {
    id: 'studio',
    label: 'Cell Studio',
    icon: Cpu,
    group: 'edit',
    defaultVisible: true,
    title: 'Universal Cell Laboratory (Studio)',
    conditional: true,
  },
  {
    id: 'group',
    label: 'Group',
    icon: Group,
    group: 'edit',
    defaultVisible: true,
    title: 'Group selected elements',
    conditional: true,
  },
  {
    id: 'ungroup',
    label: 'Ungroup',
    icon: Ungroup,
    group: 'edit',
    defaultVisible: true,
    title: 'Ungroup selected group',
    conditional: true,
  },
  {
    id: 'blueprints',
    label: 'Blueprints',
    icon: Sparkles,
    group: 'views',
    defaultVisible: true,
    title: 'Blueprints & Templates (B)',
    conditional: false,
  },
  {
    id: 'config',
    label: 'Config',
    icon: Settings,
    group: 'views',
    defaultVisible: true,
    title: 'Module Signature & Governance',
    conditional: false,
  },
  {
    id: 'live',
    label: 'Live Mode',
    icon: Zap,
    group: 'system',
    defaultVisible: true,
    title: 'HIL Engine: Connect to WASM',
    conditional: false,
  },
  {
    id: 'zen',
    label: 'Zen Mode',
    icon: Maximize2,
    group: 'system',
    defaultVisible: true,
    title: 'Enter Zen Mode',
    conditional: false,
  },
];

/** Clave de localStorage para la configuración */
export const STORAGE_KEY = 'omega_toolbar_config';

export interface ToolbarConfig {
  /** IDs en el orden deseado */
  order: string[];
  /** IDs ocultos */
  hidden: string[];
}

export const DEFAULT_CONFIG: ToolbarConfig = {
  order: TOOLBAR_BUTTONS.map(b => b.id),
  hidden: [],
};
