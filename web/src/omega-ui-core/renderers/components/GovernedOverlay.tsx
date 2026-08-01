/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Renderiza un overlay gobernado con fondo azul y texto "Layout Gobernado" cuando se activa.
 * @purpose_en Renders a governed overlay with a blue background and "Layout Governed" text when enabled.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:dre3zh
 * @lastUpdated 2026-06-15T15:18:33.541Z
 */

;

interface GovernedOverlayProps {
  enabled: boolean | undefined;
}

export function GovernedOverlay({ enabled }: GovernedOverlayProps) {
  if (!enabled) return null;

  return (
    <div className="absolute inset-0 bg-blue-500/5 pointer-events-none flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
      <div className="px-1.5 py-0.5 bg-blue-500 text-black text-[5px] font-black uppercase tracking-tighter rounded-full flex items-center gap-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2 h-2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <span>Layout Governed</span>
      </div>
    </div>
  );
}
