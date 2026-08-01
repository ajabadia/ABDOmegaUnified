/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Renderiza un indicador visual para reordenar elementos en una pila, destacando el índice objetivo con un punto coloreado y etiqueta.
 * @purpose_en Renders a visual indicator for reordering elements in a stack, highlighting the target index with a colored dot and label.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1uy9lr5
 * @lastUpdated 2026-06-15T15:30:12.449Z
 */

interface ReorderIndicatorProps {
  targetIndex: number | null | undefined;
  mode: 'stack-v' | 'stack-h';
}

export function ReorderIndicator({ targetIndex, mode }: ReorderIndicatorProps) {
  if (targetIndex === null) return null;

  return (
    <div 
      className="absolute pointer-events-none z-[110] flex items-center justify-center"
      style={{
        left: mode === 'stack-h' ? '-2px' : '0',
        top: mode === 'stack-v' ? '-2px' : '0',
        width: mode === 'stack-h' ? '4px' : '100%',
        height: mode === 'stack-v' ? '4px' : '100%',
      }}
    >
      <div className="w-full h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse rounded-full" />
      <div className="absolute bg-emerald-500 text-black text-[4px] font-black uppercase px-1 rounded-xs -top-4">
        Index: {targetIndex}
      </div>
    </div>
  );
}
