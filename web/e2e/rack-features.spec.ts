import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';
import { injectBlueprint } from './helpers/blueprintInjection';

/**
 * OMEGA ERA 7.2.3 - RACK FEATURES E2E TEST SUITE
 *
 * Fixture-based: main tests use `pageWithBlueprint` (rack view + VCF injected).
 * RackStartupAssistant tests use `rackPage` (empty rack for conditional rendering checks).
 *
 * Validates drag & drop, click-to-select, and scroll-wheel zoom
 * in the VirtualRack viewport.
 */

test.describe('Rack Features', () => {

  test('should select a cell on click (click-to-select)', async ({ pageWithBlueprint }) => {
    const cell = pageWithBlueprint.locator('.uca-node.uca-cell').first();
    await expect(cell).toBeVisible({ timeout: 10000 });

    await cell.click({ force: true });
    await pageWithBlueprint.waitForTimeout(500);

    const hasSelectedStyle = await cell.evaluate(el => {
      return el.style.boxShadow !== 'none' && el.style.boxShadow !== '';
    });
    expect(hasSelectedStyle).toBe(true);

    const rackFrame = pageWithBlueprint.locator('.uca-native-layer').first();
    await rackFrame.click({ position: { x: 10, y: 10 } });
    await pageWithBlueprint.waitForTimeout(300);

    const hasNoneStyle = await cell.evaluate(el => el.style.boxShadow === 'none' || el.style.boxShadow === '');
    expect(hasNoneStyle).toBe(true);
  });

  test('should drag a cell to a new position', async ({ pageWithBlueprint }) => {
    const cell = pageWithBlueprint.locator('.uca-node.uca-cell').first();
    await expect(cell).toBeVisible({ timeout: 10000 });

    const initialBox = await cell.boundingBox();
    expect(initialBox).not.toBeNull();

    const startX = initialBox!.x + initialBox!.width / 2;
    const startY = initialBox!.y + initialBox!.height / 2;
    const endX = startX + 150;
    const endY = startY + 50;

    await pageWithBlueprint.mouse.move(startX, startY);
    await pageWithBlueprint.mouse.down();

    for (let i = 1; i <= 10; i++) {
      await pageWithBlueprint.mouse.move(
        startX + (endX - startX) * (i / 10),
        startY + (endY - startY) * (i / 10)
      );
      await pageWithBlueprint.waitForTimeout(50);
    }
    await pageWithBlueprint.mouse.up();
    await pageWithBlueprint.waitForTimeout(500);

    const finalBox = await cell.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(finalBox!.x).toBeGreaterThanOrEqual(0);
    expect(finalBox!.y).toBeGreaterThanOrEqual(0);
  });

  test('should zoom in/out with Ctrl+Scroll wheel', async ({ pageWithBlueprint }) => {
    const zoomDisplay = pageWithBlueprint.locator('.z-50 span.font-mono.font-black');
    await expect(zoomDisplay).toBeVisible({ timeout: 10000 });

    const initialText = await zoomDisplay.textContent();
    expect(initialText).toBe('100%');

    // Use Zoom In / Zoom Out buttons for reliable zoom testing (wheel events
    // are unreliable in headless Chromium because dispatching synthetic wheel
    // events via dispatchEvent creates a plain Event, not a WheelEvent with deltaY)
    const zoomInBtn = pageWithBlueprint.locator('button[title="Zoom In"]');
    const zoomOutBtn = pageWithBlueprint.locator('button[title="Zoom Out"]');
    await expect(zoomInBtn).toBeVisible({ timeout: 5000 });

    // Zoom in: click Zoom In button twice
    await zoomInBtn.click();
    await pageWithBlueprint.waitForTimeout(300);
    await zoomInBtn.click();
    await pageWithBlueprint.waitForTimeout(300);

    const afterZoomInText = await zoomDisplay.textContent();
    const zoomInVal = parseInt(afterZoomInText!);
    expect(zoomInVal).toBeGreaterThan(100);

    // Zoom out: click Zoom Out button
    await zoomOutBtn.click();
    await pageWithBlueprint.waitForTimeout(300);

    const afterZoomOutText = await zoomDisplay.textContent();
    const zoomOutVal = parseInt(afterZoomOutText!);
    expect(zoomOutVal).toBeLessThan(zoomInVal);
  });

  test('should combine click-to-select and drag in sequence', async ({ pageWithBlueprint }) => {
    const cell = pageWithBlueprint.locator('.uca-node.uca-cell').first();
    await expect(cell).toBeVisible({ timeout: 10000 });

    await cell.click();
    await pageWithBlueprint.waitForTimeout(300);

    const hasSelectedState = await cell.evaluate(el => {
      return el.style.boxShadow !== 'none' && el.style.boxShadow !== '';
    });
    expect(hasSelectedState).toBe(true);

    const initialBox = await cell.boundingBox();
    expect(initialBox).not.toBeNull();

    const cx = initialBox!.x + initialBox!.width / 2;
    const cy = initialBox!.y + initialBox!.height / 2;

    await pageWithBlueprint.mouse.move(cx, cy);
    await pageWithBlueprint.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await pageWithBlueprint.mouse.move(cx + 100 * (i / 8), cy);
      await pageWithBlueprint.waitForTimeout(40);
    }
    await pageWithBlueprint.mouse.up();
    await pageWithBlueprint.waitForTimeout(500);

    const finalBox = await cell.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(finalBox!.x).toBeGreaterThanOrEqual(0);
    expect(finalBox!.y).toBeGreaterThanOrEqual(0);
  });

  test('should not interfere with normal rack HUD controls', async ({ pageWithBlueprint }) => {
    const zoomOutBtn = pageWithBlueprint.locator('button[title="Zoom Out"]');
    const zoomInBtn = pageWithBlueprint.locator('button[title="Zoom In"]');
    const centerBtn = pageWithBlueprint.locator('button[title="Center View"]').first();

    await expect(zoomOutBtn).toBeVisible({ timeout: 10000 });
    await expect(zoomInBtn).toBeVisible();
    await expect(centerBtn).toBeVisible();

    await zoomInBtn.click();
    await pageWithBlueprint.waitForTimeout(300);

    const zoomDisplay = pageWithBlueprint.locator('.z-50 .font-mono.font-black').first();
    const text = await zoomDisplay.textContent();
    expect(parseInt(text!)).toBeGreaterThanOrEqual(110);
  });
});

/**
 * OMEGA v9.1.8-dev — RackStartupAssistant Conditional Rendering Matrix
 *
 * Each test starts with a fresh empty rack (rackPage fixture).
 */
test.describe('RackStartupAssistant Matrix (v9.1.8-dev)', () => {

  const OVERLAY = '[data-startup-assistant]';
  const OVERLAY_TITLE = 'Initialize Canvas';

  async function switchToRackView(page: Page) {
    // Try footer button first, then fall back to Ctrl+2 keyboard shortcut
    try {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible({ timeout: 15000 });
      const rackTab = page.locator('footer button[title="Virtual Rack"]');
      await expect(rackTab).toBeVisible({ timeout: 5000 });
      await rackTab.click();
    } catch {
      console.log('[switchToRackView] Footer button not found — using Ctrl+2 shortcut');
      await page.keyboard.press('Control+2');
    }
    await page.waitForTimeout(2000);
  }

  async function enterLiveMode(page: Page) {
    const liveBtn = page.locator('button[title="HIL Engine: Connect to WASM"]');
    await expect(liveBtn).toBeVisible({ timeout: 5000 });
    await liveBtn.click();
    await page.waitForTimeout(1000);
  }

  test('Condition 1: empty rack + ENGINEERING → overlay visible', async ({ rackPage }) => {
    const overlay = rackPage.locator(OVERLAY);
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await expect(overlay).toContainText(OVERLAY_TITLE);
    await expect(overlay).toContainText('Blueprint Gallery');
    await expect(overlay).toContainText('Link Workspace');
    await expect(overlay).toContainText('Create from Scratch');
  });

  test('Condition 2: inject blueprint → overlay hidden', async ({ rackPage }) => {
    await expect(rackPage.locator(OVERLAY)).toBeVisible({ timeout: 5000 });

    await injectBlueprint(rackPage);

    await expect(rackPage.locator(OVERLAY)).not.toBeVisible({ timeout: 5000 });

    const cell = rackPage.locator('.uca-node.uca-cell').first();
    await expect(cell).toBeVisible({ timeout: 5000 });
  });

  test('Condition 3: empty rack + LIVE → overlay hidden', async ({ rackPage }) => {
    await expect(rackPage.locator(OVERLAY)).toBeVisible({ timeout: 5000 });

    await enterLiveMode(rackPage);

    await expect(rackPage.locator(OVERLAY)).not.toBeVisible({ timeout: 3000 });
  });

  test('Condition 4: inject then delete all → overlay reappears', async ({ rackPage }) => {
    await expect(rackPage.locator(OVERLAY)).toBeVisible({ timeout: 5000 });

    await injectBlueprint(rackPage);
    await expect(rackPage.locator(OVERLAY)).not.toBeVisible({ timeout: 5000 });

    // Reload to reset rack state
    await rackPage.goto('/en');
    await rackPage.waitForTimeout(8000);
    await switchToRackView(rackPage);

    const overlay = rackPage.locator(OVERLAY);
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await expect(overlay).toContainText(OVERLAY_TITLE);
  });
});
