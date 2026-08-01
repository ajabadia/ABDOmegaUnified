'use client';

/**
 * @purpose Renderiza un modal completo de pantalla completa para comparación y fusión detallada de archivos manifestos.
 * @purpose_en Renders a full-screen modal for detailed structural comparison and merging of manifest files.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1lvbbmv
 * @lastUpdated 2026-06-15T20:49:04.380Z
 */

import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from './ModalCloseButton';
import ModalActionButton from './ModalActionButton';
import { GitCompare, History } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import type { ManifestDiffResult, DiffEntry } from '../../types/diff';
import { ManifestDiffViewer } from '../inspector/ManifestDiffViewer';

interface ManifestDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: ManifestDiffResult | null;
  onMergeEntries?: ((entries: DiffEntry[]) => void) | undefined;
}

/**
 * ManifestDiffModal (Phase 9.2 MVP)
 * Full-screen modal for detailed structural comparison.
 */
export default function ManifestDiffModal({ isOpen, onClose, diff, onMergeEntries }: ManifestDiffModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Structural Comparison"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b wb-outline wb-surface-subtle">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <GitCompare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-black uppercase tracking-widest wb-text">Structural Comparison</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <History className="w-3 h-3 text-primary/60" />
                    <span className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest opacity-70">History Snapshot vs Current Workspace</span>
                  </div>
                </div>
              </div>

              <ModalCloseButton onClick={onClose} title="Close comparison" />
            </div>

            {/* Diff Body */}
            <div className="flex-1 overflow-hidden p-6 bg-black/20">
              <ManifestDiffViewer 
                diff={diff} 
                className="h-full" 
                onApplyEntry={(entry) => onMergeEntries?.([entry])}
                onApplyAll={(entries) => onMergeEntries?.(entries)}
              />
            </div>

            {/* Footer */}
            <div className="p-6 border-t wb-outline flex justify-end gap-3 wb-surface-subtle">
              <ModalActionButton onClick={onClose}>
                Dismiss View
              </ModalActionButton>
              <button
                onClick={() => diff && onMergeEntries?.(diff.entries)}
                disabled={!diff || diff.entries.length === 0}
                className="px-6 py-2.5 rounded-xs bg-primary/20 border border-primary/40 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Merge All Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
