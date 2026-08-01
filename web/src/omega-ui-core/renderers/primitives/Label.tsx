/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Renderiza un componente etiqueta estilizado para su exhibición en el editor manifesto OMEGA.
 * @purpose_en Renders a styled label component for display in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:usmuwi
 * @lastUpdated 2026-06-15T16:08:39.298Z
 */

import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface LabelRendererProps {
  id: string;
  text: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
}

export function Label({
  text, style,
}: LabelRendererProps) {
  return (
    <div
      className={`attachment-label ${style.variant ? `variant-${style.variant}` : ''}`}
      style={{
        color: style.fontColor || style.color || '#ffffff',
        fontSize: style.fontSize ?? 8,
        fontFamily: style.font || 'Inter',
        fontWeight: style.variant === 'label_display' ? 400 : 900,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        opacity: style.opacity,
      }}
    >
      {text || 'LABEL'}
    </div>
  );
}
