/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-08-02 11:27:39
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
