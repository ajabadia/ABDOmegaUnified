'use client';

/**
 * @purpose Gestiona y devuelve tokens de color y tipografía para el tema OMEGA según el manifest proporcionado.
 * @purpose_en Manages and returns color and typography tokens for the OMEGA theme based on the provided manifest.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:11l49c6
 * @lastUpdated 2026-06-15T13:22:43.408Z
 */

import { useMemo } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * useRackTokens (Era 7.2.3)
 * Centralizes the 13 functional colors and typography tokens of the OMEGA theme.
 */
interface DNAToken {
  label: string;
  hex: string;
  class: string;
}

export function useRackTokens(manifest: OMEGA_Manifest) {
  const { palette, colors, typography } = useMemo(() => {
    const ui = manifest.ui || {};
    return {
      palette: (ui.palette || {}) as Record<string, string | undefined>,
      colors: (ui.colors || {}) as Record<string, string | undefined>,
      typography: (ui.typography || {}) as NonNullable<typeof ui['typography']>
    };
  }, [manifest.ui]);

  const DNA_TOKENS = useMemo<Record<string, DNAToken>>(() => ({
    primary: { label: 'Primary Accent', hex: palette.primary || '#00f2ff', class: 'text-primary' },
    secondary: { label: 'Secondary Accent', hex: palette.secondary || '#ff8c00', class: 'text-accent' },
    utility: { label: 'Utility / Support', hex: palette.utility || '#a0a0a0', class: 'text-white/40' },
    feedback: { label: 'Signal / Feedback', hex: palette.feedback || '#32cd32', class: 'text-green-400' },
    surface: { label: 'Surface / Background', hex: colors.surface || '#1a1c1e', class: 'text-white/60' },
    hardware: { label: 'Hardware / Rails', hex: palette.hardware || '#777777', class: 'text-accent/60' },
    chassis: { label: 'Master Chassis', hex: palette.chassis || '#1a1a1a', class: 'text-white/20' },
    text: { label: 'Text / Labeling', hex: colors.text || '#ffffff', class: 'text-white' },
    glow: { label: 'Atmospheric Glow', hex: palette.glow || '#00f2ff', class: 'text-primary/80' },
    glass: { label: 'Glass / Display', hex: palette.glass || 'rgba(255,255,255,0.05)', class: 'text-white/10' },
    warning: { label: 'Warning / Peak', hex: palette.warning || '#ff3300', class: 'text-red-500' },
    highlight: { label: 'Selection Highlight', hex: palette.highlight || '#ffffff', class: 'text-white' },
    weak: { label: 'Weak Tone / Detail', hex: colors.weak || '#555555', class: 'text-white/30' }
  }), [palette, colors]);

  const FONT_TOKENS = useMemo(() => {
    return typography.definitions || [];
  }, [typography.definitions]);

  return {
    dna: DNA_TOKENS,
    fonts: FONT_TOKENS,
    defaultFont: typography.defaultFont || 'Inter'
  };
}
