/**
 * @purpose Renderiza una sección colapsable para configurar la resolución del saltado de grid en el editor de manifesto OMEGA.
 * @purpose_en Renders a collapsible section for configuring grid snapping resolution in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:q3nfr3
 * @lastUpdated 2026-06-15T11:38:49.683Z
 */

import { LayoutGrid } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives';
import PropertyField from '../../PropertyField';

interface ModuleGridResolutionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  onHelp?: ((id: string) => void) | undefined;
  standalone?: boolean;
}

const HP_TO_MM = 5.08;

export default function ModuleGridResolution({ manifest, onUpdate, onHelp, standalone }: ModuleGridResolutionProps) {
  const content = (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <PropertyField label="Horizontal (px)" helper={`1 HP = ${HP_TO_MM.toFixed(2)}mm ≈ 15px`}>
          <IndustrialInput 
            type="number" 
            value={String(manifest.ui?.layout?.grid?.spacingX || 24)} 
            onChange={(v: string) => onUpdate({
              ui: {
                ...manifest.ui,
                layout: {
                  ...manifest.ui?.layout,
                  width: manifest.ui?.layout?.width || 0,
                  height: manifest.ui?.layout?.height || 0,
                  grid: {
                    ...manifest.ui?.layout?.grid,
                    enabled: manifest.ui?.layout?.grid?.enabled ?? true,
                    spacingX: Math.max(1, parseInt(v) || 1),
                    spacingY: manifest.ui?.layout?.grid?.spacingY || 24,
                    snapMode: manifest.ui?.layout?.grid?.snapMode || 'center'
                  }
                }
              }
            })}
            mono 
            align="center" 
          />
        </PropertyField>

        <PropertyField label="Vertical (px)" helper="e.g., 24px or 15px">
          <IndustrialInput 
            type="number" 
            value={String(manifest.ui?.layout?.grid?.spacingY || 24)} 
            onChange={(v: string) => onUpdate({
              ui: {
                ...manifest.ui,
                layout: {
                  ...manifest.ui?.layout,
                  width: manifest.ui?.layout?.width || 0,
                  height: manifest.ui?.layout?.height || 0,
                  grid: {
                    ...manifest.ui?.layout?.grid,
                    enabled: manifest.ui?.layout?.grid?.enabled ?? true,
                    spacingX: manifest.ui?.layout?.grid?.spacingX || 24,
                    spacingY: Math.max(1, parseInt(v) || 1),
                    snapMode: manifest.ui?.layout?.grid?.snapMode || 'center'
                  }
                }
              }
            })}
            mono 
            align="center" 
          />
        </PropertyField>
      </div>

      <p className="text-[6px] wb-text-muted uppercase font-bold tracking-tighter italic opacity-70 px-1">
        Tip: Use 15px or 7.5px to align with Eurorack HP horizontal standards.
      </p>
    </div>
  );

  if (standalone) return content;

  return (
    <InspectorCollapsible 
      title="Grid Snapping Resolution" 
      icon={LayoutGrid} 
      onHelp={() => onHelp?.('grid-snapping')}
    >
      {content}
    </InspectorCollapsible>
  );
}
