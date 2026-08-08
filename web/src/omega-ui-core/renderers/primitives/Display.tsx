/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Renderiza un componente de visualización personalizable con valor estilizado y botones de control.
 * @purpose_en Renders a customizable display component with styled value and control buttons.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:yp1kix
 * @lastUpdated 2026-06-20T11:09:37.250Z
 */

import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface DisplayRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
}

export function Display({
  id, style, value = 0,
}: DisplayRendererProps) {
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';
  const displayValue = Math.round(value * 100);

  return (
    <div
      className={`mini-display variant-${style.variant || 'oled'} size-${sizeLabel} color-${style.variant || 'cyan'}`}
      data-source={id}
    >
      <div className="display-glass-overlay" />
      <div className="display-internal-glow" />
      <div className="display-scanlines" />
      <button className="display-btn minus" data-action="step-down" aria-label="Decrement">−</button>
      <div
        className="display-value"
        style={{
          fontFamily: style.font,
          fontSize: style.fontSize,
          color: style.fontColor,
        }}
      >
        {displayValue}
      </div>
      <button className="display-btn plus" data-action="step-up" aria-label="Increment">+</button>
    </div>
  );
}
