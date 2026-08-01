'use client';

/**
 * @purpose Gestiona y renderiza propiedades estéticas y ajustes de diseño para entidades manifestadas en el editor de manifestas OMEGA.
 * @purpose_en Manages and renders aesthetic properties and layout adjustments for manifest entities in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1l078vv
 * @lastUpdated 2026-06-15T11:41:40.681Z
 */

import type { ManifestEntity, OMEGA_Manifest, Presentation } from '@/types/manifest';
import IndustrialGovernanceConsole from './IndustrialGovernanceConsole';

interface AestheticsGovernanceProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  resolveAsset?: (id: string | undefined) => string | undefined;
  onOpenConfig?: () => void;
}

export default function AestheticsGovernance({ item, manifest, onUpdate, resolveAsset, onOpenConfig }: AestheticsGovernanceProps) {
  const pres = (item.presentation || {}) as Record<string, unknown>;
  const componentType = (pres.component as string) || 'knob';

  const mergedValues = {
    ...pres,
    ...((pres as Record<string, unknown>).style || {}) as object
  };

  const updateAesthetics = (updates: Record<string, unknown>) => {
    // ERA 7.2.3 INDUSTRIAL RULE: 
    // Aesthetic overrides (color, font, rounding, texture, etc.) move to 'style' node.
    // Core layout/logic properties stay in the root of presentation.
    
    const coreProps = ['variant', 'attachments', 'options', 'tab', 'component', 'offsetX', 'offsetY', 'container', 'colSpan', 'rowSpan', 'scale', 'precision', 'step', 'unit'];
    
    const newPres = { ...pres };
    const newStyle = { ...(pres.style as Record<string, unknown> || {}) } as Record<string, unknown>;
    
    Object.entries(updates).forEach(([key, value]) => {
        if (coreProps.includes(key)) {
            (newPres as unknown as Record<string, unknown>)[key] = value;
        } else {
            // Move to style node
            (newStyle as Record<string, unknown>)[key] = value;
            // Also keep legacy field for backward compatibility (optional but safer for now)
            (newPres as unknown as Record<string, unknown>)[key] = value; 
        }
    });
    
    onUpdate({
      presentation: {
        ...newPres,
        style: Object.keys(newStyle).length > 0 ? newStyle : undefined
      } as Presentation
    });
  };

  return (
    <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-500 pb-10">
      <IndustrialGovernanceConsole 
        type={componentType}
        values={mergedValues}
        manifest={manifest}
        onUpdate={updateAesthetics}
        resolveAsset={resolveAsset}
        onOpenConfig={onOpenConfig}
        title="Industrial Host Governance"
      />
    </div>
  );
}

