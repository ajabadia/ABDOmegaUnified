'use client';

/**
 * @purpose Barra de pestañas de documento con botón de cierre, que explica en pantalla por qué el último documento no se puede cerrar.
 * @purpose_en Document tab bar with a close button that explains on screen why the last document cannot be closed.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @exports default DocumentTabBar
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, FileText, Info, Plus } from 'lucide-react';
import type { DocumentOrchestrator } from '@/features/manifest-editor/types/document';

interface DocumentTabBarProps {
  orchestrator: DocumentOrchestrator;
  /**
   * Crea un documento nuevo y lo activa.
   *
   * Opcional a propósito: este componente es de presentación y solo sabe
   * mostrar pestañas y explicar por qué el cierre se rechaza. Quién genera el
   * id y clona el manifiesto es cosa de `useWorkbenchContainer`
   * (`utils/newDocument.ts`), no de aquí. Que sea opcional permite montar la
   * barra en tests sin cablear la acción.
   */
  onNewDocument?: (() => void) | undefined;
}

/**
 * POR QUÉ ESTA BARRA EXISTE
 *
 * `CLOSE_DOCUMENT` rechaza el cierre del último documento: el reducer
 * devuelve el estado sin cambios para no dejar al orquestador sin documento
 * activo (ver el invariante en `orchestratorReducer.ts`). Un no-op correcto
 * es un no-op INVISIBLE, y un botón que no hace nada parece un botón roto.
 *
 * POR QUÉ EL BOTÓN NO ESTÁ DESHABILITADO
 *
 * La alternativa fácil sería `disabled` en la última pestaña. Se descarta
 * porque reproduces el mismo problema que estamos arreglando: el usuario
 * pulsa, no ocurre nada, y ahora no puede ni siquiera averiguar por qué. Un
 * botón habilitado que responde explicando la regla informa; uno deshabilitado
 * solo confirma que algo no funciona.
 *
 * POR QUÉ EXISTE EL BOTÓN "NUEVO"
 *
 * Porque sin él esta barra era decorativa. `orchestrator.openDocument` no tenía
 * ningún llamador en producción, así que siempre había exactamente un
 * documento, el botón de cerrar solo podía activarse para explicar su negativa,
 * y la mitad de este componente (varias pestañas, limpiar el aviso al superarse
 * el último) era inalcanzable. Con `onNewDocument` la superficie multi-documento
 * es alcanzable de verdad y el aviso de "último documento" pasa a ser correcto por
 * primera vez.
 *
 * POR QUÉ EL AVISO NO ES UN TOAST
 *
 * Los toasts de la app se autodescartan a los 4 segundos. Una explicación de
 * por qué una acción está bloqueada tiene que estar cuando el usuario vuelve
 * a intentarlo, no cuando aparece. Se queda hasta que se cierra a mano o hasta
 * que se abre un segundo documento, momento en que la regla deja de aplicar y
 * el aviso quedaría mintiendo.
 *
 * `role="status"` con `aria-live="polite"` y no `alert`: no es una
 * emergencia, y `alert` cortaría lo que un lector de pantalla estuviera
 * leyendo para anunciar algo que el usuario acaba de provocar.
 */

/** Etiqueta legible de un documento. */
function documentLabel(id: string, doc: DocumentOrchestrator['documentsById'][string] | undefined): string {
  const name = doc?.manifest?.metadata?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : id;
}

export default function DocumentTabBar({ orchestrator, onNewDocument }: DocumentTabBarProps) {
  const { documentsById, activeDocumentId, closeDocument, setActiveDocument } = orchestrator;
  const [refusal, setRefusal] = useState<string | null>(null);
  const refusalRef = useRef<HTMLDivElement | null>(null);

  const ids = Object.keys(documentsById);
  const isLastDocument = ids.length <= 1;

  // El aviso se retira solo en cuanto hay más de un documento: la regla que
  // explicaba ya no aplica y dejarlo sería actively misleading.
  useEffect(() => {
    if (ids.length > 1) setRefusal(null);
  }, [ids.length]);

  const handleClose = useCallback(
    (id: string) => {
      // El guard real vive en el reducer, no aquí. Este componente solo
      // detecta la intención y la explica; si alguien cambiara el guard,
      // el aviso se equivocaría pero el estado seguiría a salvo.
      if (isLastDocument) {
        setRefusal(documentLabel(id, documentsById[id]));
        return;
      }
      closeDocument(id);
    },
    [isLastDocument, documentsById, closeDocument]
  );

  const handleDismiss = useCallback(() => setRefusal(null), []);

  return (
    <div className="flex items-stretch wb-bg border-b wb-outline text-[10px]">
      <div role="tablist" aria-label="Open documents" className="flex items-stretch overflow-x-auto">
        {ids.map((id) => {
          const doc = documentsById[id];
          const isActive = id === activeDocumentId;
          return (
            <div
              key={id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveDocument(id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveDocument(id);
                }
              }}
              data-testid="document-tab"
              data-document-id={id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 border-r wb-outline cursor-pointer transition-colors whitespace-nowrap ${
                isActive ? 'wb-surface wb-text' : 'wb-text-muted hover:wb-surface/50'
              }`}
            >
              <FileText className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
              <span className="font-semibold">{documentLabel(id, doc)}</span>
              {doc?.isDirty && (
                <span
                  data-testid="document-dirty-dot"
                  aria-label="Unsaved changes"
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  // Sin stopPropagation, cerrar una pestaña inactiva la
                  // seleccionaría primero y la dejaría activa después.
                  e.stopPropagation();
                  handleClose(id);
                }}
                aria-label={`Close ${documentLabel(id, doc)}`}
                data-testid="document-tab-close"
                className="shrink-0 p-0.5 rounded-xs opacity-40 hover:opacity-90 hover:bg-white/10 transition-opacity"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {onNewDocument && (
          // POR QUÉ EL BOTÓN "NUEVO" ESTÁ DENTRO DEL TABLIST
          //
          // Semánticamente no es una pestaña: es la acción que crea una. Por eso
          // va FUERA del `role="tablist"` y con `role="button"` explícito, para
          // que un lector de pantalla no lo anuncie como "pestaña 2 de 2"
          // cuando en realidad no lo es. Dentro del contenedor flex solo para
          // que comparta la misma línea y los mismos bordes.
          <button
            type="button"
            onClick={onNewDocument}
            role="button"
            aria-label="New document"
            title="New document"
            data-testid="document-tab-new"
            className="shrink-0 px-2 border-r wb-outline wb-text-muted hover:wb-surface/60 hover:wb-text transition-colors"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {refusal && (
        <div
          ref={refusalRef}
          role="status"
          aria-live="polite"
          data-testid="last-document-refusal"
          className="flex items-center gap-2 px-3 py-1.5 ml-auto text-[10px] text-white/70 border-l wb-outline bg-amber-400/[0.07] animate-in fade-in duration-200"
        >
          <Info className="w-3 h-3 shrink-0 text-amber-400/80" aria-hidden="true" />
          <span className="truncate">
            <span className="font-semibold text-white/85">{refusal}</span> is the last open document.
            Open or restore another one to close this tab.
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss explanation"
            className="shrink-0 underline underline-offset-2 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
