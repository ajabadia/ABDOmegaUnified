import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';

/**
 * OMEGA — Atajos de teclado E2E: lo que el menú promete vs. lo que el navegador hace
 *
 * POR QUÉ ESTE FICHERO, CUANDO YA HAY UN TEST UNITARIO
 * -----------------------------------------------------
 * `menuShortcutHints.spec.ts` dispara los atajos contra los manejadores en un
 * entorno de test. Aquí ocurre algo que ninguna suite de Jest puede
 * reproducir: **son atajos de verdad, en un navegador de verdad**, con la
 * jerarquía de eventos real — y dos registros en cuanto se duplique el
 * manejo de un mismo atajo.
 *
 * HUBO DOS REGISTROS. CONSOLIDADOS EL 2026-10-02.
 *
 *   useWorkbenchShortcuts → window.addEventListener('keydown', …)
 *   useWorkbenchKeyboard  → document.addEventListener('keydown', …)
 *
 * En el burbujeo `document` va antes que `window`, y el handler de document
 * llamaba a `stopPropagation()`, así que la rama del registro grande para
 * `Ctrl+K` y `Ctrl+O` **nunca se ejecutaba**: era código muerto. Medido en
 * jsdom (`scripts/probe-shortcut-shadowing.cjs`): con stopPropagation el
 * handler de window recibía 0 invocaciones; sin él, 1.
 *
 * Los dos registros ya no existen. Estos tests siguen aquí porque vigilan el
 * fallo concreto que pueden volver: si alguien reintroduce un segundo
 * registro sobre el mismo estado, los dos toggles se anulan, la paleta no
 * aparece nunca y el síntoma —"el atajo está roto"— es indistinguible de un
 * fallo real. Estos tests hacen que ese escenario falle ruidosamente.
 */

/** Suelta el foco para que los guards de `isInputFocused` no corten el atajo. */
async function blurAll(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(150);
}

/**
 * Cuántos paneles del dock están abiertos.
 *
 * Cada `DockPanelHeader` renderiza exactamente un icono X de lucide, así que
 * contar esos iconos cuenta paneles abiertos. Es un anclaje al DOM real, no a
 * un `data-testid` inventado.
 */
async function openDockPanels(page: Page): Promise<number> {
  return page.locator('svg.lucide-x').count();
}

test.describe('Atajos del workbench — lo que el menú promete', () => {
  test.beforeEach(async ({ rackPage }) => {
    await blurAll(rackPage);
  });

  // ─── Ctrl+O: el selector de ficheros ────────────────────────────────
  //
  // Este es el test con más valor. `Ctrl+O` vive en el registro pequeño, y
  // durante un tiempo estuvo ALSO en el grande: si algún día vuelve a estar en
  // los dos, se abrirían DOS selectores. Un usuario solo ve que el diálogo
  // parpadea; un test lo cuenta.

  test('Ctrl+O abre exactamente UN selector de ficheros', async ({ rackPage }) => {
    let choosers = 0;
    rackPage.on('filechooser', () => { choosers++; });

    await rackPage.keyboard.press('Control+o');
    await rackPage.waitForTimeout(1200);

    // No se puede afirmar sobre un evento que Playwright no puedepencer:
    // si no hay `accept`, Chromium no emite `filechooser` y el contador
    // queda en 0 aunque no pase nada. Por eso el contra-testar de abajo es
    // imprescindible: 0 no es "funcionó", 0 es "no hay evidencia".
    expect(choosers, 'Ctrl+O debe abrir el selector de ficheros').toBe(1);
  });

  // ─── Ctrl+K: la paleta de comandos ──────────────────────────────────
  //
  // El riesgo aquí es el DOBLE TOGGLE. Las dos ramas escriben sobre
  // `setIsCommandPaletteOpen(prev => !prev)`. Si someday ambas se ejecutan,
  // la paleta se abre y se cierra en el mismo tick y no aparece nunca.

  test('Ctrl+K abre la paleta de comandos exactamente una vez', async ({ rackPage }) => {
    await rackPage.keyboard.press('Control+k');
    await expect(
      rackPage.locator('input[placeholder="Search nodes and actions..."]')
    ).toBeVisible({ timeout: 3000 });

    await rackPage.keyboard.press('Escape');
    await rackPage.waitForTimeout(400);
  });

  // ─── Ctrl+Shift+L / Ctrl+Shift+A: ventanas del dock ─────────────────
  //
  // Se mide una DIFERENCIA, no un estado absoluto: el test no sabe (ni debe
  // saber) qué paneles vienen abiertos por defecto. Si el estado inicial
  // cambia mañana, el test sigue siendo válido.

  test('Ctrl+Shift+L alterna el panel de Layers', async ({ rackPage }) => {
    const before = await openDockPanels(rackPage);

    await rackPage.keyboard.press('Control+Shift+L');
    await rackPage.waitForTimeout(600);
    const afterOpen = await openDockPanels(rackPage);

    await rackPage.keyboard.press('Control+Shift+L');
    await rackPage.waitForTimeout(600);
    const afterClose = await openDockPanels(rackPage);

    expect(afterOpen, 'Ctrl+Shift+L debe abrir Layers').not.toBe(before);
    expect(afterClose, 'Ctrl+Shift+L debe volver al estado inicial').toBe(before);
  });

  test('Ctrl+Shift+A abre el panel de Compliance', async ({ rackPage }) => {
    const before = await openDockPanels(rackPage);

    await rackPage.keyboard.press('Control+Shift+A');
    await rackPage.waitForTimeout(600);

    expect(await openDockPanels(rackPage)).not.toBe(before);
  });

  // ─── Ctrl+Shift+C: el combo que SOLÍA estar mal dirigido ─────────────
  //
  // El menú anuncia Ctrl+Alt+C para Copy Transform. Una versión anterior
  // anunciaba Ctrl+Shift+C, que en realidad cae en el mapa de ventanas y abre
  // los logs. Este test fija que los dos combos siguen siendo distintos.

  test('Ctrl+Shift+C abre los logs, NO Copy Transform', async ({ rackPage }) => {
    const before = await openDockPanels(rackPage);

    await rackPage.keyboard.press('Control+Shift+c');
    await rackPage.waitForTimeout(600);
    const afterLogs = await openDockPanels(rackPage);

    // `c` está mapeado a window_logs en el mapa de ventanas, así que el conteo
    // de paneles DEBE cambiar. Si algún día `c` deja de abrir nada, este test
    // falla y avisa de que el mapa de ventanas cambió.
    expect(afterLogs, 'Ctrl+Shift+C pertenece al mapa de ventanas (logs)').not.toBe(before);
  });
});

test.describe('Atajos que el menú NO promete', () => {
  // La trampa de la honestidad del menú: si un atajo no funciona, lo correcto
  // es no anunciarlo. Este test blinda la decisión Taken al quitar el hint.

  test('Ctrl+N no crea ningún documento nuevo', async ({ rackPage }) => {
    const tabsBefore = await rackPage.locator('[role="tab"]').count();

    await blurAll(rackPage);
    await rackPage.keyboard.press('Control+n');
    await rackPage.waitForTimeout(800);

    const tabsAfter = await rackPage.locator('[role="tab"]').count();
    expect(tabsAfter, 'Ctrl+N está reservado por el navegador y no debe crear documentos').toBe(tabsBefore);
  });
});