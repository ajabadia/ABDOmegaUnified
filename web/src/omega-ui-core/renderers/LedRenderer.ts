/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza plantillas HTML para componentes LED según las propiedades proporcionadas, como tamaño, color, valor y estilos adicionales.
 * @purpose_en Renders HTML templates for LED components based on provided properties such as size, color, value, and additional styles.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1p1pg6j
 * @lastUpdated 2026-06-15T15:32:42.442Z
 */

/**
 * OMEGA UI CORE — Stateless LED Renderer (Era 7.2.3)
 * Single Source of Truth for LED HTML Structure.
 */
 
 export interface LedProps {
   size: string;      // A, B, C, D
   colorId: string;   // cyan, red, orange, etc.
   value: number;     // 0.0 to 1.0
   id?: string | undefined;       // Optional binding ID
   transform?: string | undefined; // Optional CSS transform
   explicitColor?: string | undefined; // [NEW] Era 7.2.3 Custom Color Override
   assetUrl?: string | undefined;
   frames?: number | undefined;
   orientation?: 'v' | 'h' | undefined;
 }
 
 export const renderLedHTML = (props: LedProps): string => {
   const { size, colorId, value, id, transform, assetUrl, frames, orientation = 'v' } = props;
   
   // Calculate visibility/glow based on value
   const isActive = value > 0.05;
   const opacity = 0.3 + (value * 0.7);
   
   // Industrial Pattern: .led.size-X.color-Y[.active]
   const classes = [
     'led',
     `size-${size}`,
     `color-${colorId}`,
     isActive ? 'active' : '',
     assetUrl ? 'has-asset' : ''
   ].filter(Boolean).join(' ');
 
   const style = [
     `opacity: ${opacity}`,
     props.explicitColor ? `--led-color: ${props.explicitColor}` : '',
     props.explicitColor ? `background-color: ${props.explicitColor} !important` : '',
     transform || ''
   ].filter(Boolean).join('; ');
 
   let assetHTML = '';
   if (assetUrl) {
     let backgroundStyle = `background-image: url(${assetUrl});`;
     if (frames && frames > 1) {
         const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
         const percent = (frameIndex / (frames - 1)) * 100;
         backgroundStyle += orientation === 'v' 
             ? `background-position: 0% ${percent}%;` 
             : `background-position: ${percent}% 0%;`;
     }
     assetHTML = `<div class="led-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
   }
 
   return `
     <div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${style}">
       ${assetHTML}
       <div class="led-glass-overlay"></div>
       <div class="led-internal-glow"></div>
     </div>
   `.trim();
 };
