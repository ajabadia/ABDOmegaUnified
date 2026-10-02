/**
 * @purpose Decide si una sesión restaurada ha perdido su pila de deshacer y redacta el aviso que se lo explica al usuario.
 * @purpose_en Decides whether a restored session lost its undo stack, and produce the notice that explains it to the user.
 * @refactorable false
 * @classification Utility
 * @complexity Low
 * @exports UndoLossReason, SessionRestoreNotice, UndoLossInputs, detectUndoHistoryLoss, describeUndoLoss
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

/**
 * POR QUÉ HACE FALTA ESTO
 *
 * Antes de la bóveda, recargar tiraba la pila de deshacer siempre, y sin
 * decir nada. Con la bóveda, a veces se conserva y a veces no, y ese "a
 * veces" es el problema: el usuario ve que deshacer funciona tras recargar,
 * así que la ausencia de deshacer ya no se explica sola. Un botón que antes
 * funcionaba y hoy está gris parece un fallo del editor, no una decisión.
 *
 * Por eso el aviso solo aparece CUANDO HAY ALGO QUE PERDER, y dice cuántos
 * pasos se perdieron. Un documento recién abierto, sin historial, no ha
 * perdido nada y no debe quejarse de nada.
 */

export type UndoLossReason =
  /** Había pila en la sesión anterior y no hay registro en la bóveda. */
  | 'vault-missing'
  /** Hay registro, pero es de otra versión del manifiesto: no se puede aplicar. */
  | 'vault-stale'
  /** IndexedDB no está disponible (modo privado, cuota, SSR). */
  | 'vault-unavailable';

export interface SessionRestoreNotice {
  documentId: string;
  documentName: string;
  /** Pasos de deshacer que se han perdido. 0 si no se puede saber. */
  lostSteps: number;
  reason: UndoLossReason;
  /** Hash del manifiesto al que pertenecía la pila descartada, si lo hay. */
  staleHash?: string | undefined;
}

export interface UndoLossInputs {
  documentId: string;
  documentName: string;
  /** Pasos que la sesión anterior dejó registrados en el payload de localStorage. */
  persistedDepth: number;
  /** Pasos que la rehidratación ha dejado en el documento. */
  restoredDepth: number;
  /** ¿Se pudo abrir la bóveda? */
  vaultAvailable: boolean;
  /** Profundidad de la pila que había en el registro de la bóveda, si lo hay. */
  vaultDepth: number | undefined;
  /** ¿Coincidía el hash del manifiesto con el del registro? */
  vaultHashMatched: boolean;
}

/**
 * Devuelve el aviso, o `null` si no hay nada que avisar.
 *
 * La tabla de decisión, en orden de autoridad:
 *
 *   1. La pila se restauró → nada que avisar.
 *   2. Hay registro y el hash coincide → la bóveda FUNCIONÓ y dice que no
 *      había nada. Es la autoridad: manda sobre el contador de `localStorage`,
 *      que puede venir de otra generación del mismo manifiesto (deshacer todo
 *      devuelve el documento a un estado cuyo hash ya se había visto).
 *   3. Hay registro y el hash NO coincide → la pila era de otra versión del
 *      documento y no se puede aplicar. Se anuncia la de ese registro.
 *   4. No hay registro pero sí había profundidad anotada → se perdió al
 *      escribir la bóveda.
 *   5. No hay bóveda → el entorno no permitió guardarla.
 *
 * Y en 4 y 5, si la profundidad anotada es 0, no hay nada que perder y no se
 * dice nada: un documento recién abierto no ha perdido nada.
 */
export function detectUndoHistoryLoss(inputs: UndoLossInputs): SessionRestoreNotice | null {
  const { restoredDepth, persistedDepth, vaultAvailable, vaultDepth, vaultHashMatched } = inputs;
  if (restoredDepth > 0) return null;

  if (vaultDepth !== undefined) {
    if (vaultHashMatched) return null;
    return {
      documentId: inputs.documentId,
      documentName: inputs.documentName,
      lostSteps: vaultDepth,
      reason: 'vault-stale'
    };
  }

  if (persistedDepth <= 0) return null;

  return {
    documentId: inputs.documentId,
    documentName: inputs.documentName,
    lostSteps: persistedDepth,
    reason: vaultAvailable ? 'vault-missing' : 'vault-unavailable'
  };
}

/**
 * El texto del aviso.
 *
 * Cada causa tiene su frase porque el usuario puede actuar distinto según
 * cuál sea: si el navegador bloqueó el almacenamiento, guardar el proyecto
 * sigue siendo lo único que salva el trabajo; si el registro era de otra
 * versión del documento, lo perdido era un historial que ya no correspondía
 * a lo que está en pantalla.
 */
export function describeUndoLoss(notice: SessionRestoreNotice): {
  title: string;
  body: string;
} {
  const steps = notice.lostSteps;
  const stepText = steps > 0 ? `${steps} undo step${steps === 1 ? '' : 's'}` : 'your undo history';

  switch (notice.reason) {
    case 'vault-unavailable':
      return {
        title: 'Undo history unavailable',
        body:
          `This browser did not allow session storage, so ${stepText} from your last session ` +
          'could not be restored. Your changes are intact — save the project to protect them.'
      };
    case 'vault-stale':
      return {
        title: 'Undo history discarded',
        body:
          `The saved undo history belonged to an earlier version of this document, so it was not ` +
          `applied: ${stepText} are gone. Your changes are intact — save the project to protect them.`
      };
    case 'vault-missing':
    default:
      return {
        title: 'Undo history discarded',
        body:
          `Reloading the page dropped ${stepText} from your last session. Your changes are intact — ` +
          'save the project to protect them.'
      };
  }
}
