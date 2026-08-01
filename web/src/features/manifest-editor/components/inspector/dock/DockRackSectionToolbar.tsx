'use client';

/**
 * @purpose Renderiza una barra de herramientas para activar secciones en el editor de manifesto OMEGA, clasificándolas en opciones esenciales y avanzadas.
 * @purpose_en Renders a toolbar for toggling sections in the OMEGA manifest editor, categorizing them into essential and advanced options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1fit6cn
 * @lastUpdated 2026-06-15T11:14:06.678Z
 */

import React from 'react';
import { Info, Cpu, Paintbrush, Palette, Layout } from 'lucide-react';
import { DockIconBar } from './DockIconBar';
import type { DockIconBarButton } from './DockIconBar';

// Granular section IDs — must match WorkbenchContainer rackSections and PropertyPanel visibleSections
type SectionId =
  | 'essentialIdentity'
  | 'globalUiSkin'
  | 'physicalEmulationProfile'
  | 'aestheticsGlobals'
  | 'architecture';

interface RackSectionDef {
  id: SectionId;
  icon: React.ReactNode;
  title: string;
  level: 'essential' | 'advanced';
}

interface DockRackSectionToolbarProps {
  rackSections: Partial<Record<string, boolean>>;
  onToggleRackSection: (section: string) => void;
}

const SECTIONS: RackSectionDef[] = [
  { id: 'essentialIdentity',       icon: <Info className="w-4 h-4" />,        title: 'Toggle Identity',                   level: 'essential' },
  { id: 'globalUiSkin',            icon: <Paintbrush className="w-4 h-4" />,  title: 'Toggle UI Skin',                    level: 'essential' },
  { id: 'physicalEmulationProfile',icon: <Cpu className="w-4 h-4" />,         title: 'Toggle Chassis',                    level: 'essential' },
  { id: 'aestheticsGlobals',       icon: <Palette className="w-4 h-4" />,     title: 'Toggle Aesthetics',                 level: 'advanced' },
  { id: 'architecture',            icon: <Layout className="w-4 h-4" />,      title: 'Toggle Architecture',               level: 'advanced' },
];

const buttons: DockIconBarButton[] = SECTIONS.map(({ id, icon, title }) => ({ id, icon, title }));

const essentialIds = SECTIONS.filter(s => s.level === 'essential').map(s => s.id);
const advancedIds = SECTIONS.filter(s => s.level === 'advanced').map(s => s.id);

export function DockRackSectionToolbar({
  rackSections,
  onToggleRackSection
}: DockRackSectionToolbarProps) {
  const isSectionActive = (id: string) => {
    if (id === 'essentialIdentity') {
      return !!(rackSections.essentialIdentity || rackSections.identityBranding || rackSections.moduleTaxonomy);
    }
    if (id === 'globalUiSkin') {
      return !!(rackSections.globalUiSkin || rackSections.activeConstructionPlane);
    }
    if (id === 'aestheticsGlobals') {
      return !!(rackSections.aestheticsGlobals || rackSections.aestheticsElements);
    }
    return rackSections[id as keyof typeof rackSections] === true;
  };

  return (
    <DockIconBar
      buttons={buttons}
      isActive={(id) => isSectionActive(id)}
      onButtonClick={(id) => onToggleRackSection(id)}
      label="RACK SECT"
      groups={[
        { id: 'essential', buttonIds: essentialIds },
        { id: 'advanced', buttonIds: advancedIds, className: 'overflow-y-auto max-h-[50vh]' },
      ]}
      className="z-45 animate-in slide-in-from-right duration-200 shadow-lg"
    />
  );
}
