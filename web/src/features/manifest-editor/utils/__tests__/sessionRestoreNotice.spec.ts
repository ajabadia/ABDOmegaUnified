/**
 * Tests de la detección de pérdida de historial al restaurar.
 *
 * El riesgo de este módulo no es que avise de más, es que avise de menos o
 * que mienta. Un aviso que aparece cuando no se perdió nada entrena al
 * usuario a ignorarlo, y uno que dice "3 pasos" cuando eran 12 le hace dudar
 * de todo lo demás que ve en pantalla.
 */
import { detectUndoHistoryLoss, describeUndoLoss } from '../sessionRestoreNotice';
import type { UndoLossInputs } from '../sessionRestoreNotice';

function inputs(overrides: Partial<UndoLossInputs> = {}): UndoLossInputs {
  return {
    documentId: 'primary',
    documentName: 'Mi módulo',
    persistedDepth: 4,
    restoredDepth: 0,
    vaultAvailable: true,
    vaultDepth: undefined,
    vaultHashMatched: false,
    ...overrides
  };
}

describe('detectUndoHistoryLoss — no avisa cuando no hay pérdida', () => {
  it('calla si la bóveda restauró la pila', () => {
    expect(detectUndoHistoryLoss(inputs({ restoredDepth: 7 }))).toBeNull();
  });

  it('calla si la sesión anterior no tenía historial', () => {
    // Documento recién abierto: la pila vacía no es una pérdida, es el
    // estado natural. Avisar aquí sería inventar un daño.
    expect(detectUndoHistoryLoss(inputs({ persistedDepth: 0 }))).toBeNull();
  });

  it('calla si el registro de la bóveda estaba vacío de verdad', () => {
    expect(
      detectUndoHistoryLoss(
        inputs({ persistedDepth: 0, vaultDepth: 0, vaultHashMatched: true })
      )
    ).toBeNull();
  });

  it('calla si no hay bóveda y tampoco había historial', () => {
    expect(
      detectUndoHistoryLoss(inputs({ persistedDepth: 0, vaultAvailable: false }))
    ).toBeNull();
  });
});

describe('detectUndoHistoryLoss — avisa cuando hay pérdida', () => {
  it('avisa si había pila y no hay registro en la bóveda', () => {
    const notice = detectUndoHistoryLoss(inputs({ persistedDepth: 12 }));
    expect(notice).not.toBeNull();
    expect(notice!.reason).toBe('vault-missing');
    expect(notice!.lostSteps).toBe(12);
    expect(notice!.documentName).toBe('Mi módulo');
  });

  it('avisa con el tamaño de la PILA DESCARTA, no con el de la sesión', () => {
    // Cuando el registro es de otra versión del manifiesto, lo que se pierde
    // es lo que había en ESE registro. Anunciar la profundidad de la sesión
    // sería un número que no corresponde a nada que el usuario pueda
    // reconocer.
    const notice = detectUndoHistoryLoss(
      inputs({ persistedDepth: 4, vaultDepth: 9, vaultHashMatched: false })
    );
    expect(notice!.reason).toBe('vault-stale');
    expect(notice!.lostSteps).toBe(9);
  });

  it('el registro de otra versión tiene prioridad sobre "no hay bóveda"', () => {
    // Si hay un registro que no se aplicó, decir "el navegador bloqueó el
    // almacenamiento" sería un diagnóstico falso: el almacenamiento funcionó
    // perfectamente, lo que no cuadra es el manifiesto.
    const notice = detectUndoHistoryLoss(
      inputs({ vaultAvailable: false, vaultDepth: 3, vaultHashMatched: false })
    );
    expect(notice!.reason).toBe('vault-stale');
  });

  it('avisa si IndexedDB no estaba disponible', () => {
    const notice = detectUndoHistoryLoss(inputs({ vaultAvailable: false }));
    expect(notice!.reason).toBe('vault-unavailable');
    expect(notice!.lostSteps).toBe(4);
  });

  it('trata un hash coincidente con pila vacía como "no había nada"', () => {
    // Registro presente y válido, pero con la pila vacía: la bóveda
    // funcionó y no había nada que devolver. Manda sobre el contador de
    // `localStorage`, que puede venir de otra generación del mismo
    // manifiesto (deshacer todo devuelve el documento a un estado cuyo hash
    // ya se había visto antes).
    expect(
      detectUndoHistoryLoss(
        inputs({ persistedDepth: 5, vaultDepth: 0, vaultHashMatched: true })
      )
    ).toBeNull();
  });
});

describe('describeUndoLoss', () => {
  it('usa el singular para un paso', () => {
    const { body } = describeUndoLoss({
      documentId: 'd', documentName: 'M', lostSteps: 1, reason: 'vault-missing'
    });
    expect(body).toContain('1 undo step');
    expect(body).not.toContain('1 undo steps');
  });

  it('usa el plural para varios', () => {
    const { body } = describeUndoLoss({
      documentId: 'd', documentName: 'M', lostSteps: 5, reason: 'vault-missing'
    });
    expect(body).toContain('5 undo steps');
  });

  it('cada causa dice algo distinto', () => {
    const base = { documentId: 'd', documentName: 'M', lostSteps: 3 };
    const missing = describeUndoLoss({ ...base, reason: 'vault-missing' });
    const stale = describeUndoLoss({ ...base, reason: 'vault-stale' });
    const unavailable = describeUndoLoss({ ...base, reason: 'vault-unavailable' });

    expect(missing.body).not.toBe(stale.body);
    expect(stale.body).not.toBe(unavailable.body);
    // Las tres tranquilizan: el contenido está a salvo, lo que se perdió es
    // la vuelta atrás.
    for (const text of [missing, stale, unavailable]) {
      expect(text.body).toContain('intact');
    }
  });

  it('no inventa un número cuando no se sabe', () => {
    const { body } = describeUndoLoss({
      documentId: 'd', documentName: 'M', lostSteps: 0, reason: 'vault-missing'
    });
    expect(body).toContain('your undo history');
    expect(body).not.toContain('0 undo steps');
  });
});
