'use client';

/**
 * @purpose Gestiona un panel de control para el gobierno industrial, mostrando y administrando las propiedades estéticas y mecánicas según los manifestos y valores proporcionados.
 * @purpose_en ** Renders a console for industrial governance, displaying and managing aesthetic and mechanical properties based on the manifest and provided values.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** UI Component
 * @complexity ** Medium
 * @fingerprint exports:1,imports:12,sig:24k5fu
 * @lastUpdated 2026-06-15T11:49:45.502Z
 */

import React from 'react';
import { Hash } from 'lucide-react';
import type { OMEGA_Manifest, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import { getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';

import UnifiedGraphicGovernance from './aesthetic/UnifiedGraphicGovernance';
import SpatialGovernance from './aesthetic/SpatialGovernance';
import ColorGovernance from './aesthetic/ColorGovernance';
import MechanicalGovernance from './aesthetic/MechanicalGovernance';
import TypographyGovernance from './aesthetic/TypographyGovernance';
import LabelGovernance from './aesthetic/LabelGovernance';
import PrecisionGovernance from './aesthetic/PrecisionGovernance';

interface IndustrialGovernanceConsoleProps {
  type: string;
  values: Partial<OmegaStyleNode>;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OmegaStyleNode>) => void;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  title?: string | undefined;
  forcedCapabilities?: string[] | undefined;
  onOpenConfig?: (() => void) | undefined;
}

import { GOVERNANCE_DOMAINS } from './aesthetic/GovernanceRegistry';

export default function IndustrialGovernanceConsole({ 
  type, values, manifest, onUpdate, resolveAsset, title = "Industrial Governance", forcedCapabilities, onOpenConfig 
}: IndustrialGovernanceConsoleProps) {
  const def = getElementDefinition(type);
  if (!def) return null;

  // Use forced capabilities (for fragment-first editing) or fall back to element defaults
  const caps = forcedCapabilities || def.capabilities;

  // Mapping of Domain IDs to their respective Renderer Components
  const RENDERERS: Record<string, React.ElementType> = {
    identity: UnifiedGraphicGovernance,
    sequence: () => null, // Hidden as it's merged into identity
    spatial: SpatialGovernance,
    chromatic: ColorGovernance,
    mechanical: MechanicalGovernance,
    typography: TypographyGovernance,
    label: LabelGovernance,
    logic: PrecisionGovernance,
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Hash className="w-2.5 h-2.5 text-accent/60" />
          <span className="text-[7px] font-black text-accent/60 uppercase tracking-widest">{title}</span>
        </div>
        <div className="px-1.5 py-0.5 rounded-full border border-accent text-accent bg-accent/5 text-[5px] font-black uppercase tracking-tighter">
          Self-Contained Governance
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {GOVERNANCE_DOMAINS.map(domain => {
          const Renderer = RENDERERS[domain.id];
          if (!Renderer) return null;

          // Check if this component supports ANY capability of this domain
          const hasDomainCaps = domain.capabilities.some(cap => caps.includes(cap));
          if (!hasDomainCaps) return null;

          return (
            <Renderer 
              key={domain.id}
              type={type}
              values={values}
              capabilities={caps}
              manifest={manifest}
              onChange={onUpdate}
              resolveAsset={resolveAsset}
              onOpenConfig={onOpenConfig}
            />
          );
        })}

      </div>
    </div>
  );
}

