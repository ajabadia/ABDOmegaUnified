/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Renderiza un componente de botón personalizable con propiedades para tamaño, etiqueta y estilo.
 * @purpose_en Renders a customizable button component with properties for size, label, and style.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:1lvgwhv
 * @lastUpdated 2026-06-20T11:09:33.416Z
 */

import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface ButtonRendererProps {
  id: string;
  label: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
  ['aria-label']?: string;
}

export function Button({
  id, label, style, value = 0, ['aria-label']: ariaLabel,
}: ButtonRendererProps) {
  const isPressed = value >= 0.5;
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  const content = label
    ? <span className="stepper-text">{label.toUpperCase()}</span>
    : <div className="stepper-dot" />;

  return (
    <div
      className={`stepper-container type-button size-${sizeLabel} color-${style.variant || 'cyan'} ${isPressed ? 'pressed' : ''}`}
      data-source={id}
      data-type="button"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || label || `Button ${id}`}
    >
      {content}
    </div>
  );
}
