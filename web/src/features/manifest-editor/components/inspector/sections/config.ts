'use client';

/**
 * @purpose Config centralizado de secciones del inspector (título, nivel, icono) extraído de PropertyPanel.tsx en Fase 4.
 * @purpose_en Centralized inspector section configs (title, level, icon) extracted from PropertyPanel.tsx in Fase 4.
 * @refactorable false
 * @classification Config
 * @complexity Low
 * @lastUpdated 2026-07-31
 */

import type { LucideIcon } from 'lucide-react';
import { Info, Layout, Palette, Zap, Activity, Box, Cpu, Paintbrush, Layers } from 'lucide-react';

export type SectionLevel = 'essential' | 'advanced' | 'diagnostics';

export interface SectionConfig {
  title: string | ((isModule: boolean) => string);
  level: SectionLevel;
  icon: LucideIcon;
  /** Resolver opcional para iconos que dependen del tipo de entidad (módulo vs nodo). */
  iconFor?: (isModule: boolean) => LucideIcon;
}

export const SECTION_CONFIG: Record<string, SectionConfig> = {
  identity: { title: 'Essential Identity', level: 'essential', icon: Info },
  essentialIdentity: { title: 'Essential Identity', level: 'essential', icon: Info },
  identityBranding: { title: 'Identity Branding', level: 'essential', icon: Cpu },
  moduleTaxonomy: { title: 'Module Taxonomy', level: 'essential', icon: Box },
  globalUiSkin: { title: 'Global UI Skin', level: 'essential', icon: Paintbrush },
  activeConstructionPlane: { title: 'Active Construction Plane', level: 'essential', icon: Layers },
  physicalEmulationProfile: { title: 'Physical Emulation Profile', level: 'essential', icon: Cpu },
  simulation: { title: 'Simulation (Dry-Run)', level: 'essential', icon: Activity },
  aestheticsGlobals: { title: 'Aesthetics Globals', level: 'essential', icon: Box },
  aesthetics: { title: 'Design & Aesthetics', level: 'advanced', icon: Palette },
  aestheticsElements: { title: 'Aesthetics Elements', level: 'advanced', icon: Palette },
  architecture: {
    title: (isModule: boolean) => (isModule ? 'Architecture' : 'Logic & Ports'),
    level: 'advanced',
    icon: Layout,
    iconFor: (isModule: boolean) => (isModule ? Layout : Zap),
  },
  diagnostics: { title: 'Low-Level Registry Role', level: 'diagnostics', icon: Layers },
};

export interface ResolvedSectionMeta {
  title: string;
  level: SectionLevel;
  icon: LucideIcon;
}

/** Resuelve el metadato de una sección (con fallback seguro para ids desconocidos). */
export function getSectionMeta(sectionId: string, isModule: boolean): ResolvedSectionMeta {
  const cfg = SECTION_CONFIG[sectionId];
  if (!cfg) return { title: sectionId, level: 'essential', icon: Info };
  return {
    title: typeof cfg.title === 'function' ? cfg.title(isModule) : cfg.title,
    level: cfg.level,
    icon: cfg.iconFor ? cfg.iconFor(isModule) : cfg.icon,
  };
}
