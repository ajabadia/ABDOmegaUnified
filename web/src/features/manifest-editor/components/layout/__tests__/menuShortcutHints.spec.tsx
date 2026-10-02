/**
 * @jest-environment jsdom
 */

/**
 * NINGÚN HINT DEL MENÚ PUEDE SER MENTIROSO
 *
 * `MenuItem` pinta `item.shortcut` como texto visible (menuDefinitions.ts → el
 * componente). Un hint que no dispara nada es una promesa falsa en pantalla, y
 * hay dos formas de caer en ella: anunciar un atajo que no existe, o anunciar el
 * atajo equivocado para la acción.
 *
 * Este test es COMPORTAMENTAL a propósito: no busca cadenas en el código, sino
 * que DISPARA cada combo anunciado contra los handlers de verdad y comprueba
 * que alguno responde. Un test que leyera el fuente no detectaría el segundo
 * fallo —los hints de Transform anunciaban Ctrl+Shift+C y el handler real es
 * Ctrl+Alt+C— porque las dos cadenas existen en el archivo.
 *
 * DOS REGISTROS DE TECLADO, NO UNO — CONSOLIDADOS EL 2026-10-02
 *
 * Hubo dos: `shortcutHandlers.ts` (sobre `window`) y `useWorkbenchKeyboard.ts`
 * (sobre `document`, para `Ctrl+O` y `Ctrl+K`). Como el bubbling va de document
 * a window y el segundo hacía `stopPropagation()`, la rama del primero para esos
 * dos atajos era CÓDIGO MUERTO.
 *
 * Una pasada anterior quitó el hint de `Ctrl+O` por no encontrarlo en el primer
 * registro: fue un error de búsqueda, no un hint falso. Ese error de búsqueda es
 * la razón de que este test compruebe el COMPORTAMIENTO y no la lista.
 *
 * Los dos registros ya no existen: `Ctrl+O` y `Ctrl+K` salen de
 * `DEFAULT_BINDINGS`. Este fichero se conserva porque es lo que impide que un
 * hint vuelva a mentir, y porque fija que `Ctrl+O` siga funcionando con el foco
 * en un campo de texto, como antes de la consolidación.
 *
 * Por eso `Ctrl+O` se ejercita a través del hook real y el resto a través de
 * `createHandleKeyDown`.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createHandleKeyDown, DEFAULT_BINDINGS } from '../../../hooks/shortcutHandlers';
import type { WorkbenchEditor, ShortcutCallbacks } from '../../../hooks/shortcutHandlers';
import { buildMenuItems } from '../menuDefinitions';
import { act } from 'react';

/** Dividir "Ctrl+Shift+E" en las partes que necesita un KeyboardEvent. */
function parseCombo(combo: string) {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  return {
    key,
    ctrlKey: parts.includes('ctrl'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
    metaKey: false,
  };
}

function makeEditor() {
  return {
    addLog: jest.fn<(msg: string) => void>(),
    exportManifest: jest.fn(),
    exportOmegaPack: jest.fn(),
    copyToClipboard: jest.fn(),
    cutToClipboard: jest.fn(),
    pasteFromClipboard: jest.fn(),
    undo: jest.fn<(v?: boolean) => void>(),
    redo: jest.fn<(v?: boolean) => void>(),
    groupSelected: jest.fn(),
    ungroupNode: jest.fn(),
  } as unknown as WorkbenchEditor & Record<string, jest.Mock>;
}

function makeCallbacks() {
  const c = {
    onTabFocus: jest.fn(),
    onToggleGrid: jest.fn(),
    onToggleGuides: jest.fn(),
    isLiveMode: false,
    onToggleWindow: jest.fn(),
    onOpenHelp: jest.fn(),
    onOpenAbout: jest.fn(),
    onOpenConfig: jest.fn(),
    onOpenAudit: jest.fn(),
    onReset: jest.fn(),
    onRemoveItem: jest.fn(),
    onDuplicateItem: jest.fn(),
    onSetTool: jest.fn(),
    onOpenGallery: jest.fn(),
    onToggleMiniMap: jest.fn(),
    activeTool: 'select',
    onUpdateItems: jest.fn(),
    manifest: undefined,
    onOpenNumericResize: jest.fn(),
    onOpenNumericRotate: jest.fn(),
    onCopyTransform: jest.fn(),
    onPasteTransform: jest.fn(),
    onSelectAll: jest.fn(),
    onSelectItem: jest.fn(),
    onToggleCommandPalette: jest.fn(),
    onRenameItem: jest.fn(),
    // `Ctrl+O` entró en este registro al consolidar los dos hooks de teclado.
    onLoadOmegaProject: jest.fn(),
  } as unknown as ShortcutCallbacks & Record<string, jest.Mock>;
  return c;
}

/**
 * ¿Disparó ALGUNA cosa?
 *
 * Se mira el editor, los callbacks Y `onOpenCellStudio`, que no va en
 * `callbacks` sino como cuarto argumento posicional de `createHandleKeyDown`
 * (por historia de la firma). Olvidarlo hacía que `Ctrl+Shift+E` —que abre
 * el laboratorio de celdas— pareciera un hint falso cuando funciona.
 */
function anyActivity(
  editor: Record<string, jest.Mock>,
  callbacks: Record<string, jest.Mock>,
  ...extra: Array<jest.Mock | undefined>
): boolean {
  return [...Object.values(editor), ...Object.values(callbacks), ...extra]
    .filter(Boolean)
    .some((m) => m?.mock?.calls?.length);
}



/**
 * Los hints que resuelve `shortcutHandlers.ts` (el registro grande).
 * Se listan aquí a mano porque el objetivo es que la lista sea legible: si
 * alguien añade un hint al menú, tiene que añadirlo aquí, y el test le dirá si funciona o no.
 */
const HANDLED_BY_SHORTCUT_HANDLERS = [
  'Ctrl+S',      // OmegaPack export
  'Ctrl+Z',      // undo
  'Ctrl+Y',      // redo
  'Ctrl+C',      // copy
  'Ctrl+X',      // cut
  'Ctrl+V',      // paste
  'Ctrl+Alt+R',  // numeric resize
  'Ctrl+Alt+T',  // numeric rotate
  'Ctrl+Alt+C',  // copy transform
  'Ctrl+Alt+V',  // paste transform
  'Ctrl+Shift+E',// universal cell laboratory
  'Ctrl+Shift+R',// reset workspace
  'Ctrl+Shift+L',// layers window
  'Ctrl+Shift+M',// mini map
  'Ctrl+Shift+A',// compliance window
  'Ctrl+O',      // open .omega project
  'Ctrl+K',      // command palette
] as const;

describe('menu shortcut hints — behavioural', () => {
  let editor: ReturnType<typeof makeEditor>;
  let callbacks: ReturnType<typeof makeCallbacks>;
  let handleKeyDown: (e: KeyboardEvent) => void;
  let onOpenCellStudio: jest.Mock;
  let onLoadOmegaProject: jest.Mock;

  beforeEach(() => {
    editor = makeEditor();
    callbacks = makeCallbacks();
    onOpenCellStudio = jest.fn();
    onLoadOmegaProject = jest.fn();
    handleKeyDown = createHandleKeyDown(
      editor,
      // Un id seleccionado: sin selección, varias acciones (copiar, cortar,
      // renombrar) se auto-desactivan y el testaría por la razón equivocada.
      'node-1',
      undefined,
      onOpenCellStudio,
      callbacks,
      undefined
    );
  });



  it.each(HANDLED_BY_SHORTCUT_HANDLERS)('%s really dispatches something', (combo) => {
    const event = new KeyboardEvent('keydown', {
      ...parseCombo(combo),
      bubbles: true,
      cancelable: true,
    });
    act(() => handleKeyDown(event));
    expect(anyActivity(editor, callbacks, onOpenCellStudio)).toBe(true);
  });

  it('Ctrl+O really opens the .omega picker', () => {
    // Antes vivía en un SEGUNDO registro (`useWorkbenchKeyboard`, montado sobre
    // `document`) mientras este escuchaba sobre `window`. Como el bubbling va de
    // document a window y aquel hacía `stopPropagation()`, la rama de este
    // registro para Ctrl+O y Ctrl+K era CÓDIGO MUERTO: no podía dispararse.
    //
    // Ahora ambos atajos salen del mismo registro, y por eso este test vuelve
    // a ser una simple comprobación sobre `handleKeyDown`.
    const handleKeyDown = createHandleKeyDown(
      editor,
      'node-1',
      undefined,
      jest.fn(),
      { ...callbacks, onLoadOmegaProject: onLoadOmegaProject },
      undefined
    );

    act(() => {
      handleKeyDown(
        new KeyboardEvent('keydown', { key: 'o', ctrlKey: true, bubbles: true, cancelable: true })
      );
    });

    expect(onLoadOmegaProject).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+K opens the command palette exactly once', () => {
    // `toHaveBeenCalledTimes(1)` y no `toHaveBeenCalled()` a propósito: con dos
    // registros, los dos toggles caían sobre el mismo estado y la paleta se
    // abría y cerraba en el mismo tick. El síntoma era "no se abre", que es
    // indistinguible de "el atajo está roto".
    const handleKeyDown = createHandleKeyDown(
      editor,
      'node-1',
      undefined,
      jest.fn(),
      callbacks,
      undefined
    );

    act(() => {
      handleKeyDown(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })
      );
    });

    expect(callbacks.onToggleCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+O funciona aunque el foco esté en un campo de texto', () => {
    // El registro anterior NO tenía guard de input. Si este test falla, alguien
    // ha introducido un cambio de comportamiento al consolidar, no un bug nuevo.
    document.body.innerHTML = '<input id="campo" />';
    const input = document.getElementById('campo') as HTMLInputElement;
    input.focus();

    const handleKeyDown = createHandleKeyDown(
      editor,
      'node-1',
      undefined,
      jest.fn(),
      { ...callbacks, onLoadOmegaProject: onLoadOmegaProject },
      undefined
    );

    act(() => {
      handleKeyDown(
        new KeyboardEvent('keydown', { key: 'o', ctrlKey: true, bubbles: true, cancelable: true })
      );
    });

    expect(onLoadOmegaProject).toHaveBeenCalledTimes(1);
    document.body.innerHTML = '';
  });
});

describe('the menu only advertises combos that work', () => {
  /**
   * ESTE es el test que cierra el bucle.
   *
   * Los de arriba demuestran que ciertos combos FUNCIONAN. Este demuestra que
   * el menú anuncia exactamente esos y nada más. Sin él, cambiar el hint de
   * Copy Transform a `Ctrl+Shift+C` dejaría la suite en verde: el test
   * comprueba que `Ctrl+Alt+C` funciona, pero no que sea lo que el menú dice.
   *
   * El fallo real que corrige este archivo —hint de `Ctrl+Shift+C` que
   * disparaba otra cosa— es exactamente de esa clase: el combo anunciado
   * existía en el archivo, así que un test que leyera cadenas no lo habría
   * visto. Por eso se cruza la lista del menú contra la lista de combos
   * verificados arriba.
   */
  const VERIFIED_COMBOS = new Set<string>(HANDLED_BY_SHORTCUT_HANDLERS);

  function collectShortcuts(
  items: unknown,
  out: Array<{ label: string; shortcut?: string | undefined }> = []
) {
    if (!items || typeof items !== 'object') return out;
    if (Array.isArray(items)) {
      for (const item of items) collectShortcuts(item, out);
      return out;
    }
    const entry = items as { label?: string; shortcut?: string; submenu?: unknown; items?: unknown };
    // Se recogen TODOS los ítems con etiqueta, no solo los que tienen atajo:
    // New Document va deliberadamente sin hint, y un recorrido que lo
    // filtrara no podría ni comprobar que no lo tiene.
    if (typeof entry.label === 'string') {
      out.push({ label: entry.label, shortcut: entry.shortcut });
    }
    collectShortcuts(entry.submenu, out);
    collectShortcuts(entry.items, out);
    return out;
  }

  it('every advertised hint is one of the verified combos', () => {
    const categories = buildMenuItems({} as never);
    const advertised = collectShortcuts(categories);

    // Si esto está vacío, el recorrido se ha roto y el test pasa por
    // vacuidad, que es la peor forma de pasar.
    expect(advertised.length).toBeGreaterThan(10);

    // Nota: el `expect` de `@jest/globals` no admite segundo argumento, así que
    // el detalle va dentro del valor esperado para que el fallo sea legible.
    const bogus = advertised
      .filter((a) => a.shortcut && !VERIFIED_COMBOS.has(a.shortcut))
      .map((b) => `${b.label} → ${b.shortcut}`);
    expect(bogus).toEqual([]);
  });

  it('New Document advertises no shortcut at all', () => {
    const categories = buildMenuItems({} as never);
    const advertised = collectShortcuts(categories);
    const newDoc = advertised.find((a) => a.label === 'New Document');

    expect(newDoc).toBeDefined();
    // `Ctrl+N` está reservado por el navegador: aunque tuviera handler no
    // llegaría a la página. Cero hint es lo único honesto.
    expect(newDoc!.shortcut).toBeUndefined();
  });
});

describe('shortcut hints that must NOT exist', () => {
  let editor: ReturnType<typeof makeEditor>;
  let callbacks: ReturnType<typeof makeCallbacks>;
  let handleKeyDown: (e: KeyboardEvent) => void;

  beforeEach(() => {
    editor = makeEditor();
    callbacks = makeCallbacks();
    handleKeyDown = createHandleKeyDown(editor, 'node-1', undefined, jest.fn(), callbacks, undefined);
  });

  it('Ctrl+N does nothing — no handler exists and the browser reserves it', () => {
    // Chrome y Firefox abren una ventana nueva con Ctrl+N y nunca lo envían a
    // la página. Aunque un handler existiera no podría funcionar, así que el
    // hint se quitó en vez de cablearse. Este test fija esa decisión: si algún
    // día alguien añade un handler, el test falla y obliga a replantear el hint.
    const event = new KeyboardEvent('keydown', {
      key: 'n', ctrlKey: true, bubbles: true, cancelable: true,
    });
    act(() => handleKeyDown(event));

    expect(anyActivity(editor, callbacks)).toBe(false);
    expect(DEFAULT_BINDINGS).not.toHaveProperty('new_document');
  });

  it('Ctrl+Shift+C does NOT copy transform — it belongs to the window map', () => {
    // Regresión del hint equivocado: se anunciaba Ctrl+Shift+C y ese combo lo
    // captura el bloque de paneles (línea ~258), que corre ANTES que el handler
    // de transformación. No copiaba: abría una ventana.
    const event = new KeyboardEvent('keydown', {
      key: 'c', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
    });
    act(() => handleKeyDown(event));

    expect(callbacks.onCopyTransform).not.toHaveBeenCalled();
    // Lo que hace de verdad es abrir el panel de logs.
    expect(callbacks.onToggleWindow).toHaveBeenCalledWith('window_logs');
  });

  it('Ctrl+Shift+V does NOT paste transform', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'v', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
    });
    act(() => handleKeyDown(event));

    expect(callbacks.onPasteTransform).not.toHaveBeenCalled();
  });
});
