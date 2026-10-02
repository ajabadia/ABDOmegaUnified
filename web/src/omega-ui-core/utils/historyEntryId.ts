/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Genera identificadores únicos y monotónicos para entradas de historial, con un nonce de sesión que impide colisionar con entradas restauradas de una sesión anterior.
 * @purpose_en Generates unique, monotonic ids for history entries, with a session nonce that prevents collisions with entries restored from a previous session.
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @exports nextHistoryEntryId, HISTORY_ID_SESSION_NONCE
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

/**
 * POR QUÉ ESTO EXISTE
 *
 * Los ids se generaban con `Date.now()`. `Date.now()` tiene resolución de
 * UN MILISEGUNDO, y una ráfaga de operaciones de usuario cae entera dentro de
 * uno: cinco `undo()` seguidos producían cinco entradas con el mismo id.
 * Medido antes del arreglo: 5 deshacer → 2 identificadores distintos.
 *
 * Eso no es cosmético. Dos entradas con el mismo id rompen dos cosas
 * concretas del editor:
 *
 *   1. La línea de tiempo renderiza con `key={entry.id}`. Con claves
 *      duplicadas, React reutiliza la fila equivocada al reconciliar: al
 *      deshacer, la etiqueta y el diff que se ven son los de otra entrada.
 *   2. `getRevision(id)` devuelve la PRIMERA coincidencia. Con ids
 *      repetidos, "restaurar esta revisión" reaplica la entrada equivocada.
 *
 * POR QUÉ UN CONTADOR Y NO `Math.random()` o `crypto.randomUUID()`
 *
 * Porque el id también es legible por una persona (logs, trazas de
 * observabilidad, mensajes de error) y porque un contador monotónico ordena
 * las entradas por creación sin necesidad de mirar el campo `timestamp`.
 * Un aleatorio cumpliría la unicidad y perdería las dos cosas.
 *
 * POR QUÉ UN NONCE DE SESIÓN ADEMÁS DEL CONTADOR
 *
 * El contador vuelve a cero en cada carga de página, y desde que el historial
 * se persiste en IndexedDB (bóveda de sesión) las entradas de la sesión
 * anterior siguen ahí al volver. Sin el nonce, un contador reiniciado
 * generaría `redo_1` sobre un `redo_1` restaurado: exactamente la misma
 * colisión, pero ahora entre recargas, que es donde más confunde.
 *
 * El nonce también separa PESTAÑAS: dos pestañas abiertas a la vez cargan el
 * módulo en instâncias distintas y no pueden coincidir.
 *
 * `SESSION_NONCE` se captura al cargar el módulo, no en cada llamada: si se
 * calculara por llamada volvería a ser `Date.now()` con más pasos.
 *
 * Y lleva un componente ALEATORIO además del instante. Un nonce que fuera solo
 * `Date.now()` seguiría teniendo resolución de milisegundo, que es
 * precisamente el defecto que este archivo arregla: dos pestañas abiertas en el
 * mismo milisegundo (o un test que reevalúa el módulo dentro del mismo tick)
 * obtendrían el mismo nonce y volverían a colisionar. El instante mantiene el
 * nonce ordenable y legible; la parte aleatoria es lo que lo hace único.
 */

/** Instante de carga en base 36 + sufijo aleatorio: corto, ordenable y único. */
export const HISTORY_ID_SESSION_NONCE: string = `${Date.now().toString(36)}${Math.random()
  .toString(36)
  .slice(2, 8)}`;

/**
 * Contador ÚNICO del módulo, compartido por todos los productores.
 *
 * Un contador por prefijo daría la misma unicidad (el prefijo ya forma parte
 * del id, así que `redo_1` y `undo_op_1` no se pisan nunca) y por eso ningún
 * test distingue una cosa de la otra. Se mantiene único por simplicidad: un
 * solo número que las trazas y los logs permiten leer ("la entrada 42 de esta
 * sesión") sin desambiguar por prefijo. La propiedad que sí importa —que el
 * id nunca se repita— la garantizan el par nonce + contador, no esto.
 */
let counter = 0;

/**
 * Devuelve el siguiente id de entrada de historial.
 *
 * @param prefix Etiqueta legible del productor (`redo`, `undo_op`, `tx`…).
 *   Se conserva porque identifica DE DÓNDE sale la entrada cuando se lee un
 *   log, y porque los tests existentes lo reconocen.
 *
 * @example nextHistoryEntryId('undo_op') // → "undo_op_m1x2y_000001"
 */
export function nextHistoryEntryId(prefix: string): string {
  counter += 1;
  // Relleno a 6 dígitos para que el id ORDENE por creación dentro de la
  // sesión: sin el, `..._10` se ordenaría antes que `..._9`.
  return `${prefix}_${HISTORY_ID_SESSION_NONCE}_${String(counter).padStart(6, '0')}`;
}
