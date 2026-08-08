/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Renderiza plantillas HTML para un elemento de escopo primitivo en el editor de manifesto OMEGA.
 * @purpose_en Renders HTML templates for a primitive scope element in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:lbhjmw
 * @lastUpdated 2026-06-15T16:09:03.688Z
 */

/**
 * OMEGA Scope Primitive Renderer
 * Era 7.2.3 Industrial Aseptic
 */

export interface ScopeProps {
  variant: string;
  bind: string;
  size: { width: number; height: number };
  color?: string | undefined;
  font?: string | undefined;
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
}

export function renderScopeHTML(props: ScopeProps): string {
  const { variant, bind, size, color = 'var(--scope-color, #00ff88)' } = props;
  const zoom = 1.5;
  const w = size.width * zoom;
  const h = size.height * zoom;

  return `
    <div class="scope-display variant-${variant}" 
         data-bind="${bind}"
         style="--scope-width: ${w}px; --scope-height: ${h}px; --scope-color: ${color};">
        <canvas class="scope-canvas" width="${w}" height="${h}"></canvas>
        <div class="scope-grid"></div>
    </div>
  `;
}
