'use client';

/**
 * @purpose Franja que avisa de que no hay documento activo y el editor está sirviendo un manifiesto de respaldo.
 * @purpose_en Banner reporting that there is no active document and the editor is serving a fallback manifest.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @exports default NoActiveDocumentNotice
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import { AlertTriangle } from 'lucide-react';

/**
 * POR QUÉ ESTE COMPONENTE EXISTE
 *
 * `useManifestEditor` es la única frontera que resuelve `activeDocument`
 * cuando vale `undefined`, y lo hace sirviendo `DEFAULT_MANIFEST`. Eso evita
 * que el `undefined` se propague por los cincuenta consumidores de `manifest`
 * que cuelgan del hook.
 *
 * Pero un fallback silencioso cambia un fallo ruidoso por uno invisible: si
 * algún día el invariante del reducer se rompe, el usuario vería un editor
 * vacío y creería que ha perdido su trabajo, cuando en realidad lo que se ha
 * perdido es el puntero al documento. Esta franja convierte eso en algo
 * legible.
 *
 * `role="alert"` y no `status` a propósito, al contrario que el aviso de
 * historial: aquí SÍ hay una anomalía y el usuario tiene que enterarse ahora,
 * aunque esté leyendo otra cosa.
 */
export default function NoActiveDocumentNotice() {
  return (
    <div
      role="alert"
      data-testid="no-active-document-notice"
      className="flex items-center gap-2 px-3 py-2 border-t border-red-400/25 bg-red-400/[0.07] animate-in fade-in duration-300"
    >
      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-400/80" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-red-400/90 leading-none mb-1">
          No active document
        </p>
        <p className="text-[10px] text-white/60 leading-relaxed">
          The editor is showing a blank default manifest because no document is open. Anything you edit
          here will not be attached to a file.
        </p>
      </div>
    </div>
  );
}
