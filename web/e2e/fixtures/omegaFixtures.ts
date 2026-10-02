/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect as baseExpect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  gotoWorkbench,
  suppressOnboarding as addInitScriptOnboarding,
} from '../helpers/navigation';

// Re-exportado para quien ya importaba la supresión desde aquí.
export { gotoWorkbench, gotoPortal, switchView } from '../helpers/navigation';

const BP_DIR = path.resolve(__dirname, '../../public/blueprints/v2');

interface BpCache {
  [urlPath: string]: string;
}

function preloadBlueprints(): BpCache {
  const cache: BpCache = {};
  const indexRaw = fs.readFileSync(path.join(BP_DIR, 'index.json'), 'utf-8');
  cache['/blueprints/v2/index.json'] = indexRaw;
  const catalog: Array<{ path: string }> = JSON.parse(indexRaw);
  for (const bp of catalog) {
    const filename = bp.path.split('/').pop()!;
    const filePath = path.join(BP_DIR, filename);
    cache[bp.path] = fs.readFileSync(filePath, 'utf-8');
  }
  return cache;
}

const BP_CACHE = preloadBlueprints();

/**
 * Clave con la que el tour de onboarding se marca como ya visto.
 *
 * @deprecated La clave vive en `helpers/navigation.ts`, dentro de
 * `suppressOnboarding`, para que una sola definición gobierne todos los specs.
 */
export const STORAGE_KEY = 'omega_onboarding_completed';

/**
 * Mark onboarding tour as completed in localStorage BEFORE the page loads.
 * This prevents the Onboarding Walkthrough dialog from rendering and
 * blocking clicks on the underlying UI during E2E tests.
 */
async function suppressOnboarding(page: Page) {
  // @deprecated El onboarding lo suprime `gotoWorkbench` en cada navegación.
  // Se conserva el nombre solo para no romper importaciones externas.
  await addInitScriptOnboarding(page);
}

async function interceptBlueprints(page: Page) {
  await page.route('**/blueprints/v2/**', (route) => {
    const url = new URL(route.request().url());
    const cached = BP_CACHE[url.pathname];
    if (cached) {
      return route.fulfill({ body: cached, contentType: 'application/json' });
    }
    route.continue();
  });
}

/**
 * El fixture NO decide la navegación: delega en `helpers/navigation.ts`.
 *
 * Antes este fichero iba a `/en` y buscaba la pestaña "Virtual Rack", que solo
 * existe DENTRO del editor. El `if (... .catch(() => false))` envolviendo el
 * clic convertía esa navegación rota en un setup "exitoso", y los tests
 * continuaban contra el PORTAL. El síntoma salía mucho más lejos del origen:
 * los tests de la paleta de comandos fallaban con "la paleta no se abre con
 * Ctrl+K" cuando lo que pasaba era que nunca se había entrado al editor.
 *
 * Ahora la decisión vive en un único sitio —`gotoWorkbench`— y falla fuerte si
 * el editor no aparece.
 */
async function navigateToRack(page: Page, { waitMs = 2000 }: { waitMs?: number } = {}) {
  await gotoWorkbench(page, { view: 'rack', waitMs });
}

/**
 * Inject a group node into the manifest and select it so GroupEditor appears.
 * Uses fiber tree for injection (reliable) + Properties dock icon click for
 * panel opening (reliable — normal React event flow, no stale closure issues).
 */
async function injectGroupViaManifest(page: Page) {
  // ── Dismiss RackStartupAssistant overlay ──────────────────────────────
  const createBtn = page.locator('button:has-text("Create from Scratch")');
  if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(1000);
  }

  // ── Step 1: Inject group via fiber tree updateManifest ────────────────
  const groupId = await page.evaluate(() => {
    const root = document.body;
    if (!root) return 'ERR:no body';
    const fiberKey = Object.keys(root).find(k =>
      k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return 'ERR:no fiber key';

    function findProp(fiber: any, name: string, visited: Set<any>): any {
      if (!fiber || visited.has(fiber)) return null;
      visited.add(fiber);
      for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
        if (!props) continue;
        for (const key of Object.keys(props)) {
          if (key.toLowerCase().includes(name.toLowerCase()) &&
              typeof props[key] === 'function') return props[key];
        }
      }
      return findProp(fiber.child, name, visited) || findProp(fiber.sibling, name, visited);
    }

    const updateFn = findProp((root as any)[fiberKey], 'updateManifest', new Set());
    if (!updateFn) return 'ERR:updateManifest not found';

    const gid = 'e2e_test_group_' + Date.now();
    const knobId = 'e2e_test_knob_' + Date.now();

    updateFn((prev: any) => ({
      ui: {
        ...(prev.ui || {}),
        tree: {
          ...((prev.ui && prev.ui.tree) || { id: 'root', children: [] }),
          children: [
            ...((prev.ui && prev.ui.tree && prev.ui.tree.children) || []),
            {
              id: gid,
              kind: 'group',
              role: 'structural',
              layout: { pos: { x: 50, y: 50 }, size: { width: 200, height: 150 } },
              meta: { label: 'E2E Test Group' },
              children: [{
                id: knobId,
                kind: 'cell',
                cellRef: 'knob',
                role: 'control',
                layout: { pos: { x: 20, y: 20 }, size: { width: 48, height: 48 } },
                meta: { label: 'Test Knob' },
                bind: 'cutoff',
              }],
            },
          ],
        },
      },
    }));
    return gid;
  });

  if (groupId.startsWith('ERR:')) throw new Error(`Step 1 failed: ${groupId}`);
  await page.waitForTimeout(2000);
  await baseExpect(page.locator('.uca-node.uca-group').first()).toBeVisible({ timeout: 5000 });

  // ── Step 2: Select the group via onSelectItem (fiber tree) ────────────
  const selectResult = await page.evaluate((gid: string) => {
    const root = document.body;
    if (!root) return 'ERR:no body';
    const fiberKey = Object.keys(root).find(k =>
      k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return 'ERR:no fiber key';

    function findProp(fiber: any, name: string, visited: Set<any>): any {
      if (!fiber || visited.has(fiber)) return null;
      visited.add(fiber);
      for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
        if (!props) continue;
        for (const key of Object.keys(props)) {
          if (key.toLowerCase().includes(name.toLowerCase()) &&
              typeof props[key] === 'function') return props[key];
        }
      }
      return findProp(fiber.child, name, visited) || findProp(fiber.sibling, name, visited);
    }

    const onSelectFn = findProp((root as any)[fiberKey], 'onSelectItem', new Set());
    if (!onSelectFn) return 'ERR:onSelectItem not found';
    onSelectFn(gid);
    return 'OK:' + gid;
  }, groupId);

  if (selectResult.startsWith('ERR:')) {
    console.warn(`[injectGroupViaManifest] Step 2: ${selectResult}`);
  }
  await page.waitForTimeout(500);

  // ── Step 3: Open the right panel via UI click (Properties dock icon) ──
  // This uses the normal React event flow (no stale closure issues).
  // TOGGLE_WINDOW action also expands the right panel if collapsed.
  const propsBtn = page.locator('button[title="Properties"]');
  if (await propsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await propsBtn.click();
    await page.waitForTimeout(1000);
  }

  // Open Layers tab too for visual reference (non-critical)
  const layersBtn = page.locator('button[title="Layers"]');
  if (await layersBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await layersBtn.click();
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(1000);
}

type OmegaFixtures = {
  rackPage: Page;
  pageWithBlueprint: Page;
};

export const test = base.extend<OmegaFixtures>({
  rackPage: async ({ page }, use) => {
    await interceptBlueprints(page);
    await navigateToRack(page, { waitMs: 2000 });  // suppressOnboarding called inside navigateToRack
    await use(page);
  },
  pageWithBlueprint: async ({ rackPage }, use) => {
    await injectGroupViaManifest(rackPage);
    await use(rackPage);
  },
});

export { baseExpect as expect };
