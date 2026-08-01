/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Renderiza un componente de tornillo personalizable para el editor de manifesto OMEGA.
 * @purpose_en Renders a customizable knob component for the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:1xjn3k9
 * @lastUpdated 2026-06-15T16:08:33.510Z
 */

import React from 'react';
import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface KnobRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
  /** Override asset URL resolution */
  assetUrl?: string | undefined;
  /** Override color resolution */
  resolvedColor?: string | undefined;
  resolvedIndicatorColor?: string | undefined;
}

const ROTATION_OFFSET = -135;
const ROTATION_RANGE = 270;

export function Knob({
  id, style, value = 0, assetUrl,
  resolvedColor, resolvedIndicatorColor,
}: KnobRendererProps) {
  const rotation = ROTATION_OFFSET + (value * ROTATION_RANGE);
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  const markerColor = resolvedIndicatorColor || style.indicatorColor || style.color;

  let assetEl: React.ReactNode = null;
  if (assetUrl) {
    const frames = style.frames || 1;
    const bgStyle: React.CSSProperties = { backgroundImage: `url(${assetUrl})` };
    if (frames > 1) {
      const effectiveValue = style.polarity === 'inverted' ? (1 - value) : value;
      const frameIndex = Math.round(effectiveValue * (frames - 1));
      const percent = frames > 1 ? (frameIndex / (frames - 1)) * 100 : 0;
      if (style.orientation === 'h') {
        bgStyle.backgroundPosition = `${percent}% 0%`;
      } else {
        bgStyle.backgroundPosition = `0% ${percent}%`;
      }
    }
    assetEl = <div className={`knob-asset filmstrip-${style.orientation || 'v'}`} style={bgStyle} />;
  }

  return (
    <div
      className={`knob-container size-${sizeLabel} color-${style.variant || 'cyan'} ${assetUrl ? 'has-asset' : ''}`}
      data-source={id}
      style={{
        '--knob-rotation': `${rotation}deg`,
        '--omega-color-override': resolvedColor || style.color,
        '--omega-indicator-color': markerColor,
        opacity: style.opacity,
      } as React.CSSProperties}
    >
      <div className="knob-shadow-ring" />
      {assetEl}
      <div
        className="knob-cap"
        style={resolvedColor || style.color ? { backgroundColor: resolvedColor || style.color } : undefined}
      >
        <div className="knob-specular" />
      </div>
      <div
        className="knob-marker"
        style={{
          '--knob-rotation': `${rotation}deg`,
          backgroundColor: markerColor,
        } as React.CSSProperties}
      />
    </div>
  );
}
