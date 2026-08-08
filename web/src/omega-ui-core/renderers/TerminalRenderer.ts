/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
  const { variant, bind, size, color = 'var(--terminal-color, #ffcc00)', font = 'monospace' } = props;
  const zoom = 1.5;
  const w = size.width * zoom;
  const h = size.height * zoom;

  return `
    <div class="terminal-display variant-${variant}" 
         data-bind="${bind}"
         style="--terminal-width: ${w}px; --terminal-height: ${h}px; color: ${color}; font-family: ${font};">
        <div class="terminal-container"></div>
    </div>
  `;
}
