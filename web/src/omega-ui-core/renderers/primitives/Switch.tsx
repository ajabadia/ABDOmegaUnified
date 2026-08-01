/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza un componente de botón según las propiedades y estilos proporcionados.
 * @purpose_en Renders a switch component based on provided properties and styles.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:141ngui
 * @lastUpdated 2026-06-15T16:08:59.389Z
 */

import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface SwitchRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
}

export function Switch({
  id, style, value = 0,
}: SwitchRendererProps) {
  const isActive = value >= 0.5;
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  return (
    <div
      className={`switch-container size-${sizeLabel} color-${style.variant || 'cyan'}`}
      data-source={id}
    >
      <div className={`sw-led ${!isActive ? 'active' : ''}`} />
      <div className={`sw-led ${isActive ? 'active' : ''}`} />
    </div>
  );
}
