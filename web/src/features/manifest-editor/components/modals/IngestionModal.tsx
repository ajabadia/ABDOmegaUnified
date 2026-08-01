'use client';

/**
 * @purpose Gestiona el proceso de ingestión de archivos en el editor de manifesto OMEGA al renderizar un modal para la selección y confirmación de archivos.
 * @purpose_en Manages the ingestion process for files in the OMEGA manifest editor by rendering a modal for file selection and confirmation.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:1p7mgqg
 * @lastUpdated 2026-06-20T09:43:15.077Z
 */

import { motion } from 'framer-motion';
import ModalCloseButton from './ModalCloseButton';
import ModalActionButton from './ModalActionButton';
import { ScrollText, AlertTriangle, ChevronRight } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import { useIngestionLogic } from '@/features/manifest-editor/hooks/useIngestionLogic';
import type { IngestionFile } from '@/features/manifest-editor/hooks/useIngestionLogic';
import IngestionFileList from '../ingestion/IngestionFileList';

interface IngestionModalProps {
  files: File[];
  onConfirm: (selectedFiles: File[]) => void;
  onCancel: () => void;
}

export default function IngestionModal({ files, onConfirm, onCancel }: IngestionModalProps) {
  const focusTrapRef = useFocusTrap(true);
  const { ingestionList, toggleSelect, setPrimary, manifestCount, wasmCount, contractCount } = useIngestionLogic(files);

  const handleConfirm = () => {
    onConfirm(ingestionList.filter((i: IngestionFile) => i.selected).map((i: IngestionFile) => i.file));
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Industrial Ingestion Wizard"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline shadow-2xl overflow-hidden flex flex-col"
      >
        {/* HEADER */}
        <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xs bg-primary/10 flex items-center justify-center border border-primary/20">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest wb-text">Industrial Ingestion Wizard</h2>
              <p className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest mt-1 opacity-70">OMEGA Era 7.2.3 • Asset Synchronization</p>
            </div>
          </div>
          <ModalCloseButton onClick={onCancel} title="Cancel ingestion" />
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {(manifestCount > 1 || wasmCount > 1 || contractCount > 1) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xs flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tight">
                Multiple primary files detected. Please select canonical items.
              </p>
            </div>
          )}

          <IngestionFileList ingestionList={ingestionList} setPrimary={setPrimary} toggleSelect={toggleSelect} />
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t wb-outline flex justify-end gap-3 wb-surface-subtle">
          <ModalActionButton onClick={onCancel}>
            Abort Ingestion
          </ModalActionButton>
          <button
            onClick={handleConfirm}
            disabled={!ingestionList.some((i: IngestionFile) => i.selected)}
            aria-label="Confirm file ingestion"
            className="px-8 py-2.5 bg-primary/20 border border-primary/40 text-primary text-[9px] font-black uppercase tracking-widest rounded-xs hover:bg-primary/30 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_var(--wb-bloom)]"
          >
            <span>Confirm Injection</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
