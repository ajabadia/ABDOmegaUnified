/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
