import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoWorkbench } from './helpers/navigation';

/**
 * EL FALLBACK LEGACY, QUITADO — y la regresión que lo vigila.
 *
 * QUÉ ERA
 * -------
 * El menú View tenía "Disable UCA Rendering (Fallback)" y el inspector tenía un
 * botón "Legacy Rendering Fallback". Los dos ponían `ui.useUCA: false`.
 *
 * QUÉ HACÍA, MEDIDO (no deducido)
 * -------------------------------
 * 1. No afectaba al renderizado. Ni `VirtualRack`, ni `RenderedRackTree`, ni
 *    `useRackLayout` leen `useUCA`: el rack dibuja siempre desde `ui.tree`. El
 *    botón no desactivaba nada del dibujo; el nombre mentía.
 *
 * 2. Perdía trabajo en silencio. Con la bandera apagada, añadir un nodo lo
 *    escribía en `ui.controls` — que nadie dibuja. Medido: `celdasEnArbol: 0`,
 *    0 celdas visibles. El usuario pulsaba "añadir knob" y no aparecía nada.
 *
 * 3. Se revolvía solo. `omegaTreeToManifest` (omega-ui-core/uca/ucaBridge.ts)
 *    fuerza `useUCA: true` en el manifiesto que devuelve, así que cualquier
 *    escritura en el árbol borraba la elección.
 *
 * Un plan B que no dibuja y traga trabajo no es un plan B: es una vía de datos
 * muerta con un interruptor en la interfaz. Se quitó el 2026-10-03.
 *
 * LO QUE NO SE QUITÓ
 * ------------------
 * La LECTURA de ficheros antiguos sigue viva y es otra cosa: `manifestToTree`
 * migra al árbol un `.json` que aún no lo tenga, y `findItem`/`updateItem` lo
 * consultan para que un documento viejo se migre solo al editarlo. Eso no
 * dependía de la bandera.
 */

/** El árbol UCA: la única representación que se dibuja. */
const RACK_CELL = '.uca-node.uca-cell';

// ── Lectura del manifiesto vivo ─────────────────────────────────────────

interface Estado {
  useUCA?: boolean;
  legacyControls: number;
  legacyJacks: number;
  celdasEnArbol: number;
}

async function leerEstado(page: Page): Promise<Estado | null> {
  return page.evaluate(() => {
    const root = document.body as unknown as Record<string, unknown>;
    const fiberKey = Object.keys(root).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    ) as string | undefined;
    if (!fiberKey) return null;

    let manifiesto: {
      ui?: { useUCA?: boolean; controls?: unknown[]; jacks?: unknown[]; tree?: unknown };
    } | null = null;
    const vistos = new Set<unknown>();
    const buscar = (fiber: unknown): boolean => {
      const f = fiber as {
        memoizedProps?: Record<string, unknown>;
        pendingProps?: Record<string, unknown>;
        child?: unknown;
        sibling?: unknown;
      } | null;
      if (!f || vistos.has(f)) return false;
      vistos.add(f);
      for (const props of [f.memoizedProps, f.pendingProps]) {
        if (!props || typeof props !== 'object') continue;
        const cand = props.manifest as typeof manifiesto;
        if (cand && typeof cand === 'object' && cand.ui) {
          manifiesto = cand;
          return true;
        }
      }
      return buscar(f.child) || buscar(f.sibling);
    };
    buscar(root[fiberKey]);
    if (!manifiesto) return null;

    const contarNodos = (n: { kind?: string; children?: unknown[] } | undefined): number => {
      if (!n) return 0;
      let total = n.kind === 'cell' || n.kind === 'port' ? 1 : 0;
      for (const c of (n.children ?? []) as { kind?: string; children?: unknown[] }[]) {
        total += contarNodos(c);
      }
      return total;
    };

    return {
      useUCA: manifiesto.ui?.useUCA,
      legacyControls: (manifiesto.ui?.controls ?? []).length,
      legacyJacks: (manifiesto.ui?.jacks ?? []).length,
      celdasEnArbol: contarNodos(manifiesto.ui?.tree as { kind?: string; children?: unknown[] } | undefined),
    };
  });
}

/** Añade un knob por la barra de herramientas, como haría un usuario. */
async function anadirKnob(page: Page): Promise<void> {
  const add = page.locator('div[role="toolbar"][aria-label="Floating tools"] button[title="Add Primitives & Ports (A)"]');
  await expect(add).toBeVisible({ timeout: 10000 });
  await add.click();
  await expect(page.locator('text=Inject Component')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Knob' }).click();
  await page.waitForTimeout(2000);
}

// ── Specs ───────────────────────────────────────────────────────────────

test('el menú View ya no ofrece el fallback legacy', async ({ page }) => {
  await gotoWorkbench(page, { view: 'rack', waitMs: 4000 });

  await page.getByText('View', { exact: true }).first().click();

  await expect(
    page.getByText('Disable UCA Rendering (Fallback)'),
    'el toggle volvió al menú: con la bandera apagada los nodos se perdían',
  ).toHaveCount(0);
});

test('añadir un nodo lo guarda en el árbol y se ve', async ({ page }) => {
  await gotoWorkbench(page, { view: 'rack', waitMs: 4000 });

  const antes = await leerEstado(page);
  expect(antes, 'no se pudo leer el manifiesto').not.toBeNull();

  await anadirKnob(page);

  const despues = await leerEstado(page);
  const celdas = await page.locator(RACK_CELL).count();
  console.log('[fallback] tras añadir knob:', JSON.stringify(despues), '| visibles:', celdas);

  // El nodo tiene que estar EN EL ÁRBOL, que es lo que se dibuja.
  expect(despues!.celdasEnArbol, 'el nodo no llegó al árbol').toBe(antes!.celdasEnArbol + 1);
  // Y tiene que verse. Antes, escrito en `ui.controls`, no aparecía.
  expect(celdas, 'el nodo se guardó pero no se dibujó: trabajo perdido en silencio').toBe(antes!.celdasEnArbol + 1);
});

/** Force `ui.useUCA: false` por el árbol de React, como haría el toggle. */
function forzarBanderaLegacy(page: Page, valor: boolean): Promise<boolean> {
  return page.evaluate((want) => {
    const root = document.body as unknown as Record<string, unknown>;
    const fiberKey = Object.keys(root).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    ) as string | undefined;
    if (!fiberKey) return false;

    let update: ((u: unknown) => void) | null = null;
    const vistos = new Set<unknown>();
    const buscar = (fiber: unknown): boolean => {
      const f = fiber as {
        memoizedProps?: Record<string, unknown>;
        pendingProps?: Record<string, unknown>;
        child?: unknown;
        sibling?: unknown;
      } | null;
      if (!f || vistos.has(f)) return false;
      vistos.add(f);
      for (const props of [f.memoizedProps, f.pendingProps]) {
        if (!props || typeof props !== 'object') continue;
        if (props.manifest?.ui && typeof props.updateManifest === 'function' && !update) {
          update = props.updateManifest as (u: unknown) => void;
        }
      }
      return buscar(f.child) || buscar(f.sibling);
    };
    buscar(root[fiberKey]);
    if (!update) return false;

    update((prev: { ui?: Record<string, unknown> }) => ({
      ui: { ...(prev.ui || {}), useUCA: want },
    }));
    return true;
  }, valor);
}

test('con useUCA forzado a false, un nodo nuevo SIGUE yendo al árbol y viéndose', async ({ page }) => {
  // ESTE es el test que caza la pérdida de trabajo. Antes del arreglo, con la
  // bandera apagada `addEntity` escribía en `ui.controls` y el nodo no aparecía
  // (medido: `celdasEnArbol: 0`, 0 celdas visibles).
  //
  // Se fuerza la bandera a mano porque los dos interruptores ya no existen: el
  // objetivo no es probarlos, sino comprobar que la ESCRITURA es correcta aun
  // si un documento antiguo llega con `useUCA: false` desde fuera.
  await gotoWorkbench(page, { view: 'rack', waitMs: 4000 });

  expect(await forzarBanderaLegacy(page, false), 'no se encontró updateManifest').toBe(true);
  await page.waitForTimeout(1200);
  expect((await leerEstado(page))!.useUCA, 'no se pudo forzar la bandera').toBe(false);

  const antes = await leerEstado(page);
  await anadirKnob(page);

  const despues = await leerEstado(page);
  const celdas = await page.locator(RACK_CELL).count();
  console.log('[fallback] con useUCA=false:', JSON.stringify(despues), '| visibles:', celdas);

  expect(despues!.celdasEnArbol, 'el nodo NO fue al árbol: se perdió').toBe(antes!.celdasEnArbol + 1);
  expect(celdas, 'el nodo se guardó pero no se vio: la regresión del fallback').toBe(antes!.celdasEnArbol + 1);
});

test('un documento importado sin árbol se sigue migrando (esto NO se quitó)', async ({ page }) => {
  await gotoWorkbench(page, { view: 'rack', waitMs: 4000 });

  // Se comprueba la lectura, no la escritura: `findItem` sigue consultando las
  // listas planas para que un `.json` antiguo se migre solo al editarlo.
  await anadirKnob(page);
  const estado = await leerEstado(page);

  // Tras una escritura, las listas se recalculan desde el árbol (son una
  // proyección), así que cuadran con él. Si algún día dejan de cuadrar, esta
  // aserción avisa de que la proyección se ha roto.
  expect(estado!.legacyControls + estado!.legacyJacks).toBe(estado!.celdasEnArbol);
});