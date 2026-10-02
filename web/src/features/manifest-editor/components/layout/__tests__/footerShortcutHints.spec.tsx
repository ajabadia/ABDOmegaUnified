/**
 * @jest-environment jsdom
 *
 * @purpose Comprueba que cada tooltip de atajo del WorkbenchFooter anuncia un combo que realmente dispara algo.
 * @purpose_en Checks that every keyboard-shortcut tooltip in WorkbenchFooter advertises a combo that really dispatches something.
 *
 * POR QUÉ ESTE TEST, CUANDO YA HAY OTRO DE HINTS
 * ----------------------------------------------
 * `menuShortcutHints.spec.ts` verifica los hints del MENÚ. Los TOOLTIPS del
 * footer son otra superficie de promesa, y no la cubría nadie.
 *
 * No es teórico: el footer anunciaba `Redo (Ctrl+Shift+Z)` cuando el binding
 * real era `ctrl+y` y `ctrl+shift+z` no aparecía en ningún handler del repo.
 * Un tooltip que promete un atajo inexistente es peor que no tener tooltip:
 * el usuario pulsa, no pasa nada, y deduce que la función está rota.
 *
 * El patrón es el del spec del menú, con dos diferencias que importan:
 *   1. La lista NO está escrita a mano: se extrae del propio componente, así
 *      que un tooltip nuevo queda cubierto sin tocar este fichero.
 *   2. Cada combo se dispara de verdad contra los dos registros de teclado.
 *
 * Si los tooltips anuncian algo que no funciona, este test dice exactamente
 * QUÉ TOOLTIP y QUÉ COMBO, que es lo que hace falta para arreglarlo.
 */

import fs from 'fs';
import path from 'path';
import { act } from 'react';
import {
  createHandleKeyDown,
  type WorkbenchEditor,
  type ShortcutCallbacks,
} from '../../../hooks/shortcutHandlers';


const FOOTER_FILE = path.resolve(__dirname, '../WorkbenchFooter.tsx');

/** Extrae los tooltips con atajo: "Algo (Ctrl+Shift+M)" → "Ctrl+Shift+M". */
function readFooterTooltipCombos(): string[] {
  const source = fs.readFileSync(FOOTER_FILE, 'utf8');
  const matches = source.matchAll(/title="[^"]*?\((Ctrl[^)]*)\)/g);
  return Array.from(matches, (m) => m[1].replace(/\s+/g, ''));
}

/**
 * Extrae los CHIPS de tecla visibles: `keys={['Ctrl','Shift','Z']}`.
 *
 * Estos importan más que el `title`: son lo que el usuario LEE en pantalla. El
 * bug que motivó este test vivía aquí, no en el tooltip — el badge de Redo
 * mostraba Ctrl+Shift+Z mientras el `title` decía otra cosa, y el atajo
 * anunciado no estaba enlazado a nada.
 */
function readFooterVisibleKeyChips(): string[] {
  const source = fs.readFileSync(FOOTER_FILE, 'utf8');
  const out: string[] = [];
  const blockRe = /keys=\{(\[[^\]]*\])\}[\s\S]{0,260}?title="([^"]*)"/g;
  for (const m of source.matchAll(blockRe)) {
    const keys = Array.from(m[1].matchAll(/'([^']+)'/g), (k) => k[1]);
    if (!keys.length || !keys[0].startsWith('Ctrl')) continue;
    out.push(keys.join('+'));
  }
  return out;
}

function parseCombo(combo: string) {
  const parts = combo.toLowerCase().split('+');
  return {
    key: parts[parts.length - 1],
    ctrlKey: parts.includes('ctrl'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
    metaKey: false,
  };
}

function makeEditor() {
  return {
    addLog: jest.fn(),
    exportManifest: jest.fn(),
    exportOmegaPack: jest.fn(),
    copyToClipboard: jest.fn(),
    cutToClipboard: jest.fn(),
    pasteFromClipboard: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    groupSelected: jest.fn(),
    ungroupNode: jest.fn(),
  } as unknown as WorkbenchEditor & Record<string, jest.Mock>;
}

function makeCallbacks() {
  return {
    onTabFocus: jest.fn(),
    onToggleMiniMap: jest.fn(),
    onToggleWindow: jest.fn(),
    onOpenConfig: jest.fn(),
    onReset: jest.fn(),
    onSelectAll: jest.fn(),
    onToggleCommandPalette: jest.fn(),
  } as unknown as ShortcutCallbacks & Record<string, jest.Mock>;
}

function anyActivity(
  editor: Record<string, jest.Mock>,
  callbacks: Record<string, jest.Mock>,
  ...extra: Array<jest.Mock | undefined>
): boolean {
  return [...Object.values(editor), ...Object.values(callbacks), ...extra]
    .filter(Boolean)
    .some((m) => m?.mock?.calls?.length);
}

describe('WorkbenchFooter — los tooltips anuncian atajos que existen', () => {
  const combos = readFooterTooltipCombos();

  // Si el extractor se rompe y devuelve cero, todo lo de abajo pasaría por
  // vacuidad, que es la peor forma de pasar.
  it('encuentra los tooltips con atajo del footer', () => {
    expect(combos.length).toBeGreaterThan(5);
  });

  it.each(combos)('%s hace algo de verdad', (combo) => {
    const editor = makeEditor();
    const callbacks = makeCallbacks();
    const handleKeyDown = createHandleKeyDown(
      editor,
      'node-1',
      undefined,
      jest.fn(),
      callbacks,
      undefined
    );

    const event = new KeyboardEvent('keydown', {
      ...parseCombo(combo),
      bubbles: true,
      cancelable: true,
    });
    act(() => handleKeyDown(event));

    // Ya no hay segundo registro al que recurrir: `Ctrl+K` y `Ctrl+O` salen
    // de `DEFAULT_BINDINGS` y pasan por aquí. Si un tooltip no hace nada, es
    // que el tooltip miente.
    // El detalle va DENTRO del valor esperado: el `expect` de `@jest/globals`
    // no admite segundo argumento.
    expect([`tooltip="${combo}"`, anyActivity(editor, callbacks)]).toEqual([
      `tooltip="${combo}"`,
      true,
    ]);
  });
});

describe('WorkbenchFooter — el caso concreto que se corrigió', () => {
  it('Redo anuncia Ctrl+Y, que es el binding real', () => {
    // Este test es el que habría atrapado el bug original. Se mantiene
    // explícito y no solo implícito en el barrido anterior, porque si alguien
    // vuelve a cambiar el tooltip este fallo debe ser legible de un vistazo.
    const combos = readFooterTooltipCombos();
    expect(combos).toContain('Ctrl+Y');
    expect(combos).not.toContain('Ctrl+Shift+Z');
  });

  it('los CHIPS visibles de Redo dicen Ctrl+Y, no el atajo inexistente', () => {
    // Esta es la mitad que faltaba. El badge mostraba Ctrl+Shift+Z como teclas
    // visibles: eso es lo que el usuario lee y replica. Un chip que promete un
    // atajo sin handler hace que pulsar Redo parezca una función rota.
    const chips = readFooterVisibleKeyChips();
    expect(chips).toContain('Ctrl+Y');
    expect(chips).not.toContain('Ctrl+Shift+Z');
  });

  it('Ctrl+Shift+Z realmente no está enlazado a redo', () => {
    // La otra mitad de la historia: el combo no solo estaba mal anunciado,
    // es que no hacía nada. Si alguien lo enlaza de verdad en el futuro, este
    // test falla y leRemember que hay que actualizar el tooltip.
    const editor = makeEditor();
    const handleKeyDown = createHandleKeyDown(
      editor,
      'node-1',
      undefined,
      jest.fn(),
      makeCallbacks(),
      undefined
    );
    act(() => {
      handleKeyDown(
        new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(editor.redo).not.toHaveBeenCalled();
    expect(editor.undo).not.toHaveBeenCalled();
  });
});