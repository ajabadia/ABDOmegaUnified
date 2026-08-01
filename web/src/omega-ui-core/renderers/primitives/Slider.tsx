/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza un componente de slider personalizable para el editor de manifesto OMEGA.
 * @purpose_en Renders a customizable slider component for the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:0sr4md
 * @lastUpdated 2026-06-15T16:08:55.819Z
 */

import React from 'react';
import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface SliderRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
  assetUrl?: string | undefined;
  resolvedColor?: string | undefined;
  resolvedIndicatorColor?: string | undefined;
}

export function Slider({
  id, style, value = 0, assetUrl,
  resolvedColor, resolvedIndicatorColor,
}: SliderRendererProps) {
  const isHoriz = style.orientation === 'horizontal';
  const type = isHoriz ? 'slider-h' : 'slider-v';
  const pct = value * 100;

  const railStyle: React.CSSProperties = isHoriz
    ? { width: `calc(${pct}% - 4px)` }
    : { height: `calc(${pct}% - 4px)` };

  const capStyle: React.CSSProperties = isHoriz
    ? { left: `calc(${pct * 0.9}%)` }
    : { bottom: `calc(${pct * 0.9}%)` };

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
    assetEl = <div className={`slider-asset filmstrip-${style.orientation || 'v'}`} style={bgStyle} />;
  }

  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  return (
    <div
      className={`slider-wrapper ${type} size-${sizeLabel} color-${style.variant || 'cyan'} ${assetUrl ? 'has-asset' : ''}`}
      data-source={id}
      style={{
        '--omega-color-override': resolvedColor || style.color,
        '--omega-indicator-color': resolvedIndicatorColor || style.indicatorColor || style.color,
        opacity: style.opacity,
      } as React.CSSProperties}
    >
      {assetEl}
      <div
        className="slider-rail-active"
        style={{ ...railStyle, backgroundColor: 'var(--omega-indicator-color)' }}
      />
      <div
        className="slider-cap"
        style={{ ...capStyle, backgroundColor: 'var(--omega-color-override)' }}
      />
    </div>
  );
}
