/**
 * @purpose Define la semántica del punto de guardado del historial y qué entradas quedan sin guardar.
 * @purpose_en Defines the history save-point semantics and which entries remain unsaved.
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:l1sx0w7
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import type { HistoryState } from '@/omega-ui-core/types/history';

/**
 * Semántica del punto de guardado.
 *
 * `history.past[i]` es el snapshot ANTERIOR a la mutación que produjo la
 * entrada, así que la entrada `i` describe el cambio que llevó del estado
 * `i-1` al estado `i`. El documento vivo es el estado `past.length`.
 *
 * `lastSavedIndex` se guarda con esa misma convención: es el índice de la
 * entrada que se estaba aplicando cuando se guardó el fichero, es decir, la
 * posición del cursor en la línea de tiempo. Por tanto:
 *
 *   - Todo lo que haya en `past` por ENCIMA de `lastSavedIndex` se hizo
 *     después del guardado y sigue sin guardar.
 *   - Deshacer hasta caer en `lastSavedIndex` deja el documento limpio otra
 *     vez, que es justo lo que el usuario espera al leer "sin guardar".
 *
 * `lastSavedIndex === -1` significa "nunca se guardó desde que existe esta
 * pila" (o que el punto de guardado se salió de la ventana de 50 entradas),
 * y entonces TODAS las entradas cuentan como cambios sin guardar.
 */

/**
 * Número de cambios sin guardar respecto al último guardado.
 *
 * Devuelve 0 cuando el documento está limpio, es decir, cuando el cursor
 * vivo (`past.length`) coincide con el punto de guardado.
 */
export function countUnsavedChanges(history: HistoryState): number {
  const { past, lastSavedIndex } = history;
  if (lastSavedIndex < 0) return past.length;
  return Math.max(0, past.length - lastSavedIndex);
}

/**
 * ¿Hay cambios sin guardar? Es la fuente de verdad para el marcador visual;
 * `DocumentState.isDirty` sigue siendo la autoridad para el aviso de cierre
 * porque se calcula por hash (detecta cambios que no pasan por el historial).
 */
export function hasUnsavedChanges(history: HistoryState): boolean {
  return countUnsavedChanges(history) > 0;
}

/**
 * ¿La entrada `index` de `history.past` forma parte de los cambios sin
 * guardar?
 *
 * El corte es `>= lastSavedIndex` y no `>`: `lastSavedIndex` es la posición del
 * cursor en el momento de guardar, así que la entrada que OCUPABA esa posición
 * es justo la primera que se hizo después del guardado. Con `>` el contador y
 * los marcadores discreparían (contar 2 y marcar 1), que es peor que no
 * marcar nada.
 */
export function isEntryUnsaved(history: HistoryState, index: number): boolean {
  return countUnsavedChanges(history) > 0 && index >= history.lastSavedIndex;
}