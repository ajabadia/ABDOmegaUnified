/**
 * @purpose Gestiona dominios de gobernanza y capacidades para configuraciones estéticas en el editor de manifesto OMEGA.
 * @purpose_en Manages governance domains and capabilities for aesthetic configurations in the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:94vhc7
 * @lastUpdated 2026-06-15T11:40:26.874Z
 */

import type { AestheticCapability } from "@/omega-ui-core/governance/ElementCatalog";

export interface GovernanceDomain {
  id: string;
  label: string;
  icon: string;
  capabilities: AestheticCapability[];
}

export const GOVERNANCE_DOMAINS: GovernanceDomain[] = [
  {
    id: 'identity',
    label: 'Identity & Assets',
    icon: '🆔',
    capabilities: ['variant', 'asset']
  },
  {
    id: 'sequence',
    label: 'Sequence Anatomy',
    icon: '🎞️',
    capabilities: ['frames', 'frameWidth', 'frameHeight', 'orientation', 'mode']
  },
  {
    id: 'chromatic',
    label: 'Atmospheric Tinting',
    icon: '🎨',
    capabilities: ['glowColor', 'glassColor', 'color', 'indicatorColor']
  },
  {
    id: 'typography',
    label: 'Typography & Text',
    icon: '🔡',
    capabilities: ['font', 'fontSize', 'alignment', 'spacing', 'fontColor']
  },
  {
    id: 'label',
    label: 'Label Architectural Surface',
    icon: '🏷️',
    capabilities: ['labelX', 'labelY', 'labelW', 'labelH', 'labelBg', 'labelRounding', 'labelPadding']
  },
  {
    id: 'mechanical',
    label: 'Mechanical & Surface',
    icon: '⚙️',
    capabilities: ['rounding', 'borderWidth', 'thickness', 'padding', 'height', 'opacity', 'blur', 'tiling', 'material', 'texture']
  },
  {
    id: 'atmospheric',
    label: 'Atmospheric Effects',
    icon: '✨',
    capabilities: ['shadow', 'shadowInner', 'intensity']
  },
  {
    id: 'spatial',
    label: 'Spatial & Structural',
    icon: '📏',
    capabilities: ['size', 'position', 'zIndex']
  },
  {
    id: 'logic',
    label: 'Logic & Precision',
    icon: '🔢',
    capabilities: ['precision', 'active', 'tab']
  }
];

export const getDomainForCapability = (cap: AestheticCapability): string | undefined => {
  return GOVERNANCE_DOMAINS.find(d => d.capabilities.includes(cap))?.id;
};
