/**
 * OMEGA - Runtime Verification: GlobalFxStrip renders 5 FX sliders from initial getState.
 *
 * Carga la UI REAL del host (host/ui/index.html + bundle.js servidos en
 * http://127.0.0.1:8321) en Chromium y verifica que el strip se renderiza
 * DESDE EL getState INICIAL, inyectando el estado por la ruta real del bridge:
 *   window.handleOmegaMessage(state) → OmegaRPC → omega:state → RuntimeEventHub
 *   → runtimeStore → GlobalFxStrip.syncFromStore → 5 sliders.
 *
 * Uso: node scripts/verify_global_fx_runtime.mjs   (desde web/, donde está playwright)
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8321/index.html';

const PATCH_WITH_FX = {
  name: 'Runtime Verify',
  author: 'e2e',
  masterGainDb: 0,
  modules: [],
  patchbayMatrix: [],
  globalFxParams: {
    '200': 0.75, // Mix
    '201': 0.25, // Feedback
    '202': 0.5,  // Time
    '203': 0.1,  // Speed
    '204': 0.9,  // Intensity
  },
};

const STATE_PAYLOAD = {
  schemaVersion: '7.0',
  patch: PATCH_WITH_FX,
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

try {
  await page.goto(BASE, { waitUntil: 'load' });
  // Esperar a que bundle.js se cargue y ancle los singletons
  await page.waitForFunction(() => {
    return !!(window.omegaRPC && window.runtimeStore && window.GlobalFxStrip && window.handleOmegaMessage);
  }, null, { timeout: 10000 });

  // 1) Anclajes del bundle
  const anchors = await page.evaluate(() => ({
    omegaRPC: typeof window.omegaRPC,
    runtimeStore: typeof window.runtimeStore,
    GlobalFxStrip: typeof window.GlobalFxStrip,
    handleOmegaMessage: typeof window.handleOmegaMessage,
    RuntimeEventHub: typeof window.RuntimeEventHub,
  }));
  console.log('[1] ANCLAJES:', JSON.stringify(anchors));

  // 2) Inicializar el hub si no lo hizo DOMContentLoaded
  await page.evaluate(() => {
    if (window.RuntimeEventHub && typeof window.RuntimeEventHub.init === 'function') {
      window.RuntimeEventHub.init();
    }
  });

  // 3) Inyectar el estado inicial por la ruta REAL del bridge
  await page.evaluate((payload) => {
    window.handleOmegaMessage(JSON.stringify({ type: 'state', payload }));
  }, STATE_PAYLOAD);

  // Esperar al sync (store.notify → subscribe → syncFromStore)
  await page.waitForFunction(() => {
    return document.querySelectorAll('.global-fx-slider').length === 5;
  }, null, { timeout: 3000 });
  await page.waitForTimeout(300);

  // 4) Conteo y valores
  const result = await page.evaluate(() => {
    const sliders = Array.from(document.querySelectorAll('.global-fx-slider'));
    const values = sliders.map((s) => ({ id: s.dataset.fxId, value: s.value }));
    return {
      sliderCount: sliders.length,
      title: document.querySelector('.global-fx-title')?.textContent ?? null,
      values,
      label200: document.querySelector('.global-fx-value[data-fx-id="200"]')?.textContent ?? null,
    };
  });
  console.log('[2] SLIDERS:', JSON.stringify(result, null, 2));

  // 5) Aserciones
  const ok = result.sliderCount === 5
    && result.values.some((v) => v.id === '200' && v.value === '0.75')
    && result.values.some((v) => v.id === '201' && v.value === '0.25')
    && result.values.some((v) => v.id === '202' && v.value === '0.5')
    && result.values.some((v) => v.id === '203' && v.value === '0.1')
    && result.values.some((v) => v.id === '204' && v.value === '0.9')
    && result.label200 === '75%';

  // Screenshot del strip para inspección visual
  await page.locator('#global-fx-strip').screenshot({ path: '/tmp/global-fx-strip-runtime.png' });
  console.log('[3] Screenshot: /tmp/global-fx-strip-runtime.png');

  console.log(`[4] RESULTADO: ${ok ? 'PASS ✅ (5 sliders desde el getState inicial)' : 'FAIL ❌'}`);
  if (consoleErrors.length) {
    console.log('[5] CONSOLE ERRORS:');
    consoleErrors.slice(0, 10).forEach((e) => console.log('   -', e.slice(0, 300)));
  } else {
    console.log('[5] CONSOLE ERRORS: ninguno');
  }

  await browser.close();
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error('ERROR:', err.message);
  await browser.close();
  process.exit(1);
}
