/**
 * @purpose Aísla el sombreado de listeners: ¿un `stopPropagation` en document impide que el handler de window corra?
 * @purpose_en Isolates listener shadowing: does a `stopPropagation` on document prevent the window handler from running?
 *
 * Cada escenario usa un JSDOM NUEVO. Compartir un `window` entre escenarios
 * acumula listeners y hace que el segundo caso herede el estado del primero —
 * el primer borrador de este script tenía exactamente ese defecto y por eso
 * ambos escenarios daban 0. Con un documento limpio por caso, la comparación
 * sí es válida.
 *
 * CÓMO EJECUTARLO
 *   node scripts/probe-shortcut-shadowing.cjs
 */

'use strict';

const { JSDOM } = require('jsdom');

function run({ stopPropagation }) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const { window } = dom;
  const calls = { document: 0, window: 0 };

  window.addEventListener('keydown', () => calls.window++);
  window.document.addEventListener('keydown', (e) => {
    calls.document++;
    if (stopPropagation) e.stopPropagation();
  });

  window.document.body.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })
  );

  return calls;
}

const conStop = run({ stopPropagation: true });
const sinStop = run({ stopPropagation: false });

console.log('Aislamiento del sombreado de handlers de teclado\n');
console.log('  CON stopPropagation en document:');
console.log(`    document: ${conStop.document}   window: ${conStop.window}`);
console.log('  SIN stopPropagation en document:');
console.log(`    document: ${sinStop.document}   window: ${sinStop.window}`);
console.log('');

const arnesValido = sinStop.window > 0 && conStop.window === 0;
console.log('  ¿El arnés discrimina los dos casos?', arnesValido ? 'SÍ' : 'NO — la medición no vale');

if (arnesValido) {
  console.log('');
  console.log('  Confirmado: `useWorkbenchKeyboard` (documento) se ejecuta antes y su');
  console.log('  `stopPropagation` impide que el evento llegue a `useWorkbenchShortcuts`');
  console.log('  (window). Para Ctrl+K y Ctrl+O, la rama del registro grande nunca corre.');
  console.log('');
  console.log('  Es decir: `command_palette` en DEFAULT_BINDINGS y su `case` en');
  console.log('  createHandleKeyDown son código muerto. Ctrl+K funciona por el registro');
  console.log('  pequeño, y por el orden de listeners, no por diseño.');
} else {
  console.log('');
  console.log('  La medición NO demuestra nada. No usar estos números para reportar.');
}