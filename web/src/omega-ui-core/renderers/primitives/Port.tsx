/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza un componente de puerto para el editor de manifesto OMEGA, mostrando colores y valores de señal según las propiedades de entrada.
 * @purpose_en Renders a port component for the OMEGA manifest editor, displaying signal colors and values based on input properties.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:679ppu
 * @lastUpdated 2026-06-15T16:08:51.858Z
 */

import React from 'react';
import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface PortRendererProps {
  id: string;
  label: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
  resolvedColor?: string | undefined;
}

function inferSignalColor(id: string, label: string): string {
  const search = `${id} ${label}`.toLowerCase();
  if (search.includes('midi')) return 'var(--signal-midi)';
  if (search.includes('gate') || search.includes('trig')) return 'var(--signal-gate)';
  if (search.includes('cv') || search.includes('mod')) return 'var(--signal-cv)';
  if (search.includes('pitch') || search.includes('freq') || search.includes('out') || search.includes('in')) return 'var(--signal-audio)';
  return 'var(--wb-primary)';
}

export function Port({
  id, label, style, value = 0, resolvedColor,
}: PortRendererProps) {
  const signalColor = resolvedColor || style.color || inferSignalColor(id, label);
  const opacity = 0.3 + (value * 0.7);
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  return (
    <div
      className={`port-socket size-${sizeLabel} color-${style.variant || 'cyan'}`}
      data-source={id}
      style={{
        '--omega-color-override': style.color,
        opacity: style.opacity,
      } as React.CSSProperties}
    >
      <div className="port-inner">
        <div
          className="port-led"
          style={{ backgroundColor: signalColor, opacity }}
        />
      </div>
    </div>
  );
}
