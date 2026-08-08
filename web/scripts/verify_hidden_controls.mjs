/**
 * verify_hidden_controls.mjs — Verifica que los controles `component: hidden`
 * del 440demo (amplitude/led_rate) no rompen el renderer React:
 *   1. /en/player — el panel 440 DEMO renderiza (switch/LED/port) sin crash.
 *   2. /en/editor?module=440demo — el workbench carga sin crash.
 * En ambos, 0 errores de consola (especialmente de render/parseo).
 *
 * Uso: node scripts/verify_hidden_controls.mjs   (requiere el server en :6789)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:6789';
let failures = 0;

function report(name, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

console.log('=== verify_hidden_controls.mjs ===');
const browser = await chromium.launch({ headless: true });

for (const { url, name, expectText } of [
  { url: '/en/player', name: 'player', expectText: '440 DEMO' },
  { url: '/en/editor?module=440demo', name: 'editor', expectText: '440 DEMO' },
]) {
  console.log(`\n--- ${name}: ${url} ---`);
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));

  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Espera a que el contenido dinámico aparezca (client-rendered).
    await page.waitForTimeout(6000);

    const bodyText = await page.evaluate(() => document.body.innerText || '');
    report(`${name}: página carga (texto visible)`, bodyText.length > 50, `${bodyText.length} chars`);
    report(`${name}: módulo 440 DEMO presente`, bodyText.includes('440 DEMO') || bodyText.includes('440demo'));

    // Errores de consola: ignorar el websocket del watchdog (ruido pre-existente).
    const realErrors = errors.filter((e) => !e.includes('ws://localhost:8081') && !e.includes('ERR_CONNECTION_REFUSED'));
    report(`${name}: 0 errores de consola`, realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
  } catch (e) {
    report(`${name}: navegación falló`, false, String(e).slice(0, 200));
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\n=== ${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} fallo(s) ===`);
process.exit(failures === 0 ? 0 : 1);
