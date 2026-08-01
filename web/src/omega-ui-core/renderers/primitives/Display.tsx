/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
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
