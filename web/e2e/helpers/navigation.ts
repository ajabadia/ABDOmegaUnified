import type { Page } from '@playwright/test';

/**
 * Navegación E2E — una sola puerta de entrada al editor.
 *
 * POR QUÉ ESTE FICHERO EXISTE
 * ---------------------------
 * Antes, cada spec decidía su propia URL de entrada: 13 llamadas a
 * `page.goto('/en')` escritas a mano en cuatro ficheros, más un fixture que
 * iba a otra sitio. `/en` es el PORTAL; el editor vive en `/en/editor`.
 *
 * El síntoma era invisible y carísimo: los tests se ejecutaban contra el
 * portal, donde no hay workbench ni manejadores de teclado, y fallaban con
 * mensajes que señalaban al culprit equivocado — "Ctrl+K no abre la paleta",
 * "no se encuentra el botón de vista" — cuando el problema real era que nunca
 * se había entrado al editor. Diez tests de `command-palette.spec.ts` llevaban
 * tiempo en rojo por esto.
 *
 * Y lo peligroso era el modo de fallo: el fixture envolvía su clic en
 * `if (... .catch(() => false))`, de modo que una navegación rota se
 * convertía en un setup "exitoso" y el diagnóstico se desplazaba tres saltos
 * más allá del origen.
 *
 * REGLAS DE ESTE MÓDULO
 * --------------------
 * 1. Hay UNA función para entrar al editor y NINGUNA forma de llegar al editor
 *    por otra vía.
 * 2. Si el workbench no aparece, se LANZA. Un test que no puede ni llegar a su
 *    punto de partida debe morirse aquí, con el motivo, no tres aserciones
 *    después.
 * 3. Si alguien quiere el portal, tiene que PEDIRLO con `gotoPortal`. Que
 *    exista una función nombrada para eso es lo que hace visible la decisión;
 *    antes era un literal suelto que cualquiera escribía por inercia.
 */

/** Locale por defecto de los tests. Cambiarlo aquí, no en quince sitios. */
export const DEFAULT_LOCALE = 'en';

/** Ruta del PORTAL (la home con los lanzadores). No es el editor. */
export const PORTAL_PATH = `/${DEFAULT_LOCALE}`;

/** Ruta del WORKBENCH, que es donde vive todo lo que se prueba de verdad. */
export const WORKBENCH_PATH = `/${DEFAULT_LOCALE}/editor`;

/**
 * Las vistas del workbench, por el título EXACTO del control del footer.
 *
 * Los títulos llevan el atajo entre paréntesis, y Playwright hace matching por
 * subcadena: `getByTitle('Virtual Rack')` sin `exact` también casa con otros
 * controles. Se usa el título completo para que no haya ambigüedad.
 */
export const VIEW_TITLES = {
  orbital: 'Orbital View (Ctrl+1)',
  rack: 'Virtual Rack (Ctrl+2)',
  source: 'Source View (Ctrl+3)',
  history: 'Timeline / History (Ctrl+4)',
} as const;

export type EditorView = keyof typeof VIEW_TITLES;

/**
 * El control del footer existe SOLO dentro del workbench. Es la prueba de que
 * hemos llegado al editor y no al portal.
 */
const WORKBENCH_MARKER = VIEW_TITLES.rack;

/** Clave con la que el tour de onboarding se marca como ya visto. */
const ONBOARDING_KEY = 'omega_onboarding_completed';

/**
 * Evita que el tour de onboarding se interponga y robe los clics.
 *
 * Va AQUÍ y no en el fixture porque los specs que usan `page` crudo también lo
 * necesitan: si se queda en el fixture, cada spec nuevo tiene que acordarse.
 * `addInitScript` debe correr antes de navegar, de ahí que vaya dentro del
 * helper y no como paso aparte.
 */
export async function suppressOnboarding(page: Page): Promise<void> {
  await page.addInitScript(`
    (function () {
      try {
        localStorage.setItem(${JSON.stringify(ONBOARDING_KEY)}, 'true');
      } catch (e) {
        /* modo privado sin almacenamiento: el tour no bloquea igualmente */
      }
    })();
  `);
}

/**
 * Entra al WORKBENCH y espera a que exista.
 *
 * Lanza con un motivo accionable si el editor no aparece. Ese es el punto del
 * módulo: que un fallo de navegación se diga en el sitio donde ocurre.
 */
export async function gotoWorkbench(
  page: Page,
  { view, waitMs = 1500 }: { view?: EditorView; waitMs?: number } = {}
): Promise<void> {
  await suppressOnboarding(page);
  await page.goto(WORKBENCH_PATH);

  const marker = page.getByTitle(WORKBENCH_MARKER, { exact: true });
  try {
    await marker.waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    throw new Error(
      `No se encontró el workbench en "${WORKBENCH_PATH}".\n` +
        `Se esperaba el control del footer con título "${WORKBENCH_MARKER}", que solo\n` +
        `existe dentro del editor. Si el editor no carga, este fallo es el de la app,\n` +
        `no del test. Comprueba que /${DEFAULT_LOCALE}/editor responde antes de culpar\n` +
        `a las aserciones que vienen después.`
    );
  }

  if (view) await switchView(page, view);
  await page.waitForTimeout(waitMs);
}

/**
 * Cambia de vista DENTRO del editor usando el control del footer.
 *
 * `exact: true` es obligatorio: sin él, "Virtual Rack" también casa con
 * "Virtual Rack Properties" y el clic aterriza en el panel equivocado.
 */
export async function switchView(page: Page, view: EditorView): Promise<void> {
  const title = VIEW_TITLES[view];
  await page.getByTitle(title, { exact: true }).click({ timeout: 10000 });
}

/**
 * Va al PORTAL a propósito, no por inercia.
 *
 * Existe para que los tests que de verdad necesitan la home la pidan de forma
 * explícita. Antes esto era indistinguible de un `goto('/en')` que simplemente
 * se equivocaba.
 */
export async function gotoPortal(page: Page): Promise<void> {
  await suppressOnboarding(page);
  await page.goto(PORTAL_PATH);
  await page.waitForTimeout(1500);
}