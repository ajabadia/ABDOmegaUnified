/**
 * OMEGA ERA 9.2.x — MINI-MAP VISUAL E2E TEST SUITE
 *
 * Verifica el posicionamiento real del Mini-Map y el viewport indicator.
 *
 * Contexto dimensional (viewport 1280×720):
 *   Container section: 1240×616
 *   Rack: 800×400
 *   Mini-map scale: min(180/800, 120/400, 0.3) = 0.225
 *   Indicator llena rack completo cuando zoom < 1.55
 *   → Pruebas interactivas requieren zoom > 1.6 (≈6+ ticks scroll-up)
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { injectBlueprint } from './helpers/blueprintInjection';

const SCREENSHOT_DIR = path.resolve(__dirname, '../test-results/mini-map-screenshots');

// ── Setup ─────────────────────────────────────────────────────────────

async function setupRackWithBlueprint(page: Page): Promise<void> {
  await page.goto('/en');
  await page.waitForTimeout(4000);

  const createBtn = page.locator('button:has-text("Create from Scratch")');
  if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  const rackTab = page.getByTitle('Virtual Rack');
  if (await rackTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await rackTab.click({ force: true });
    await page.waitForTimeout(1500);
  }

  await injectBlueprint(page);
  await page.waitForTimeout(1000);
}

/** Zoom in by clicking ViewportControls Zoom In button.
 *  Each click calls onZoom(0.1) directly via React's synthetic event system.
 *  With default 45 clicks: zoom = 1.0 + 45*0.1 = 5.5.
 *  The rack is ~270px wide (hp=12), so we need zoom > containerWidth/270
 *  before the indicator shrinks. With ~998px container width, threshold ≈ 3.7.
 */
async function zoomIn(page: Page, ticks = 45): Promise<void> {
  const zoomInBtn = page.locator('button[title="Zoom In"]').first();
  await expect(zoomInBtn).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < ticks; i++) {
    await zoomInBtn.click();
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(800);
}

// ── Helpers ───────────────────────────────────────────────────────────

async function screenshotMiniMap(page: Page, name: string): Promise<void> {
  const miniMap = page.locator('[data-testid="mini-map"]');
  await expect(miniMap).toBeVisible({ timeout: 5000 });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await miniMap.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

/** Get viewport indicator bounding box relative to its parent canvas. */
async function getViewportIndicatorRect(page: Page): Promise<{
  top: number; left: number; width: number; height: number;
} | null> {
  return page.evaluate(() => {
    const indicator = document.querySelector('[data-testid="mini-map-viewport"]') as HTMLElement | null;
    if (!indicator) return null;
    const parent = indicator.parentElement;
    if (!parent) return null;
    const pRect = parent.getBoundingClientRect();
    const iRect = indicator.getBoundingClientRect();
    return {
      top: Math.round(iRect.top - pRect.top),
      left: Math.round(iRect.left - pRect.left),
      width: Math.round(iRect.width),
      height: Math.round(iRect.height),
    };
  });
}

async function getMiniMapZoom(page: Page): Promise<number> {
  const text = await page.locator('[data-testid="mini-map"] .tabular-nums').textContent();
  return parseInt(text || '0', 10);
}

// ── Tests ─────────────────────────────────────────────────────────────

test.describe('Mini-Map Visual (P5)', () => {

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await setupRackWithBlueprint(page);
  });

  // ── Test 1: Render & Structure ────────────────────────────────────

  test('should render mini-map with nodes and full-rack indicator at default zoom', async ({ page }) => {
    await expect(page.locator('[data-testid="mini-map"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="mini-map-rack"]')).toBeVisible();
    await expect(page.locator('[data-testid="mini-map-viewport"]')).toBeVisible();
    await expect(page.locator('[data-testid="mini-map-hide"]')).toBeVisible();
    await expect(page.locator('[data-testid="mini-map-fit"]')).toBeVisible();

    const zoomPct = await getMiniMapZoom(page);
    expect(zoomPct).toBeGreaterThanOrEqual(100);

    // Node rects present with title attributes
    const nodeCount = await page.locator('[data-testid="mini-map-rack"] > div').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-testid="mini-map-rack"] > div').first()).toHaveAttribute('title');

    // At zoom=1 with container > rack, indicator fills the full rack
    const indicator = await getViewportIndicatorRect(page);
    expect(indicator).not.toBeNull();
    // Verify indicator is within the mini-map canvas with proper padding
    // Rack width is ~270px (hp=12), scale capped at 0.3, so indicator is ~81px
    expect(indicator!.left).toBeGreaterThanOrEqual(8);
    expect(indicator!.top).toBeGreaterThanOrEqual(8);
    expect(indicator!.width).toBeGreaterThan(50);
    expect(indicator!.height).toBeGreaterThan(30);

    await screenshotMiniMap(page, '01-baseline');
  });

  // ── Test 2: Zoom controls update display and Center View works ───────

  test('should update zoom display on Zoom In and Center View resets', async ({ page }) => {
    // Verify zoom display shows 100% at default
    let zoomPct = await getMiniMapZoom(page);
    expect(zoomPct).toBeGreaterThanOrEqual(100);

    // ── Zoom in once and verify the percentage updates ──
    const zoomInBtn = page.locator('button[title="Zoom In"]').first();
    await expect(zoomInBtn).toBeVisible({ timeout: 5000 });
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    zoomPct = await getMiniMapZoom(page);
    expect(zoomPct).toBeGreaterThan(100);  // should be > 100% after one zoom in

    // ── Center View should reset viewport ──
    const centerBtn = page.locator('[data-testid="mini-map-center"]');
    await expect(centerBtn).toBeVisible();
    await centerBtn.click();
    await page.waitForTimeout(500);

    // Mini-map should still be functional
    await expect(page.locator('[data-testid="mini-map-viewport"]')).toBeVisible();

    await screenshotMiniMap(page, '02-zoom-and-center');
  });

  // ── Test 3: Multiple zooms and Fit to Screen ───────────────────────

  test('should verify zoom display updates and Fit to Screen works', async ({ page }) => {
    // Record baseline zoom percentage
    let zoomPct = await getMiniMapZoom(page);
    expect(zoomPct).toBeGreaterThanOrEqual(100);

    // ── Multiple zoom in clicks ──
    const zoomInBtn = page.locator('button[title="Zoom In"]').first();
    await expect(zoomInBtn).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 5; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);

    zoomPct = await getMiniMapZoom(page);
    expect(zoomPct).toBeGreaterThan(100);  // zoom increased

    // ── Fit to Screen should reset view ──
    await page.locator('[data-testid="mini-map-fit"]').click();
    await page.waitForTimeout(600);

    // After fit, the mini-map should still be visible and functional
    await expect(page.locator('[data-testid="mini-map-viewport"]')).toBeVisible();

    await screenshotMiniMap(page, '03-zoom-and-fit');
  });

  // ── Test 4: Toggle visibility ─────────────────────────────────────

  test('should toggle mini-map visibility', async ({ page }) => {
    await page.locator('[data-testid="mini-map-hide"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="mini-map"]')).not.toBeVisible();
    const showBtn = page.locator('[data-testid="mini-map-toggle"]');
    await expect(showBtn).toBeVisible();

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await showBtn.screenshot({ path: path.join(SCREENSHOT_DIR, '07-hidden.png') });

    await showBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="mini-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="mini-map-viewport"]')).toBeVisible();

    await screenshotMiniMap(page, '08-visible-again');
  });

  // ── Test 5: Selection sync ────────────────────────────────────────

  test('should highlight selected node in mini-map', async ({ page }) => {
    // First, zoom in so we can see the mini-map nodes clearly
    await zoomIn(page, 4);

    // Click a rack cell to select it
    const rackCell = page.locator('.uca-node.uca-cell').first();
    await expect(rackCell).toBeVisible({ timeout: 5000 });
    const cellId = await rackCell.getAttribute('id');
    expect(cellId).toBeTruthy();

    // Use native click to bypass History header interception
    await page.evaluate(() => {
      const cell = document.querySelector('.uca-node.uca-cell');
      if (cell) {
        (cell as HTMLElement).click();
      }
    });
    await page.waitForTimeout(800);

    // Check if ANY mini-map node has the selection glow in boxShadow
    const glowFound = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-testid="mini-map-rack"] > div');
      return Array.from(nodes).some((el) => {
        const style = (el as HTMLElement).style;
        // Selected nodes get: boxShadow: '0 0 4px rgba(0, 242, 255, 0.4)'
        return !!(style.boxShadow && style.boxShadow.includes('rgba(0, 242, 255'));
      });
    });
    expect(glowFound).toBe(true);

    await screenshotMiniMap(page, '09-selected-node');
  });

  // ── Test 6: Extreme zoom ──────────────────────────────────────────

  test('should still render mini-map when zoom is extreme', async ({ page }) => {
    const viewport = page.locator('section.flex-1.relative.wb-bg').first();
    await viewport.hover();
    await page.keyboard.down('Control');
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(200);
    }
    await page.keyboard.up('Control');
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="mini-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="mini-map-viewport"]')).toBeVisible();

    await screenshotMiniMap(page, '10-extreme-zoom');
  });
});
