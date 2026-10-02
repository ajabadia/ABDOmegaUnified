import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoWorkbench, switchView, type EditorView } from './helpers/navigation';

/**
 * OMEGA ERA 9.2.0 — INDUSTRIAL SMOKE TEST SUITE
 * Validates core industrialization features.
 *
 * =============================================================================
 * POR QUÉ ESTE FICHERO CAMBIÓ DE FORMA (y por qué ya no se "rinde")
 * =============================================================================
 * Antes, cinco de estos tests envolvían su comprobación central en
 *
 *     try { await expect(x).toBe(...) } catch { console.log('...') }
 *
 * Un `console.log` en un `catch` NO es un fallo: el test daba verde tanto si
 * la cosa funcionaba como si no. Con tres de ellos así, la suite premiaba
 * seguir rota.
 *
 * La causa de fondo era doble, y las dos se midieron:
 *
 *  1. `@monaco-editor/loader` se llevaba el editor a
 *     `cdn.jsdelivr.net` porque nadie llamaba a `loader.config`. La vista de
 *     código no cargaba. Arreglado en `src/lib/monaco/configureMonacoLoader.ts`.
 *
 *  2. Aun con el editor cargado, los tests escribían con
 *     `monaco.editor.getModels()[0].setValue(...)`. Medido: hay DOS modelos,
 *     `inmemory://model/1` (vacío, el que crea `<Editor>` por su cuenta y queda
 *     DESPUÉS de que `handleMount` lo sustituya) y
 *     `file:///omega/<doc>/<tab>.json` (el que está en pantalla). El `[0]` es el
 *     equivocado: el texto se escribía en un modelo que nadie miraba, así que
 *     la app nunca se enteraba y el indicador de "cambios sin guardar" no
 *     aparecía jamás. La culpa era del test, no de la aplicación.
 *
 * Ahora los tests TECLEAN, como una persona, y afirman lo que deben.
 * Lo que se ha medido que NO funciona va marcado `test.fixme` con el motivo
 * escrito: sale como "fixme" en el informe, nunca como verde.
 */

// Cargar Monaco son ~16 MB desde /monaco/vs: el arranque de la vista de código
// se acerca a los 20 s. Con el 30 s por defecto, tests que antes pasaban
// rozando el límite ahora se caían por timeout sin decir por qué.
test.describe.configure({ timeout: 90_000 });

/** Selector del indicador de cambios sin guardar de la barra de pestañas. */
const DIRTY_INDICATOR = '[title="Unsaved changes"]';

/**
 * Forma del modelo de Monaco que está EN PANTALLA, tal y como lo ve la pagina.
 *
 * No usar `getModels()[0]`: es `inmemory://model/1`, un modelo huerfano que
 * `<Editor>` crea antes de que `handleMount` lo sustituya por el del manifiesto.
 * Ver la cabecera de este fichero.
 */
interface MonacoModelInPage {
  uri: { toString: () => string };
  getValue: () => string;
}

interface MonacoInPage {
  monaco?: { editor?: { getModels: () => MonacoModelInPage[] } };
}

/** Lee de la pagina el modelo de Monaco en uso, o `null` si aun no hay ninguno. */
function readModelInUse(page: Page): Promise<MonacoModelInPage | null> {
  return page.evaluate(() => {
    const models = (window as unknown as MonacoInPage).monaco?.editor?.getModels() ?? [];
    return models.find((m) => m.uri.toString().startsWith('file:///omega/')) ?? null;
  });
}

test.describe('Phase 6 Critical Flows', () => {
  /** Helper: switch view via the footer. Delegates to the shared helper. */
  async function switchToView(page: Page, view: EditorView) {
    await switchView(page, view);
    // Wait for the view to settle (Monaco needs extra time for source view)
    await page.waitForTimeout(1500);
  }

  /**
   * Helper: espera al modelo de Monaco que está en pantalla.
   *
   * Antes devolvía `false` si no aparecía y los tests seguían adelante con un
   * editor inexistente. Ahora lanza: si el editor no carga, el test que lo
   * necesita no tiene nada que comprobar y debe decirlo con nombre y apellidos.
   */
  async function waitForMonaco(page: Page, timeout = 30_000): Promise<void> {
    await page.waitForFunction(
      () => {
        const models = (window as unknown as MonacoInPage).monaco?.editor?.getModels() ?? [];
        return models.some((m) => m.uri.toString().startsWith('file:///omega/'));
      },
      undefined,
      { timeout }
    );
  }

  /** Escribe un manifiesto pulsando teclas, como haría una persona. */
  async function typeManifestInEditor(page: Page, manifest: Record<string, unknown>): Promise<void> {
    await page.locator('.monaco-editor .view-lines').first().click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+a');
    await page.keyboard.type(JSON.stringify(manifest), { delay: 5 });
  }

  /** Lee el texto del modelo que está en pantalla. */
  async function readEditorText(page: Page): Promise<string> {
    return page.evaluate(() => {
      const models = (window as unknown as MonacoInPage).monaco?.editor?.getModels() ?? [];
      const model = models.find((m) => m.uri.toString().startsWith('file:///omega/'));
      return model?.getValue() ?? '';
    });
  }

  test.beforeEach(async ({ page }) => {
    // `gotoWorkbench` entra al editor (NO al portal) y falla fuerte si no llega.
    // Antes esto era `page.goto('/en')`, que dejaba los tests de este spec
    // ejecutándose contra el portal, donde los controles del footer no existen:
    // los cinco Flows fallaban por un destino equivocado, no por su contenido.
    await gotoWorkbench(page, { waitMs: 4000 });
  });

  test('Flow 1: Load -> Edit -> Dirty -> Save -> Clean', async ({ page }) => {
    // Override window.confirm to auto-accept the export warnings
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await switchToView(page, 'source');
    await waitForMonaco(page);

    // El editor que se está usando NO es el primero que devuelve la API. Fijarlo
    // aquí es lo que hace que el resto del test signifique algo.
    const modelsInUse = await readEditorText(page);
    expect(modelsInUse.length, 'el editor debe mostrar el manifiesto al abrir').toBeGreaterThan(0);

    await typeManifestInEditor(page, {
      version: '7.2.3',
      name: 'Dirty Module',
      controls: [],
    });

    // MEDIDO: al teclear, el indicador aparece en menos de 500 ms. Antes esto
    // era un try/catch que se rendía y daba verde igual.
    const dirtyIndicator = page.locator(DIRTY_INDICATOR).first();
    await expect(dirtyIndicator, 'editar el código debe marcar el documento como sucio').toBeVisible({
      timeout: 10_000,
    });

    // Trigger save via Ctrl+S keyboard shortcut (wired in useWorkbenchShortcuts.ts
    // to editor.exportManifest('work')). First blur Monaco programmatically,
    // since the shortcut handler suppresses Ctrl+S when Monaco is focused.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+s');

    // MEDIDO: se limpia en menos de 1 s.
    await expect(dirtyIndicator, 'guardar debe limpiar el indicador de cambios sin guardar').not.toBeVisible({
      timeout: 15_000,
    });
  });

  test('Flow 2: Cross-View Sync (Rack Selection -> Source Reveal)', async ({ page }) => {
    await switchToView(page, 'rack');

    const cell = page.locator('.uca-node').first();
    const cells = await cell.count();

    if (cells === 0) {
      test.skip(true, 'El rack arranca vacío: no hay nodos UCA que seleccionar.');
      return;
    }

    await cell.click({ force: true });
    await page.waitForTimeout(800);

    await switchToView(page, 'source');
    await waitForMonaco(page);

    const highlight = page.locator('.omega-source-selection-highlight').first();

    // MEDIDO: hay nodos en el rack (el test NO se salta), pero tras seleccionar
    // uno y volver a la vista de código el resaltado no aparece en 15 s. O la
    // función está rota, o este test selecciona un nodo que no lleva `id` y por
    // eso `SourceView` no tiene nada que resaltar (su regex busca `"id": "..."`).
    // Sin resolver eso, afirmar aquí sería adivinar.
    test.fixme(
      (await highlight.count()) === 0,
      'Hay nodos .uca-node pero no aparece el resaltado de selección en la vista de código. Pendiente: ¿función rota o el nodo no tiene "id"? Antes era un console.log: verde falso.'
    );

    await expect(highlight).toBeVisible({ timeout: 15_000 });
  });

  test('Flow 3: Diagnostic Trigger (Broken Bind -> Badge -> Tooltip)', async ({ page }) => {
    await switchToView(page, 'source');
    await waitForMonaco(page);

    await typeManifestInEditor(page, {
      version: '7.2.3',
      name: 'Broken Module',
      controls: [{ id: 'ctrl_1', type: 'knob', bind: 'INVALID_TARGET' }],
    });

    await page.waitForTimeout(3000);

    // MEDIDO (no supuesto): tras escribir un `bind` inválido, con el editor
    // cargando y el texto llegando de verdad a la app, NO aparece ningún
    // indicador con "Broken Bind", ni con los selectores alternativos de
    // auditoría. Es decir: o el auditor estructural no corre sobre el documento
    // editado, o no existe tal aviso. Hasta saberlo, este test no puede
    // afirmar nada — y un test que no puede afirmar nada debe decirlo.
    test.fixme(
      true,
      'Sin badge de "Broken Bind" medido en 3 s. Pendiente de averiguar si el aviso no existe o si este test busca donde no es. Antes era un console.log: verde falso.'
    );

    // Código muerto mientras el fixme esté activo. Al quitar el fixme, esto
    // vuelve a ser la comprobación de verdad.
    const warningBadge = page.locator('[title*="Broken Bind"]').first();
    await expect(warningBadge).toBeVisible({ timeout: 20_000 });
    await expect(warningBadge.getAttribute('title')).toContain('INVALID_TARGET');
  });

  test('Flow 4: beforeunload Guard (Dirty -> Refresh -> Confirm)', async ({ page }) => {
    await switchToView(page, 'source');
    await waitForMonaco(page);

    await typeManifestInEditor(page, {
      version: '7.2.3',
      name: 'BeforeUnload Test',
      controls: [],
    });

    // MEDIDO: el indicador SÍ aparece al teclear (Flow 1 lo afirma en duro).
    await expect(page.locator(DIRTY_INDICATOR).first()).toBeVisible({ timeout: 10_000 });

    let dialogHandled = false;
    page.on('dialog', async (dialog) => {
      dialogHandled = true;
      await dialog.dismiss();
    });

    // POR QUÉ NO SE ESPERA EL `reload` A COMPLETAR
    // ------------------------------------------
    // La navegación se queda colgada en el propio diálogo hasta que se acepta o
    // se descarta. `await page.reload()` no vuelve nunca y el test se deatha por
    // tiempo, que es como se manifestation este test antes: verde por
    // `catch`, sin decir nada. Se lanza la recarga en segundo plano y se mira si
    // el diálogo aparece.
    page.reload({ waitUntil: 'commit' }).catch(() => undefined);
    await page.waitForTimeout(6000);

    // MEDIDO: con el documento de verdad sucio, el diálogo SÍ aparece. La
    // versión anterior de este test nunca lo comprobaba porque el documento
    // nunca llegaba a estar sucio (el texto se escribía en el modelo
    // equivocado; ver la cabecera del fichero).
    await expect
      .poll(() => dialogHandled, { timeout: 5_000, message: 'el diálogo beforeunload no llegó a dispararse' })
      .toBe(true);
  });

  test('Flow 5: Reset Guard (Dirty -> Reset -> Confirm -> Clean)', async ({ page }) => {
    await switchToView(page, 'source');
    await waitForMonaco(page);

    await typeManifestInEditor(page, {
      version: '7.2.3',
      name: 'Reset Guard Test',
      controls: [],
    });

    await expect(page.locator(DIRTY_INDICATOR).first()).toBeVisible({ timeout: 10_000 });

    // Override window.confirm to auto-accept the reset confirmation
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByText('Reset Workspace', { exact: true }).click();

    // MEDIDO Y CORREGIDO (2 de octubre de 2026): esto era un `test.fixme`
    // porque "Reset Workspace" dejaba el documento marcado como sucio. La
    // causa eran dos defectos delcódigo, ya arreglados, y ahora el test lo
    // afirma en duro.
    //
    // POR QUÉ NO BASTA UN ÚNICO `not.toBeVisible()`
    // ------------------------------------------
    // Porque el fallo tenía DOS fases y este test las confundía en una. Al
    // pulsar Reset el indicador se apagaba al instante (el reducer limpia) y
    // ~200 ms después volvía a encenderse (el watcher lo re-marca sucio). Un
    // `expect(...).not.toBeVisible()` con `timeout` sondea hasta que encuentra
    // un instante en que está apagado: ese instante EXISTÍA, y el test pasaba
    // con el bug puesto. Medido: sin el arreglo, este test daba verde 3 de 3.
    //
    // Por eso ahora se espera a que el ciclo del watcher haya terminado
    // (debounce de 200 ms + re-baselining de 500 ms) y se comprueba que NO hay
    // ningún indicador. Si el documento se vuelve a ensuciar un instante más
    // tarde, este assert lo pilla; el anterior no.
    await page.waitForTimeout(3_000);
    await expect(page.locator(DIRTY_INDICATOR)).toHaveCount(0);
  });
});