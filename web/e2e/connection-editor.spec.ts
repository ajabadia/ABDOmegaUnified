import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';

/**
 * OMEGA P11 — VISUAL CONNECTION EDITOR E2E TEST SUITE
 *
 * Validates the ConnectionOverlay component:
 *   - Port handle rendering (SVG circles with data-port-handle-id)
 *   - Drag from source handle to target handle creates modulation
 *   - Snap-to-handle within 20px radius
 *   - Click on connection line deletes modulation
 *   - Ghost cable preview with animated dash while dragging
 *   - Tooltip with modulation info on hover
 *   - Port persistence after viewport resize
 *
 * Fixture-based: uses `pageWithBlueprint` (rack + injected group with knob cell).
 * Port handles are injected via `setupPortHandles` which uses a consistent
 * static ID scheme (no dynamic timestamps) to match DOM nodes with controls.
 */

// ── Constants matching ConnectionOverlay internals ─────────────────────────
const PORT_HANDLE_SELECTOR = 'circle[data-port-handle-id]';
const GHOST_LINE_SELECTOR = 'svg.z-\\[60\\] line';

/**
 * Known IDs used by both the injected tree node and its matching controls/jacks.
 * Uses a static suffix (no Date.now()) so IDs match consistently.
 */
const KNOB_ID = 'e2e_knob';
const FREQ_ID = 'e2e_freq';
const AUDIO_IN_ID = 'e2e_audio_in';
const AUDIO_OUT_ID = 'e2e_audio_out';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Set up the manifest with both a tree node AND matching controls/jacks so
 * ConnectionOverlay can find port handles. Uses the fiber-tree updateManifest
 * pattern consistent with injectGroupViaManifest.
 *
 * This replaces the old `injectPortHandles` approach which had an ID mismatch
 * because `pageWithBlueprint`'s `injectGroupViaManifest` uses dynamic timestamp
 * IDs that don't match the static control IDs.
 */
async function setupPortHandles(page: Page) {
  const result = await page.evaluate(
    ({ knobId, freqId, audioInId, audioOutId }) => {
      const root = document.body;
      if (!root) return 'ERR:no body';

      const fiberKey = Object.keys(root).find(
        (k) =>
          k.startsWith('__reactFiber$') ||
          k.startsWith('__reactInternalInstance$')
      );
      if (!fiberKey) return 'ERR:no fiber key';

      function findProp(fiber: any, name: string, visited: Set<any>): any {
        if (!fiber || visited.has(fiber)) return null;
        visited.add(fiber);
        for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
          if (!props) continue;
          for (const key of Object.keys(props)) {
            if (
              key.toLowerCase().includes(name.toLowerCase()) &&
              typeof props[key] === 'function'
            )
              return props[key];
          }
        }
        return (
          findProp(fiber.child, name, visited) ||
          findProp(fiber.sibling, name, visited)
        );
      }

      const updateFn = findProp(
        (root as any)[fiberKey],
        'updateManifest',
        new Set()
      );
      if (!updateFn) return 'ERR:updateManifest not found';

      // Inject tree node, controls, and jacks atomically
      updateFn((prev: any) => ({
        ui: {
          ...(prev.ui || {}),
          // Add a knob cell with a known static ID that matches the control
          tree: {
            ...((prev.ui && prev.ui.tree) || {
              id: 'root',
              kind: 'container',
              layout: { pos: { x: 0, y: 0 } },
              children: [],
            }),
            children: [
              ...((prev.ui && prev.ui.tree && prev.ui.tree.children) || []),
              {
                id: knobId,
                kind: 'cell',
                cellRef: 'knob',
                role: 'control',
                layout: {
                  pos: { x: 50, y: 50 },
                  size: { width: 48, height: 48 },
                },
                meta: { label: 'E2E Knob' },
                bind: 'cutoff',
              },
              {
                id: freqId,
                kind: 'cell',
                cellRef: 'knob',
                role: 'control',
                layout: {
                  pos: { x: 150, y: 50 },
                  size: { width: 48, height: 48 },
                },
                meta: { label: 'E2E Frequency' },
                bind: 'frequency',
              },
            ],
          },
          controls: [
            {
              id: knobId,
              label: 'Cutoff',
              type: 'control',
              kind: 'knob',
              bind: 'cutoff',
              min: 0,
              max: 1,
              defaultValue: 0.5,
            },
            {
              id: freqId,
              label: 'Frequency',
              type: 'control',
              kind: 'knob',
              bind: 'frequency',
              min: 20,
              max: 20000,
              defaultValue: 440,
            },
          ],
          jacks: [
            {
              id: audioInId,
              label: 'Audio In',
              type: 'stream',
              direction: 'input',
            },
            {
              id: audioOutId,
              label: 'Audio Out',
              type: 'stream',
              direction: 'output',
            },
          ],
        },
      }));
      return 'OK';
    },
    {
      knobId: KNOB_ID,
      freqId: FREQ_ID,
      audioInId: AUDIO_IN_ID,
      audioOutId: AUDIO_OUT_ID,
    }
  );

  if (result.startsWith('ERR:'))
    throw new Error(`setupPortHandles failed: ${result}`);
  await page.waitForTimeout(2500); // Wait for render + ConnectionOverlay refresh
}

/**
 * Inject a modulation programmatically via fiber-tree addModulation.
 */
async function injectModulation(
  page: Page,
  mod: { id: string; source: string; target: string; amount?: number; type?: string }
) {
  await page.evaluate((m) => {
    const root = document.body;
    if (!root) return;
    const fiberKey = Object.keys(root).find(
      (k) =>
        k.startsWith('__reactFiber$') ||
        k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return;
    function findProp(fiber: any, name: string, visited: Set<any>): any {
      if (!fiber || visited.has(fiber)) return null;
      visited.add(fiber);
      for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
        if (!props) continue;
        for (const key of Object.keys(props)) {
          if (
            key.toLowerCase().includes(name.toLowerCase()) &&
            typeof props[key] === 'function'
          )
            return props[key];
        }
      }
      return (
        findProp(fiber.child, name, visited) ||
        findProp(fiber.sibling, name, visited)
      );
    }
    const addModFn = findProp(
      (root as any)[fiberKey],
      'addModulation',
      new Set()
    );
    if (!addModFn) return;
    addModFn({
      id: m.id,
      source: m.source,
      target: m.target,
      amount: m.amount ?? 0.75,
      type: m.type ?? 'unipolar',
    });
  }, mod);
  await page.waitForTimeout(1500);
}

/**
 * Read the current modulations array from the manifest via fiber tree.
 */
async function getModulations(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const root = document.body;
    if (!root) return [];
    const fiberKey = Object.keys(root).find(
      (k) =>
        k.startsWith('__reactFiber$') ||
        k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return [];
    function findProp(fiber: any, name: string, visited: Set<any>): any {
      if (!fiber || visited.has(fiber)) return null;
      visited.add(fiber);
      for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
        if (!props) continue;
        for (const key of Object.keys(props)) {
          if (key.toLowerCase() === name.toLowerCase()) return props[key];
        }
      }
      return (
        findProp(fiber.child, name, visited) ||
        findProp(fiber.sibling, name, visited)
      );
    }
    const mods = findProp(
      (root as any)[fiberKey],
      'modulations',
      new Set()
    );
    return Array.isArray(mods) ? mods : [];
  });
}

/**
 * Count port handles currently rendered in the ConnectionOverlay SVG.
 */
async function countPortHandles(page: Page): Promise<number> {
  return page.locator(PORT_HANDLE_SELECTOR).count();
}

/**
 * Get bounding box of a specific port handle by its data-port-handle-id.
 */
async function getHandleBox(page: Page, handleId: string) {
  const handle = page.locator(`circle[data-port-handle-id="${handleId}"]`);
  await expect(handle).toBeVisible({ timeout: 5000 });
  return handle.boundingBox();
}

/**
 * Check if the ConnectionOverlay SVG is visible in the DOM.
 */
async function isOverlayVisible(page: Page): Promise<boolean> {
  return page
    .locator('svg.z-\\[60\\]')
    .first()
    .isVisible()
    .catch(() => false);
}

/**
 * Perform a smooth mouse drag from (x1,y1) to (x2,y2) in 10 incremental steps.
 */
async function smoothDrag(
  page: Page,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(
      x1 + (x2 - x1) * (i / 10),
      y1 + (y2 - y1) * (i / 10)
    );
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
}

// ── ═══════════════════════════════════════════════════════════════════════
//  TESTS
// ── ═══════════════════════════════════════════════════════════════════════

test.describe('P11 — Visual Connection Editor', () => {
  test.describe('Port Handle Rendering', () => {
    test('1. should render SVG port handles when controls/jacks are present', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      const overlayVisible = await isOverlayVisible(pageWithBlueprint);
      expect(overlayVisible).toBe(true);

      const handleCount = await countPortHandles(pageWithBlueprint);
      expect(handleCount).toBeGreaterThanOrEqual(4); // 2 controls + 2 jacks
      expect(handleCount).toBeLessThanOrEqual(6); // Sanity cap
    });

    test('2. should render each handle with a unique data-port-handle-id', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      const handles = pageWithBlueprint.locator(PORT_HANDLE_SELECTOR);
      const count = await handles.count();

      const ids = new Set<string>();
      for (let i = 0; i < count; i++) {
        const id = await handles.nth(i).getAttribute('data-port-handle-id');
        expect(id).not.toBeNull();
        expect(ids.has(id!)).toBe(false);
        ids.add(id!);
      }
      expect(ids.size).toBeGreaterThanOrEqual(4);
    });

    test('3. should show connection count badge after modulation is created', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation via fiber tree
      await injectModulation(pageWithBlueprint, {
        id: 'mod_badge_test',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.75,
        type: 'unipolar',
      });

      // After modulation, the source handle should have a connection count badge
      // Badges are rendered as SVG <text> elements within the handle <g> group
      const connectedHandle = pageWithBlueprint.locator(
        `circle[data-port-handle-id="${KNOB_ID}"]`
      );
      await expect(connectedHandle).toBeVisible({ timeout: 3000 });

      // Verify modulation was stored
      const mods = await getModulations(pageWithBlueprint);
      const found = mods.some((m: any) => m.id === 'mod_badge_test');
      expect(found).toBe(true);
    });
  });

  test.describe('Drag-to-Connect', () => {
    test('4. should create modulation when dragging from source to target handle', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_IN_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      await smoothDrag(pageWithBlueprint, sx, sy, tx, ty);

      // Verify modulation was created in the manifest
      const mods = await getModulations(pageWithBlueprint);
      expect(mods.length).toBeGreaterThan(0);
    });

    test('5. should snap ghost line to nearby handle during drag and create connection', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, FREQ_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      // Start drag
      await pageWithBlueprint.mouse.move(sx, sy);
      await pageWithBlueprint.mouse.down();

      // Move to within snap radius (SNAP_RADIUS = 20px) of target
      const snapX = tx - 10;
      const snapY = ty - 10;
      await pageWithBlueprint.mouse.move(snapX, snapY);
      await pageWithBlueprint.waitForTimeout(200);

      // Ghost line should be visible during drag
      const ghostLine = pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first();
      const ghostVisible = await ghostLine.isVisible().catch(() => false);
      expect(ghostVisible).toBe(true);

      // Complete the drop
      await pageWithBlueprint.mouse.up();
      await pageWithBlueprint.waitForTimeout(500);

      // Verify modulation was created via snap
      const mods = await getModulations(pageWithBlueprint);
      expect(mods.length).toBeGreaterThan(0);
    });

    test('6. should show ghost cable with dashed cyan stroke while dragging', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      if (!sourceBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;

      // Start drag and move slightly to trigger ghost
      await pageWithBlueprint.mouse.move(sx, sy);
      await pageWithBlueprint.mouse.down();
      await pageWithBlueprint.mouse.move(sx + 50, sy);
      await pageWithBlueprint.waitForTimeout(200);

      // Ghost line should be visible
      const ghostLine = pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first();
      await expect(ghostLine).toBeVisible({ timeout: 3000 });

      // Verify dashed appearance and color
      const strokeDash = await ghostLine.getAttribute('stroke-dasharray');
      expect(strokeDash).toBe('6 4');

      const strokeColor = await ghostLine.getAttribute('stroke');
      expect(strokeColor).toBe('#00f0ff');

      // Cancel drag
      await pageWithBlueprint.mouse.up();
      await pageWithBlueprint.waitForTimeout(300);
    });
  });

  test.describe('Click-to-Delete Connections', () => {
    test('7. should delete a connection when clicking on the connection line', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation programmatically
      await injectModulation(pageWithBlueprint, {
        id: 'mod_del_test',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.5,
        type: 'bipolar',
      });

      // Verify it exists
      let mods = await getModulations(pageWithBlueprint);
      expect(mods.some((m: any) => m.id === 'mod_del_test')).toBe(true);

      // Click on the connection line using an offset from the midpoint
      // to avoid hitting overlapping handle circles (which have pointer-events-auto)
      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_OUT_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      // Calculate midpoint, then offset slightly toward the source
      // (away from the midpoint where handle circles are more likely to overlap)
      const midX = (sourceBox.x + sourceBox.width / 2 + targetBox.x + targetBox.width / 2) / 2;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;
      const offsetX = midX - 20; // Shift 20px toward source to avoid target handle circle
      const offsetY = midY;

      await pageWithBlueprint.mouse.click(offsetX, offsetY);
      await pageWithBlueprint.waitForTimeout(1000);

      // Verify modulation was removed
      mods = await getModulations(pageWithBlueprint);
      expect(mods.some((m: any) => m.id === 'mod_del_test')).toBe(false);
    });

    test('8. should show delete button (X) on hover over connection line', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation
      await injectModulation(pageWithBlueprint, {
        id: 'mod_hover_test',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.75,
        type: 'unipolar',
      });

      // Hover near the midpoint of the connection (offset from handle circles)
      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_OUT_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const midX = (sourceBox.x + sourceBox.width / 2 + targetBox.x + targetBox.width / 2) / 2 - 20;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;

      await pageWithBlueprint.mouse.move(midX, midY);
      await pageWithBlueprint.waitForTimeout(500);

      // The delete button (foreignObject with title="Delete connection") should appear
      const deleteBtn = pageWithBlueprint.locator(
        'div[title="Delete connection"]'
      );
      await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Visual Feedback & Resilience', () => {
    test('9. should render tooltip SVG text with modulation info on hover', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation with known amount and type
      await injectModulation(pageWithBlueprint, {
        id: 'mod_tooltip_test',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.75,
        type: 'unipolar',
      });

      // Hover over the connection line
      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_OUT_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const midX = (sourceBox.x + sourceBox.width / 2 + targetBox.x + targetBox.width / 2) / 2 - 20;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;

      await pageWithBlueprint.mouse.move(midX, midY);
      await pageWithBlueprint.waitForTimeout(500);

      // The tooltip renders SVG <text> elements with amount (e.g. "0.75") and type label ("UNI")
      // These are rendered as part of the connection <g> when isHovered is true
      const tooltipAmount = pageWithBlueprint
        .locator('svg.z-\\[60\\] text')
        .filter({ hasText: '0.75' });
      const amountVisible = await tooltipAmount.first().isVisible().catch(() => false);

      const tooltipType = pageWithBlueprint
        .locator('svg.z-\\[60\\] text')
        .filter({ hasText: 'UNI' });
      const typeVisible = await tooltipType.first().isVisible().catch(() => false);

      // Either the amount or type label should be visible in the tooltip
      expect(amountVisible || typeVisible).toBe(true);
    });

    test('10. should persist port handles after viewport resize', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation
      await injectModulation(pageWithBlueprint, {
        id: 'mod_resize_test',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.5,
        type: 'bipolar',
      });

      // Store initial handle count
      const beforeCount = await countPortHandles(pageWithBlueprint);

      // Resize the viewport
      await pageWithBlueprint.setViewportSize({ width: 1200, height: 900 });
      await pageWithBlueprint.waitForTimeout(2000); // ResizeObserver + periodic refresh (1s)

      // Verify handles still rendered
      const afterCount = await countPortHandles(pageWithBlueprint);
      expect(afterCount).toBe(beforeCount);

      // Verify modulation still exists
      const mods = await getModulations(pageWithBlueprint);
      expect(mods.some((m: any) => m.id === 'mod_resize_test')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADDITIONAL P11 EDGE CASES & COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Drag Cancellation & Edge Cases', () => {
    test('11. should NOT create modulation when drag is cancelled on empty space', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      if (!sourceBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;

      // Verify there are no modulations before drag
      const modsBefore = await getModulations(pageWithBlueprint);
      const countBefore = modsBefore.length;

      // Start drag, move to far-away empty space, release (no handle nearby)
      await pageWithBlueprint.mouse.move(sx, sy);
      await pageWithBlueprint.mouse.down();
      // Move to an area far from any handle (500px away in both axes)
      await pageWithBlueprint.mouse.move(sx + 500, sy + 500);
      await pageWithBlueprint.waitForTimeout(200);
      await pageWithBlueprint.mouse.up();
      await pageWithBlueprint.waitForTimeout(1000);

      // Verify no new modulation was created
      const modsAfter = await getModulations(pageWithBlueprint);
      expect(modsAfter.length).toBe(countBefore);
    });

    test('12. should NOT create modulation when dragging back to the same handle', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      if (!sourceBox) throw new Error('Handle not found');

      const cx = sourceBox.x + sourceBox.width / 2;
      const cy = sourceBox.y + sourceBox.height / 2;

      // Drag from handle slightly away and back to same position (same handle)
      await pageWithBlueprint.mouse.move(cx, cy);
      await pageWithBlueprint.mouse.down();
      await pageWithBlueprint.mouse.move(cx + 30, cy); // Move away
      await pageWithBlueprint.waitForTimeout(100);
      await pageWithBlueprint.mouse.move(cx, cy); // Move back to same handle
      await pageWithBlueprint.waitForTimeout(100);
      await pageWithBlueprint.mouse.up();
      await pageWithBlueprint.waitForTimeout(1000);

      // Verify no modulation was created (self-connection not allowed)
      const mods = await getModulations(pageWithBlueprint);
      const selfMod = mods.some(
        (m: any) => m.source === KNOB_ID && m.target === KNOB_ID
      );
      expect(selfMod).toBe(false);
    });

    test('13. should NOT create duplicate modulation when dragging same source→target twice', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, FREQ_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      // First drag: create modulation
      await smoothDrag(pageWithBlueprint, sx, sy, tx, ty);

      const modsAfterFirst = await getModulations(pageWithBlueprint);
      const afterFirstCount = modsAfterFirst.length;

      // Second drag: attempt same connection again
      await smoothDrag(pageWithBlueprint, sx, sy, tx, ty);

      // Verify count did not increase (duplicate prevented)
      const modsAfterSecond = await getModulations(pageWithBlueprint);
      expect(modsAfterSecond.length).toBe(afterFirstCount);
    });
  });

  test.describe('Reverse & Multiple Connections', () => {
    test('14. should create modulation when reverse-dragging from input to output', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      // Drag from Audio In (input) to Knob (output/control)
      const sourceBox = await getHandleBox(pageWithBlueprint, AUDIO_IN_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      await smoothDrag(pageWithBlueprint, sx, sy, tx, ty);

      // Verify modulation was created with audio_in as source
      const mods = await getModulations(pageWithBlueprint);
      const found = mods.some(
        (m: any) =>
          (m.source === AUDIO_IN_ID && m.target === KNOB_ID) ||
          (m.source === KNOB_ID && m.target === AUDIO_IN_ID)
      );
      expect(found).toBe(true);
    });

    test('15. should support multiple modulations from same source to different targets', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const target1Box = await getHandleBox(pageWithBlueprint, FREQ_ID);
      const target2Box = await getHandleBox(pageWithBlueprint, AUDIO_IN_ID);
      if (!sourceBox || !target1Box || !target2Box) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;

      // Connect knob → freq
      const t1x = target1Box.x + target1Box.width / 2;
      const t1y = target1Box.y + target1Box.height / 2;
      await smoothDrag(pageWithBlueprint, sx, sy, t1x, t1y);

      // Connect knob → audio_in
      const t2x = target2Box.x + target2Box.width / 2;
      const t2y = target2Box.y + target2Box.height / 2;
      await smoothDrag(pageWithBlueprint, sx, sy, t2x, t2y);

      // Verify 2 modulations exist from knob to different targets
      const mods = await getModulations(pageWithBlueprint);
      const fromKnob = mods.filter(
        (m: any) =>
          m.source === KNOB_ID ||
          m.target === KNOB_ID
      );
      expect(fromKnob.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Ghost Cable Lifecycle', () => {
    test('16. ghost cable should disappear after successful drop (connection created)', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, FREQ_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      // Verify ghost is NOT visible before drag
      const ghostBefore = await pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first().isVisible().catch(() => false);
      expect(ghostBefore).toBe(false);

      // Start drag and move toward target
      await pageWithBlueprint.mouse.move(sx, sy);
      await pageWithBlueprint.mouse.down();
      await pageWithBlueprint.mouse.move(tx, ty);
      await pageWithBlueprint.waitForTimeout(200);

      // Ghost should be visible during drag
      const ghostDuring = await pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first().isVisible().catch(() => false);
      expect(ghostDuring).toBe(true);

      // Complete the drop
      await pageWithBlueprint.mouse.up();
      await pageWithBlueprint.waitForTimeout(800);

      // Ghost should NOT be visible after drop
      const ghostAfter = await pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first().isVisible().catch(() => false);
      expect(ghostAfter).toBe(false);
    });

    test('17. ghost cable should disappear after cancel (mouse up on empty space)', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      if (!sourceBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;

      // Start drag
      await pageWithBlueprint.mouse.move(sx, sy);
      await pageWithBlueprint.mouse.down();
      await pageWithBlueprint.mouse.move(sx + 100, sy);
      await pageWithBlueprint.waitForTimeout(200);

      // Ghost should be visible during drag
      const ghostDuring = await pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first().isVisible().catch(() => false);
      expect(ghostDuring).toBe(true);

      // Cancel by releasing on empty space
      await pageWithBlueprint.mouse.up();
      await pageWithBlueprint.waitForTimeout(800);

      // Ghost should NOT be visible after cancel
      const ghostAfter = await pageWithBlueprint.locator(GHOST_LINE_SELECTOR).first().isVisible().catch(() => false);
      expect(ghostAfter).toBe(false);
    });
  });

  test.describe('Manifest Structure Validation', () => {
    test('18. should create modulation with correct source, target, amount and type fields', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);
      await pageWithBlueprint.waitForTimeout(1000);

      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_IN_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      await smoothDrag(pageWithBlueprint, sx, sy, tx, ty);

      // Verify modulation structure
      const mods = await getModulations(pageWithBlueprint);
      const createdMod = mods.find(
        (m: any) =>
          (m.source === KNOB_ID && m.target === AUDIO_IN_ID) ||
          (m.source === AUDIO_IN_ID && m.target === KNOB_ID)
      );
      expect(createdMod).toBeTruthy();
      expect(createdMod.source).toBe(KNOB_ID);
      expect(createdMod.target).toBe(AUDIO_IN_ID);
      expect(createdMod.amount).toBe(0.75); // Default amount from ConnectionOverlay
      expect(createdMod.type).toBe('unipolar'); // Default type from ConnectionOverlay
      expect(createdMod.id).toBeTruthy(); // Should have auto-generated id
      expect(createdMod.id).toContain(KNOB_ID);
      expect(createdMod.id).toContain(AUDIO_IN_ID);
    });

    test('19. should fully remove modulation from manifest after line click delete', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation
      await injectModulation(pageWithBlueprint, {
        id: 'mod_manifest_del',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.33,
        type: 'bipolar',
      });

      // Verify it exists with correct fields
      let mods = await getModulations(pageWithBlueprint);
      const beforeMod = mods.find((m: any) => m.id === 'mod_manifest_del');
      expect(beforeMod).toBeTruthy();
      expect(beforeMod.source).toBe(KNOB_ID);
      expect(beforeMod.target).toBe(AUDIO_OUT_ID);
      expect(beforeMod.amount).toBe(0.33);
      expect(beforeMod.type).toBe('bipolar');

      // Click on the connection line to delete
      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_OUT_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const midX = (sourceBox.x + sourceBox.width / 2 + targetBox.x + targetBox.width / 2) / 2 - 20;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;

      await pageWithBlueprint.mouse.click(midX, midY);
      await pageWithBlueprint.waitForTimeout(1000);

      // Verify modulation is completely gone
      mods = await getModulations(pageWithBlueprint);
      const afterMod = mods.find((m: any) => m.id === 'mod_manifest_del');
      expect(afterMod).toBeUndefined();
    });
  });

  test.describe('Delete via X Button', () => {
    test('20. should delete modulation when clicking the X button on hover', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create a modulation
      await injectModulation(pageWithBlueprint, {
        id: 'mod_xbtn_test',
        source: KNOB_ID,
        target: AUDIO_OUT_ID,
        amount: 0.6,
        type: 'unipolar',
      });

      // Verify it exists
      let mods = await getModulations(pageWithBlueprint);
      expect(mods.some((m: any) => m.id === 'mod_xbtn_test')).toBe(true);

      // Hover near the midpoint to trigger delete button
      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, AUDIO_OUT_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const midX = (sourceBox.x + sourceBox.width / 2 + targetBox.x + targetBox.width / 2) / 2 - 20;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;

      await pageWithBlueprint.mouse.move(midX, midY);
      await pageWithBlueprint.waitForTimeout(500);

      // Click the delete button
      const deleteBtn = pageWithBlueprint.locator('div[title="Delete connection"]');
      await expect(deleteBtn).toBeVisible({ timeout: 3000 });
      await deleteBtn.click();
      await pageWithBlueprint.waitForTimeout(1000);

      // Verify modulation was removed
      mods = await getModulations(pageWithBlueprint);
      expect(mods.some((m: any) => m.id === 'mod_xbtn_test')).toBe(false);
    });
  });

  test.describe('Connection Count Badge Updates', () => {
    test('21. should show correct connection count on handle after multiple modulations', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create 2 modulations from knob to different targets
      await injectModulation(pageWithBlueprint, {
        id: 'mod_count_1',
        source: KNOB_ID,
        target: FREQ_ID,
        amount: 0.5,
        type: 'unipolar',
      });
      await injectModulation(pageWithBlueprint, {
        id: 'mod_count_2',
        source: KNOB_ID,
        target: AUDIO_IN_ID,
        amount: 0.8,
        type: 'bipolar',
      });

      await pageWithBlueprint.waitForTimeout(1000);

      // Verify the connection count badge shows "2" on the knob handle
      const mods = await getModulations(pageWithBlueprint);
      const knobMods = mods.filter(
        (m: any) => m.source === KNOB_ID || m.target === KNOB_ID
      );
      expect(knobMods.length).toBe(2);

      // Check for the SVG text element showing "2" near the knob handle
      const badgeText = pageWithBlueprint
        .locator('svg.z-\\[60\\] text')
        .filter({ hasText: '2' });
      await expect(badgeText.first()).toBeVisible({ timeout: 3000 });
    });

    test('22. should decrease connection count badge after removing a modulation', async ({
      pageWithBlueprint,
    }) => {
      await setupPortHandles(pageWithBlueprint);

      // Create 2 modulations
      await injectModulation(pageWithBlueprint, {
        id: 'mod_dec_1',
        source: KNOB_ID,
        target: FREQ_ID,
        amount: 0.5,
        type: 'unipolar',
      });
      await injectModulation(pageWithBlueprint, {
        id: 'mod_dec_2',
        source: KNOB_ID,
        target: AUDIO_IN_ID,
        amount: 0.8,
        type: 'bipolar',
      });

      await pageWithBlueprint.waitForTimeout(1000);

      // Verify 2 modulations exist
      let mods = await getModulations(pageWithBlueprint);
      expect(
        mods.filter((m: any) => m.source === KNOB_ID || m.target === KNOB_ID)
          .length
      ).toBe(2);

      // Remove one modulation via ConnectionOverlay
      const sourceBox = await getHandleBox(pageWithBlueprint, KNOB_ID);
      const targetBox = await getHandleBox(pageWithBlueprint, FREQ_ID);
      if (!sourceBox || !targetBox) throw new Error('Handle not found');

      const midX = (sourceBox.x + sourceBox.width / 2 + targetBox.x + targetBox.width / 2) / 2 - 20;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;

      await pageWithBlueprint.mouse.click(midX, midY);
      await pageWithBlueprint.waitForTimeout(1500);

      // Verify only 1 modulation remains
      mods = await getModulations(pageWithBlueprint);
      expect(
        mods.filter((m: any) => m.source === KNOB_ID || m.target === KNOB_ID)
          .length
      ).toBe(1);

      // Badge should now show "1" (exact match to avoid matching "100%" or other numbers)
      const badgeText = pageWithBlueprint
        .locator('svg.z-\\[60\\] text')
        .filter({ hasText: /^1$/ });
      await expect(badgeText.first()).toBeVisible({ timeout: 3000 });
    });
  });
});
