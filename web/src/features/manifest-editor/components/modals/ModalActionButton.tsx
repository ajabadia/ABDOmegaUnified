/**
 * @purpose Renderiza un botón de acción secundaria reutilizable para los pies de footer OMEGA modales.
 * @purpose_en Renders a reusable secondary action button for OMEGA modal footers.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:19ur0aq
 * @lastUpdated 2026-06-20T09:43:18.603Z
 */

/**
 * ModalActionButton — Reusable secondary action button for OMEGA modal footers.
 * Eliminates the 7× duplication of the pattern:
 *   <button onClick={fn}
 *     className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted
 *       hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase
 *       tracking-widest transition-all duration-200">
 *     Label
 *   </button>
 */

import type { ReactNode } from 'react';

interface ModalActionButtonProps {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  /** Accessible label for the button. Falls back to children text if omitted. */
  ariaLabel?: string;
}

export default function ModalActionButton({ onClick, children, disabled, ariaLabel }: ModalActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all duration-200"
    >
      {children}
    </button>
  );
}
