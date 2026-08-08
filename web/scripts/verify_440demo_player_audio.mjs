/**
 * OMEGA - Runtime Verification: botón 'START AUDIO WORKLET' del player con el
 * wasm REAL del 440demo vía AudioWorklet.
 *
 * Verifica la cadena completa en Chromium (headless) contra el dev server:
 *   clic START → AudioContext + addModule('/worklets/tone440.worklet.js')
 *   → el worklet hace fetch('/wasm/440demo.wasm') y lo instancia (omega_init)
 *   → postea {type:'ready'} → badge '🔊 440 Hz WASM LIVE' en el header.
 *   El tono (440 Hz, switch ON) se emite por el nodo al destino; el DSP está
 *   verificado por separado en scripts/verify_440demo_runtime.mjs (11/11).
 *
 * Uso: node scripts/verify_440demo_player_audio.mjs   (desde web/, con el dev server en :6789)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:6789/en/player';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

const startBtn = () => page.getByRole('button', { name: /START AUDIO WORKLET/ });
const pauseBtn = () => page.getByRole('button', { name: /PAUSE AUDIO/ });
const liveBadge = () => page.getByText('440 Hz WASM LIVE');

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  await page.goto(BASE, { waitUntil: 'load' });
  await startBtn().waitFor({ timeout: 20000 });
  console.log('=== verify_440demo_player_audio.mjs ===');
  console.log('player cargado (client-rendered)');

  // 1) START → worklet + wasm real
  await startBtn().click();
  await liveBadge().waitFor({ timeout: 20000 });
  check('START → badge "440 Hz WASM LIVE" (worklet + 440demo.wasm corriendo)', true);
  check('botón pasa a PAUSE AUDIO', (await pauseBtn().count()) === 1);

  // 2) PAUSE → grafo de audio cerrado
  await pauseBtn().click();
  await page.waitForTimeout(600);
  check('tras PAUSE: badge desaparece', (await liveBadge().count()) === 0);
  check('tras PAUSE: botón vuelve a START', (await startBtn().count()) === 1);

  // 3) Reinicio
  await startBtn().click();
  await liveBadge().waitFor({ timeout: 20000 });
  check('reinicio → badge LIVE de nuevo', true);

  // Errores de consola (ignorando el watchdog 8081, ajeno al player)
  const relevant = consoleErrors.filter((e) => !e.includes('8081'));
  check('0 errores de consola (sin watchdog)', relevant.length === 0, relevant.slice(0, 3).join(' | '));

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n=== ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed.length}/${checks.length} checks ===`);
  await browser.close();
  process.exit(failed.length === 0 ? 0 : 1);
} catch (err) {
  console.error('ERROR:', err.message);
  if (consoleErrors.length) console.log('CONSOLE ERRORS:', consoleErrors.join(' | '));
  await browser.close();
  process.exit(1);
}
