/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Gestiona tokens de diseño y resuelve colores, fuentes y estilos para componentes en el editor de manifesto OMEGA.
 * @purpose_en Manages design tokens and resolves colors, fonts, and styles for components in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:3,sig:1szbiq7
 * @lastUpdated 2026-06-20T11:08:46.888Z
 */

import { useMemo, useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaStyleNode, StyleVariant } from '../types/manifest';
import { DESIGN_TOKENS } from '../constants/design-tokens';

export type DesignTokenOverrides = {
  colors?: Partial<typeof DESIGN_TOKENS.colors> | undefined;
  radii?: Partial<typeof DESIGN_TOKENS.radii> | undefined;
  materials?: Partial<typeof DESIGN_TOKENS.materials> | undefined;
  lighting?: Partial<typeof DESIGN_TOKENS.lighting> | undefined;
};

type FlatStyle = Partial<OmegaStyleNode> & { aesthetics: Partial<OmegaStyleNode> };

/**
 * useDesignTokens (Era 7.2.3 - Core)
 * Full industrial compliance with backward compatibility.
 */
export function useDesignTokens(manifest: OMEGA_Manifest, entityOrOverrides?: ManifestEntity | DesignTokenOverrides) {
  const ui = manifest?.ui || {};

  const entity = (entityOrOverrides && 'id' in entityOrOverrides) ? (entityOrOverrides as ManifestEntity) : undefined;
  const overrides = (!entity) ? (entityOrOverrides as DesignTokenOverrides) : undefined;

  const tokens = useMemo(() => {
    return {
      ...DESIGN_TOKENS,
      colors: {
        ...DESIGN_TOKENS.colors,
        ...((ui.colors || {}) as Record<string, string>),
        ...overrides?.colors,
      },
      radii: { ...DESIGN_TOKENS.radii, ...overrides?.radii },
      materials: { ...DESIGN_TOKENS.materials, ...overrides?.materials },
      lighting: {
        ...DESIGN_TOKENS.lighting,
        ...((ui.lighting || {}) as Record<string, unknown>),
        ...overrides?.lighting,
      },
    };
  }, [ui.colors, ui.lighting, overrides]);

  // Backward-compatible color map including 'accent' alias
  const colors = useMemo(() => ({
    ...tokens.colors,
    accent: tokens.colors.primary,
  }), [tokens.colors]);

  // Physics / lighting
  const physics = useMemo(() => {
    const sAngle = Number(tokens.lighting.shadowAngle ?? 135);
    const angleRad = (sAngle * Math.PI) / 180;
    const shadowX = Math.cos(angleRad) * 4;
    const shadowY = Math.sin(angleRad) * 4;

    return {
      angle: sAngle,
      color: colors.background,
      distance: 4,
      blur: 4,
      filter: `drop-shadow(${shadowX}px ${shadowY}px 4px rgba(0,0,0,0.5))`,
      vars: {
        '--omega-shadow-angle': `${sAngle}deg`,
        '--omega-shadow-color': 'rgba(0,0,0,0.5)',
        '--omega-shadow-x': `${shadowX}px`,
        '--omega-shadow-y': `${shadowY}px`,
        '--omega-shadow-blur': '4px',
      },
    };
  }, [tokens.lighting, colors.background]);

  // Color resolver
  const resolveColor = useCallback((color: string | undefined, fallback = 'transparent') => {
    if (!color || color === 'transparent') return fallback;
    const palette = (ui.palette || {}) as Record<string, string | undefined>;
    if (palette[color]) return palette[color];
    const cMap = (ui.colors || {}) as Record<string, string | undefined>;
    if (cMap[color]) return cMap[color];
    return color;
  }, [ui.palette, ui.colors]);

  // Size resolver — resolves letter codes (A, B, C, D) to pixel values from ui.sizes
  const resolveSize = useCallback((sizeCode: string | undefined, fallback = 24): number => {
    if (!sizeCode) return fallback;
    const sizes = (ui.sizes || {}) as Record<string, number | undefined>;
    return sizes[sizeCode] ?? fallback;
  }, [ui.sizes]);

  // Font resolver
  const resolveFont = useCallback((fontIdOrCategory: string) => {
    const typography = ui.typography || {};
    const definition = typography.definitions?.find((d: { id: string; family: string }) => d.id === fontIdOrCategory);
    if (definition?.family) return definition.family;
    return (typography as Record<string, unknown>).defaultFont as string || 'Inter';
  }, [ui.typography]);

  // Style resolver — flattens aesthetics onto the object for direct property access
  const style = useMemo((): FlatStyle | null => {
    if (!entity) return null;
    const lookupKey = entity.presentation?.component || entity.type || 'container';
    const variant = entity.presentation?.variant || 'default';
    const libStyles = ui.styles?.[lookupKey] || [];
    const found = libStyles.find((s: StyleVariant) => s.id === variant);
    if (!found) return null;
    return { ...found.aesthetics, aesthetics: found.aesthetics };
  }, [entity, ui.styles]);

  // CSS variable map
  const cssVars = useMemo(() => {
    const s = (style || {}) as FlatStyle;
    return {
      ...physics.vars,
      '--omega-color-primary': colors.primary,
      '--omega-color-background': colors.background,
      '--omega-color-surface': colors.surface,
      '--omega-color-text': colors.text,
      '--omega-rounding': `${s.rounding ?? tokens.radii.panel}px`,
      '--omega-border-width': `${s.borderWidth ?? 0}px`,
      '--omega-texture': s.texture ?? 'none',
      '--omega-opacity': String(s.opacity ?? 1.0),
    } as Record<string, string>;
  }, [style, physics.vars, colors, tokens.radii]);

  return {
    tokens,
    physics,
    colors,
    style,
    resolveColor,
    resolveSize,
    resolveFont,
    cssVars,
    allVars: cssVars,
  };
}
