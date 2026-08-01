/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

import type { OMEGA_Manifest } from '../types/manifest';

/**
 * @purpose Gestiona tokens de color desde una manifestación OMEGA para resolverlos en valores HEX/RGBA para renderizar.
 * @purpose_en Manages tokens of color from an OMEGA manifest to resolve them into HEX/RGBA values for rendering.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:12e39bd
 * @lastUpdated 2026-06-15T16:55:40.709Z
 */
export class ColorResolver {
  /**
   * Translates a color token or value into a physical HEX color.
   */
  static resolve(col: string | undefined, manifest?: OMEGA_Manifest): string {
    if (!col || col === 'none') return 'transparent';
    if (col === 'transparent' || col === 'white' || col === 'black') return col;

    // ERA 7.2.3 - Hybrid Token/Alpha Resolution (DRY Philosophy)
    let baseColor = col;
    let alpha = 1;

    if (col.includes('/')) {
      const parts = col.split('/');
      baseColor = parts[0] || col;
      alpha = parseFloat(parts[1] || '1') || 1;
    }

    const resolveBase = (c: string): string => {
      if (c.startsWith('#') || c.startsWith('rgba') || c.startsWith('rgb')) return c;

      const palette = (manifest?.ui?.palette || {}) as Record<string, string | undefined>;
      const colors = (manifest?.ui?.colors || {}) as Record<string, string | undefined>;
      
      if (palette[c]) return palette[c]!;
      if (colors[c]) return colors[c]!;
      
      return 'transparent';
    };

    const resolvedHex = resolveBase(baseColor);
    const hasExplicitAlpha = col.includes('/');
    
    // Apply Alpha if explicitly requested or if it's not 1.0
    if (hasExplicitAlpha || alpha < 1) {
      if (resolvedHex.startsWith('#')) {
        const r = parseInt(resolvedHex.slice(1, 3), 16);
        const g = parseInt(resolvedHex.slice(3, 5), 16);
        const b = parseInt(resolvedHex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      if (resolvedHex.startsWith('rgba')) {
        return resolvedHex.replace(/[\d.]+\)$/, `${alpha})`);
      }
    }

    return resolvedHex;
  }

  /**
   * Recursively resolves all color properties in a style node.
   */
  static resolveStyle<T extends Record<string, unknown>>(style: T | undefined, manifest?: OMEGA_Manifest): T {
    if (!style) return {} as T;
    const resolved = { ...style } as Record<string, unknown>;
    
    // List of all 13 properties that are known to contain color tokens
    const colorProps = [
      'color', 'indicatorColor', 'glowColor', 'glassColor', 'fontColor', 
      'shadowColor', 'ambientColor', 'specularColor', 'warningColor',
      'borderColor', 'backgroundColor', 'activeColor', 'hoverColor'
    ];
    
    colorProps.forEach(prop => {
      if (typeof resolved[prop] === 'string') {
        resolved[prop] = ColorResolver.resolve(resolved[prop] as string, manifest);
      }
    });
    
    return resolved as T;
  }
}
