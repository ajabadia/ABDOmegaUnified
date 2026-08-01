/**
 * @purpose Renderiza una sección para editar las dimensiones del chasis, unidades de montaje y especificaciones de potencia en un editor de manifesto OMEGA.
 * @purpose_en Renders a section for editing chassis dimensions, mounting units, and power specifications in an OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:15x0wa4
 * @lastUpdated 2026-06-15T11:39:40.849Z
 */

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { FieldRenderer } from '../../fields';
import type { FieldDef } from '../../fields';

const HP_TO_MM = 5.08;

interface ModuleChassisSectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
}

const DIMENSION_FIELDS: FieldDef<OMEGA_Manifest>[] = [
  { key: 'hp', label: 'Panel Width (HP)', path: 'metadata.rack.hp', type: 'number', mono: true, align: 'center', size: 'xs' },
  { key: 'depth', label: 'Panel Depth (mm)', path: 'metadata.rack.depth', type: 'number', mono: true, align: 'center', size: 'xs' },
];

const MOUNTING_FIELDS: FieldDef<OMEGA_Manifest>[] = [
  { key: 'units', label: 'Mounting Units', type: 'grid-buttons', columns: 2, options: [
    { value: '3U', label: '3U', sublabel: 'Standard Eurorack' },
    { value: '1U', label: '1U', sublabel: 'Intellijel / low-profile' },
  ]},
];

const POWER_FIELDS: FieldDef<OMEGA_Manifest>[] = [
  { key: 'plus12', label: '+12V (mA)', path: 'metadata.rack.power.plus12', type: 'number', mono: true, align: 'center', size: 'xs' },
  { key: 'minus12', label: '-12V (mA)', path: 'metadata.rack.power.minus12', type: 'number', mono: true, align: 'center', size: 'xs' },
  { key: 'five', label: '+5V (mA)', path: 'metadata.rack.power.five', type: 'number', mono: true, align: 'center', size: 'xs' },
];

export default function ModuleChassisSection({ manifest, onUpdate }: ModuleChassisSectionProps) {
  const hp = (manifest.metadata?.rack?.hp || 12);
  const widthMm = (hp * HP_TO_MM).toFixed(1);

  return (
    <div className="space-y-4">
      <FieldRenderer
        fields={DIMENSION_FIELDS}
        data={manifest}
        onUpdate={onUpdate}
        layout="grid"
        gridCols={2}
        helper={`Panel Width ≈ ${widthMm} mm`}
      />

      <FieldRenderer
        fields={MOUNTING_FIELDS}
        data={manifest}
        onUpdate={onUpdate}
      />

      <FieldRenderer
        fields={POWER_FIELDS}
        data={manifest}
        onUpdate={onUpdate}
        layout="grid"
        gridCols={3}
        helper="Optional hardware-reference current draw for documentation, catalog export, or real-world Eurorack parity."
      />
    </div>
  );
}
