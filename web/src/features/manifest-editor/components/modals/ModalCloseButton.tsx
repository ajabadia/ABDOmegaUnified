/**
 * @purpose Renderiza un botón de cierre reutilizable para modales de manifesto OMEGA.
 * @purpose_en Renders a reusable close button for OMEGA manifest modals.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1tobygq
 * @lastUpdated 2026-06-20T09:43:21.918Z
 */

/**
 * ModalCloseButton — Reusable close button for OMEGA manifest modals.
 * Eliminates the 10× duplication of the close button pattern:
 *   <button onClick={onClose} title="Close XYZ"
 *     className="p-1.5 rounded-xs border wb-outline wb-text-muted
 *       hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all">
 *     <X className="w-4 h-4" />
 *   </button>
 */

import { X } from 'lucide-react';

interface ModalCloseButtonProps {
  onClick: () => void;
  title?: string;
}

export default function ModalCloseButton({ onClick, title }: ModalCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title || 'Close modal'}
      className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
