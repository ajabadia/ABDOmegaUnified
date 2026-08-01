/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza plantillas HTML personalizables para una terminal con propiedades como variante, vinculación, tamaño, color y fuente.
 * @purpose_en Renders HTML for a terminal with customizable properties such as variant, binding, size, color, and font.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1gotblm
 * @lastUpdated 2026-06-15T16:09:29.345Z
 */

/**
 * OMEGA Terminal Primitive Renderer
 * Era 7.2.3 Industrial Aseptic
 */

export interface TerminalProps {
  variant: string;
  bind: string;
  size: { width: number; height: number };
  color?: string | undefined;
  font?: string | undefined;
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
}

export function renderTerminalHTML(props: TerminalProps): string {
  const { variant, bind, color = 'var(--terminal-color, #ffcc00)', font = 'monospace' } = props;

  return `
    <div class="terminal-display variant-${variant}" 
         data-bind="${bind}"
         style="width: 100%; height: 100%; color: ${color}; font-family: ${font};">
        <div class="terminal-container" style="padding: 6px; font-size: 10px; opacity: 0.85; height: 100%; overflow: hidden; box-sizing: border-box;">&gt; SYS_OK: Telemetry online...</div>
    </div>
  `;
}
