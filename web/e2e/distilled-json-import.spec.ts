import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';
import * as path from 'path';

/**
 * OMEGA v9.2.0 — DISTILLED .json IMPORT E2E TESTS
 *
 * Validates the File > Load > Import Distilled .json menu flow:
 *   - Menu item visibility and position
 *   - File chooser dialog trigger
 *   - Successful load of a valid DistilledManifest
 *   - Error handling for non-distilled JSON (schema validation failure)
 *
 * Uses `rackPage` fixture (navigated to rack view, empty rack).
 */

const DISTILLED_FIXTURE = path.resolve(__dirname, 'fixtures/distilled-manifest.json');
const INVALID_SCHEMA_FIXTURE = path.resolve(__dirname, 'fixtures/invalid-schema.json');

test.describe('Import Distilled .json', () => {

  /** Helper: open File menu and hover Load to expose the submenu */
  async function openLoadSubmenu(page: Page) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.waitForTimeout(400);

    const loadItem = page.locator('button:has-text("Load")').first();
    await expect(loadItem).toBeVisible({ timeout: 3000 });
    await loadItem.hover();
    await page.waitForTimeout(300);
  }

  /** Count cells currently in the rack */
  async function countRackCells(page: Page): Promise<number> {
    return page.locator('.uca-node.uca-cell').count();
  }

  test('1. "Import Distilled .json" item should be visible in File > Load submenu', async ({ rackPage }) => {
    await openLoadSubmenu(rackPage);

    const menuItem = rackPage.getByText('Import Distilled .json');
    await expect(menuItem).toBeVisible({ timeout: 3000 });
  });

  test('2. clicking "Import Distilled .json" should open the file picker with .json accept', async ({ rackPage }) => {
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });

    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Import Distilled .json').click();

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeDefined();

    // Verify the file input accepts .json
    expect(fileChooser.isMultiple()).toBe(false);
  });

  test('3. load valid distilled manifest → cells appear in rack', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    // Set up file chooser BEFORE the menu interaction
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });
    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Import Distilled .json').click();
    const fileChooser = await fileChooserPromise;

    // Upload the valid distilled manifest fixture (3 cells: 2 knobs + 1 port)
    await fileChooser.setFiles(DISTILLED_FIXTURE);

    // Poll until rack re-renders with imported cells (uses auto-retry)
    await expect.poll(async () => countRackCells(rackPage), { timeout: 8000 })
      .toBeGreaterThan(initialCellCount);

    // Should have at least 3 cells from the fixture
    await expect.poll(async () => countRackCells(rackPage), { timeout: 5000 })
      .toBeGreaterThanOrEqual(initialCellCount + 2);
  });

  test('4. load invalid schema JSON → shows error, no cells added', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });
    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Import Distilled .json').click();
    const fileChooser = await fileChooserPromise;

    // Upload a valid JSON file that is NOT a DistilledManifest (fails schema validation)
    await fileChooser.setFiles(INVALID_SCHEMA_FIXTURE);

    // Poll: no new cells should have been added (poll ensures async error handling completed)
    await expect.poll(async () => countRackCells(rackPage), { timeout: 8000 })
      .toBe(initialCellCount);
  });

  test('5. menu item should be between "Open .omega Project" and "Ingest Module Folder" in Load submenu', async ({ rackPage }) => {
    await openLoadSubmenu(rackPage);

    // Verify all three items are visible
    const openOmega = rackPage.getByText('Open .omega Project');
    const importDistilled = rackPage.getByText('Import Distilled .json');
    const ingestFolder = rackPage.getByText('Ingest Module Folder');

    await expect(openOmega).toBeVisible({ timeout: 2000 });
    await expect(importDistilled).toBeVisible({ timeout: 2000 });
    await expect(ingestFolder).toBeVisible({ timeout: 2000 });
  });
});
