'use client';

/**
 * @purpose Renderiza un modal para editar entidades manifestadas utilizando CellStudioContainer.
 * @purpose_en Renders a modal for editing manifest entities using CellStudioContainer.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1y2m4b6
 * @lastUpdated 2026-06-15T22:05:18.242Z
 */

import { AnimatePresence, motion } from 'framer-motion';
import type { ManifestEntity, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import CellStudioContainer from '../lab/CellStudioContainer';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';

interface UniversalCellEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cell: ManifestEntity) => void;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  initialCell?: ManifestEntity | undefined;
}

export default function UniversalCellEditorModal({ 
  isOpen, onClose, onSave, resolveAsset, manifest, initialCell 
}: UniversalCellEditorModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Universal cell editor"
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 md:p-12 overflow-hidden"
      >
        {/* BACKDROP */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0" 
        />

        {/* MODAL CONTAINER */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-7xl h-full max-h-[850px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <CellStudioContainer 
            initialCell={initialCell} 
            manifest={manifest} 
            resolveAsset={resolveAsset} 
            onSave={(cell: ManifestEntity) => { 
              onSave(cell); 
              onClose(); 
            }} 
            onClose={onClose} 
            isModal={true} 
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
