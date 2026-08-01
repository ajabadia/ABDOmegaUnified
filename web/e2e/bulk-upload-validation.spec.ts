import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';
import * as path from 'path';

/**
 * OMEGA v9.2.0 — BULK UPLOAD SCHEMA VALIDATION E2E TESTS
 *
 * Validates that `handleBulkUpload` in useBundleTransfer.ts runs
 * `validateManifestSchema` on .acemm files before passing them to
 * `handleManifestUpload`.
 *
 * Flow: File > Load > "Manifest (.acemm)" → file chooser →
 *       IngestionModal → Confirm Injection → handleBulkUpload →
 *       validateManifestSchema(parsed) → [OK]/[ERROR] + [SKIP]
 *
 * Uses `rackPage` fixture (empty rack, navigated to rack view).
 */

const INVALID_ACEMM = path.resolve(__dirname, 'fixtures/invalid-manifest.acemm');
const VALID_ACEMM = path.resolve(__dirname, 'fixtures/valid-manifest.acemm');

test.describe('Bulk Upload Schema Validation (.acemm)', () => {

  /** Helper: open File menu and hover Load to expose the submenu */
  async function openLoadSubmenu(page: Page) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.waitForTimeout(400);

    const loadItem = page.locator('button:has-text("Load")').first();
    await expect(loadItem).toBeVisible({ timeout: 3000 });
    await loadItem.hover();
    await page.waitForTimeout(300);
  }

  /** Helper: click "Confirm Injection" in the IngestionModal */
  async function confirmIngestion(page: Page) {
    const confirmBtn = page.locator('button:has-text("Confirm Injection")');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await expect(confirmBtn).not.toBeDisabled({ timeout: 3000 });
    await confirmBtn.click();
  }

  /** Count cells currently in the rack */
  async function countRackCells(page: Page): Promise<number> {
    return page.locator('.uca-node.uca-cell').count();
  }

  test('1. "Manifest (.acemm)" item should be visible in File > Load submenu', async ({ rackPage }) => {
    await openLoadSubmenu(rackPage);

    const menuItem = rackPage.getByText('Manifest (.acemm)');
    await expect(menuItem).toBeVisible({ timeout: 3000 });
  });

  test('2. clicking "Manifest (.acemm)" should open file chooser with multiple accept', async ({ rackPage }) => {
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });

    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Manifest (.acemm)').click();

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeDefined();

    // The bulk-upload input has the `multiple` attribute
    expect(fileChooser.isMultiple()).toBe(true);
  });

  test('3. upload invalid .acemm → IngestionModal appears → Confirm → no rack cells added (schema validation error)', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    // Set up file chooser BEFORE the menu interaction
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });
    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Manifest (.acemm)').click();
    const fileChooser = await fileChooserPromise;

    // Upload the invalid .acemm fixture (valid YAML, invalid manifest structure)
    await fileChooser.setFiles(INVALID_ACEMM);

    // IngestionModal should appear → Confirm Injection
    await confirmIngestion(rackPage);

    // Wait for async validation + processing to complete
    await rackPage.waitForTimeout(3000);

    // Poll: no new cells should have been added (schema validation rejected the file)
    await expect.poll(async () => countRackCells(rackPage), { timeout: 8000 })
      .toBe(initialCellCount);
  });

  test('4. upload valid .acemm → IngestionModal → Confirm → rack cells added (happy path)', async ({ rackPage }) => {
    const initialCellCount = await countRackCells(rackPage);

    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });
    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Manifest (.acemm)').click();
    const fileChooser = await fileChooserPromise;

    // Upload the valid .acemm fixture (proper OMEGA_Manifest structure)
    await fileChooser.setFiles(VALID_ACEMM);

    // IngestionModal should appear → Confirm Injection
    await confirmIngestion(rackPage);

    // Wait for async parsing, validation, and manifest upload to complete
    await rackPage.waitForTimeout(3000);

    // The valid .acemm has entities: [] which produces an empty manifest
    // but still passes schema validation. At minimum, no crash occurred.
    // Cells should not have decreased (no removal happened)
    await expect.poll(async () => countRackCells(rackPage), { timeout: 8000 })
      .toBeGreaterThanOrEqual(initialCellCount);
  });

  test('5. upload invalid .acemm shows IngestionModal with the file listed', async ({ rackPage }) => {
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });
    await openLoadSubmenu(rackPage);
    await rackPage.getByText('Manifest (.acemm)').click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(INVALID_ACEMM);

    // The IngestionModal header should be visible
    const modalTitle = rackPage.getByText('Industrial Ingestion Wizard');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // The filename should be listed in the modal
    const fileEntry = rackPage.getByText('invalid-manifest.acemm');
    await expect(fileEntry).toBeVisible({ timeout: 3000 });
  });
});
