/**
 * @purpose Gestiona carga de fuentes dinámicas para el editor de manifesto OMEGA Omega para asegurar que la vista de rack coincida con el motor de producción.
 * @purpose_en Manages dynamic font loading for the OMEGA manifest editor to ensure rack preview matches the production engine.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:7k3mgb
 * @lastUpdated 2026-06-15T13:12:59.685Z
 */

import { useEffect } from 'react';
import type { OMEGA_Manifest, OMEGA_Font } from '@/omega-ui-core/types/manifest';
 
/**
 * OMEGA Dynamic Font Loader Hook
 * ---------------------------------------------------------------------------
 * Injects custom @font-face rules into the document head based on manifest resources.
 * This ensures the Manifest Editor rack preview matches the production engine.
 */
export function useDynamicFonts(manifest: OMEGA_Manifest, resolveAsset?: (path: string) => string | undefined) {
  useEffect(() => {
    const fonts = manifest.resources?.fonts || [];
    if (fonts.length === 0) return;
 
    const styleId = 'omega-dynamic-fonts';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
 
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
 
    const fontRules = fonts.map((font: OMEGA_Font) => {
      const fontFile = font.url || font.file || '';
      const url = resolveAsset ? resolveAsset(fontFile) : fontFile;
      if (!url) return '';
      
      return `
        @font-face {
          font-family: '${font.name}';
          src: url('${url}');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `;
    }).join('\n');
 
    styleTag.textContent = fontRules;
 
    return () => {
      // We don't necessarily want to remove the style on every re-render, 
      // but if the component unmounts we might want to clean up.
    };
  }, [manifest.resources?.fonts, resolveAsset]);
}
