import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';
import { injectBlueprint } from './helpers/blueprintInjection';

/**
 * OMEGA v9.2.0 - BLUEPRINT INJECTION E2E TEST SUITE
 * Validates the full blueprint injection pipeline via the
 * BlueprintLibraryPanel (right dock).
 *
 * Fixture-based: each test receives a `rackPage` already navigated to
 * rack view with blueprint JSON data pre-cached (zero network delay).
 *
 * Blueprints loaded from /blueprints/v2/index.json:
 *   - standard_vcf  → "Industrial VCF"      (1 knob cell)
 *   - stereo_io     → "Stereo I/O Block"     (2 port cells)
 *   - osc_macro_block → "VCO Macro Block"    (label + knob + port)
 *   - performance_8_grid → "Perf. 8-Grid"    (8 knob cells, flat V2 format)
 */

test.describe('Blueprint Injection', () => {

  /** Shared helper: open the BlueprintLibraryPanel in the right dock (used by test 7) */
  async function openBlueprintPanel(page: Page) {
    const officialTab = page.locator('button', { hasText: 'Official Store' }).first();
    if (await officialTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }
    const bpDockIcon = page.locator('button[title="Blueprint Library"]');
    await expect(bpDockIcon).toBeVisible({ timeout: 5000 });
    await bpDockIcon.click();
    await expect(officialTab).toBeVisible({ timeout: 8000 });
  }

  /** Count cells currently in the rack */
  async function countRackCells(page: Page): Promise<number> {
    return page.locator('.uca-node.uca-cell').count();
  }

  test('1. should open gallery and inject "Industrial VCF" blueprint', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    await injectBlueprint(rackPage);

    const newCellCount = await countRackCells(rackPage);
    expect(newCellCount).toBeGreaterThan(initialCellCount);

    const vcfContainer = rackPage.locator('.uca-node.uca-container').first();
    await expect(vcfContainer).toBeVisible({ timeout: 5000 });
  });

  test('2. should inject "Stereo I/O Block" and verify stereo ports', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    await injectBlueprint(rackPage, { blueprintLabel: 'Stereo I/O Block' });

    const newCellCount = await countRackCells(rackPage);
    expect(newCellCount).toBeGreaterThanOrEqual(initialCellCount + 2);
  });

  test('3. should inject "Performance 8-Grid" with all 8 knob cells', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    await injectBlueprint(rackPage, { blueprintLabel: 'Performance 8-Grid' });

    const cellCount = await countRackCells(rackPage);
    expect(cellCount).toBeGreaterThanOrEqual(initialCellCount + 8);

    const containerCount = await rackPage.locator('.uca-node.uca-container').count();
    expect(containerCount).toBeGreaterThanOrEqual(1);
  });

  test('4. should inject multiple blueprints sequentially', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    const afterFirst = await countRackCells(rackPage);

    await injectBlueprint(rackPage, { blueprintLabel: 'Stereo I/O Block' });
    const afterSecond = await countRackCells(rackPage);

    expect(afterSecond).toBeGreaterThan(afterFirst);
    expect(afterFirst).toBeGreaterThan(0);
    expect(afterSecond).toBeGreaterThanOrEqual(3);
  });

  test('5. should inject "VCO Macro Block" with complex structure', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    await injectBlueprint(rackPage, { blueprintLabel: 'VCO Macro Block' });

    const cellCount = await countRackCells(rackPage);
    expect(cellCount).toBeGreaterThanOrEqual(initialCellCount + 2);

    const containerCount = await rackPage.locator('.uca-node.uca-container').count();
    expect(containerCount).toBeGreaterThanOrEqual(1);
  });

  test('6. should open/close BlueprintLibraryPanel without affecting rack state', async ({ rackPage }) => {
    const cellsBefore = await countRackCells(rackPage);

    const galleryBtn = rackPage.locator('button[title="Blueprints & Templates (B)"]');
    await expect(galleryBtn).toBeVisible({ timeout: 5000 });
    await galleryBtn.click();

    const officialTab = rackPage.locator('button', { hasText: 'Official Store' }).first();
    await expect(officialTab).toBeVisible({ timeout: 8000 });

    const bpDockIcon = rackPage.locator('button[title="Blueprint Library"]');
    await expect(bpDockIcon).toBeVisible({ timeout: 5000 });
    await bpDockIcon.click();

    await expect(officialTab).not.toBeVisible({ timeout: 5000 });

    const cellsAfter = await countRackCells(rackPage);
    expect(cellsAfter).toBe(cellsBefore);
  });

  test('7. should inject from BlueprintLibraryPanel in the right dock', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    await openBlueprintPanel(rackPage);

    const vcfEntry = rackPage.locator('.cursor-pointer', { hasText: 'Industrial VCF' }).first();
    await expect(vcfEntry).toBeVisible({ timeout: 5000 });
    await vcfEntry.click();

    await expect.poll(async () => countRackCells(rackPage), { timeout: 5000 }).toBeGreaterThan(initialCellCount);
  });

  test('8. should render new cells as interactive (click-to-select after injection)', async ({ rackPage }) => {
    await injectBlueprint(rackPage);

    const firstCell = rackPage.locator('.uca-node.uca-cell').first();
    await expect(firstCell).toBeVisible({ timeout: 5000 });

    // Dispatch both pointerdown (for the new onPointerDown selection handler) and
    // click (for the onTap/onClick fallback) to ensure selection via either path.
    await firstCell.evaluate(el => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    // Also dispatch click for backward compatibility with non-draggable nodes
    await firstCell.evaluate(el => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // The cell should now have a cyan selection outline (2px solid #00f2ff)
    await expect.poll(async () =>
      firstCell.evaluate(el => getComputedStyle(el).outline),
      { timeout: 5000, intervals: [100, 200, 500] }
    ).toContain('rgb(0, 242, 255)');
  });
});
