'use client';

/**
 * @purpose Banner que informa de que un documento se restauró sin su historial de deshacer, con el motivo y el número de pasos perdidos.
 * @purpose_en Banner reporting that a document was restored without its undo history, including the cause and the number of lost steps.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @exports default SessionRestoreNotice
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import { useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  dismissSessionRestoreNotice,
  useSessionRestoreNotice,
  useSessionRecoveryNotice
} from '@/features/manifest-editor/hooks/useSessionRestoreNotice';
import { describeUndoLoss } from '@/features/manifest-editor/utils/sessionRestoreNotice';

/**
 * POR QUÉ ESTO NO ES UN TOAST
 *
 * Los toasts de la app se autodescartan a los 4 segundos. Un aviso sobre
 * trabajo perdido no puede desaparecer solo: si el usuario vuelve a la
 * ventana dos minutos después y el botón de deshacer sigue gris, la
 * explicación tiene que seguir ahí. Se descarta a mano y solo entonces.
 *
 * Va encima del pie de página, no en una esquina flotante, por una razón
 * concreta: el aviso tiene que leerse JUNTO al botón de deshacer que está
 * gris, que es donde la pregunta del usuario se forma.
 *
 * `role="status"` con `aria-live="polite"` (y no `alert`) a propósito: no es
 * una emergencia —los cambios están intactos— y `alert` interrumpe lo que
 * un lector de pantalla estuviera leyendo.
 */
export default function SessionRestoreNotice() {
  const notice = useSessionRestoreNotice();
  const recovery = useSessionRecoveryNotice();

  const handleDismiss = useCallback(() => {
    dismissSessionRestoreNotice();
  }, []);

  // La resurrección se anuncia PRIMERO y sin botón de cerrar: no es algo que
  // el usuario pueda descartar, porque ocurrió antes de que el editor
  // existiera y ya no hay vuelta atrás. El aviso de deshacer de abajo sí es
  // descartable porque la pila se puede volver a perder, no se ha perdido
  // para siempre.
  if (recovery) {
    const { documentNames, unrecoverableIds } = recovery;
    const total = documentNames.length;
    const plural = total === 1;

    let title: string;
    let body: string;
    if (total === 0) {
      title = 'Previous session could not be recovered';
      body =
        'The saved session listed no open documents. Nothing was stored that still said what those ' +
        'documents contained, so this is a new blank module — check for unsaved work before you ' +
        'start editing.';
      // Aunque no se haya recuperado nada, si se SABE que había documentos
      // detrás se dice cuántos: "nada se recuperó" y "no había nada" son
      // afirmaciones distintas, y sin la cifra el usuario no puede decidir si
      // lo que perdió le importa.
      if (unrecoverableIds.length > 0) {
        const lost = unrecoverableIds.length;
        body +=
          ` ${lost} ${lost === 1 ? 'document was' : 'documents were'} stored before the session ` +
          `vault kept manifests, and ${lost === 1 ? 'is' : 'are'} unrecoverable.`;
      }
    } else {
      title = plural
        ? 'Previous session recovered'
        : `Previous session recovered (${total} documents)`;
      body =
        `The saved session listed no open documents, so the documents were rebuilt from the ` +
        `session vault: ${documentNames.join(', ')}.`;
      if (unrecoverableIds.length > 0) {
        const lost = unrecoverableIds.length;
        body +=
          ` ${lost === 1 ? 'One more document' : `${lost} more documents`} ` +
          `${lost === 1 ? 'was' : 'were'} stored before the vault kept manifests and ` +
          `${lost === 1 ? 'is' : 'are'} unrecoverable.`;
      }
    }

    return (
      <div
        role="alert"
        data-testid="session-recovery-notice"
        data-recovered={total}
        data-unrecoverable={unrecoverableIds.length}
        className="flex items-start gap-2 px-3 py-2 border-t border-amber-400/25 bg-amber-400/[0.07] animate-in fade-in duration-300"
      >
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-400/80" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 leading-none mb-1">
            {title}
          </p>
          <p className="text-[10px] text-white/60 leading-relaxed break-words">{body}</p>
        </div>
      </div>
    );
  }

  if (!notice) return null;

  const { title, body } = describeUndoLoss(notice);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="session-restore-notice"
      data-reason={notice.reason}
      className="flex items-start gap-2 px-3 py-2 border-t border-amber-400/25 bg-amber-400/[0.07] animate-in fade-in duration-300"
    >
      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-400/70" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 leading-none mb-1">
          {title}
        </p>
        <p className="text-[10px] text-white/60 leading-relaxed break-words">
          <span className="text-white/75 font-semibold">{notice.documentName}</span>
          {' — '}
          {body}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss undo history notice"
        className="shrink-0 p-0.5 rounded-xs text-white/25 hover:text-white/70 hover:bg-white/10 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
