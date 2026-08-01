'use client';

/**
 * @purpose Renderiza una notificacion emergente que solicita al usuario restaurar un borrador no guardado o empezar de nuevo en el editor CellStudio.
 * @purpose_en Renders a modal prompting the user to restore an unsaved draft or start fresh in the CellStudio editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:19dhf7z
 * @lastUpdated 2026-06-15T12:46:57.204Z
 */

import { Cpu } from 'lucide-react';

interface CellStudioDraftPromptProps {
  isDraftStale: () => boolean;
  onRestore: () => void;
  onDismiss: () => void;
}

/**
 * CellStudioDraftPrompt — Modal to restore or discard a saved draft.
 */
export function CellStudioDraftPrompt({
  isDraftStale,
  onRestore,
  onDismiss
}: CellStudioDraftPromptProps) {
  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[151] flex items-center justify-center p-4">
        <div className="w-[400px] wb-surface border wb-outline rounded-xs p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest wb-text">Draft Found</h3>
              <p className="text-[10px] wb-text-muted">You have an unsaved workflow in progress</p>
            </div>
          </div>
          <p className="text-[10px] wb-text-muted mb-6">
            {isDraftStale()
              ? 'This draft is older than 30 minutes. You can restore it or start fresh.'
              : 'Would you like to restore your previous work or start a new workflow?'}
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onDismiss}
              title="Start fresh, discard draft"
              className="px-4 py-2 rounded-xs border wb-outline wb-text-muted hover:wb-text text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Start Fresh
            </button>
            <button
              onClick={onRestore}
              title="Restore saved draft"
              className="px-6 py-2 rounded-xs bg-accent text-black hover:brightness-110 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Restore Draft
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
