/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza imágenes estáticas, logotipos y dibujos técnicos utilizando URLs y propiedades de tamaño y opacidad opcionales.
 * @purpose_en Renders static images, logos, and technical drawings using URLs and optional size and opacity properties.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:187dspf
 * @lastUpdated 2026-06-15T15:32:25.751Z
 */

/**
 * OMEGA UI CORE — Illustration Renderer (Fase 13)
 * Renders static images, logos, and technical drawings.
 */

export interface IllustrationProps {
  assetUrl?: string | undefined;
  size?: { width: number; height: number } | undefined;
  opacity?: number | undefined;
  id?: string | undefined;
  variant?: string | undefined;
}

export const renderIllustrationHTML = (props: IllustrationProps): string => {
  const { assetUrl, size, id, variant = 'contain' } = props;
  
  const width = size?.width || 40;
  const height = size?.height || 40;

  if (!assetUrl) {
    return `<div class="illustration-container illustration-missing" style="width: ${width * 1.5}px; height: ${height * 1.5}px;"></div>`;
  }

  return `
    <div 
        class="illustration-container variant-${variant}" 
        style="width: ${width * 1.5}px; height: ${height * 1.5}px;"
        ${id ? `data-source="${id}"` : ''}
    >
        <img 
          src="${assetUrl}" 
          style="width: 100%; height: 100%;" 
        />
    </div>
  `.trim();
};
