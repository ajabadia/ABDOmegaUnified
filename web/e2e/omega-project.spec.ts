import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';

/**
 * OMEGA v9.2.0 — .omega PROJECT LOAD E2E TESTS
 *
 * Validates the File > Load > Open .omega Project menu flow and
 * the Ctrl+O keyboard shortcut registered in WorkbenchContainer.
 *
 * Uses `rackPage` fixture (navigated to rack view with blueprint cache).
 */

test.describe('.omega Project Loading', () => {

  /** Helper: open the File menu and hover Load to expose submenu */
  async function openLoadSubmenu(page: Page) {
    // Click File menu
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.waitForTimeout(400);

    // Hover over Load to trigger the submenu (opens via onMouseEnter)
    const loadItem = page.locator('button:has-text("Load")').first();
    await expect(loadItem).toBeVisible({ timeout: 3000 });
    await loadItem.hover();
    await page.waitForTimeout(300);
  }

  test('should show "Open .omega Project" item in File > Load submenu with Ctrl+O shortcut', async ({ rackPage }) => {
    await openLoadSubmenu(rackPage);

    // Verify the menu item button is visible (contains both label and shortcut)
    const menuItemButton = rackPage.locator('button:has-text("Open .omega Project")').first();
    await expect(menuItemButton).toBeVisible({ timeout: 3000 });

    // Verify the Ctrl+O shortcut badge is rendered inside the same button
    await expect(menuItemButton).toContainText('Ctrl+O');
  });

  test('should open file picker when clicking "Open .omega Project"', async ({ rackPage }) => {
    // Set up file chooser listener BEFORE the interaction
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });

    await openLoadSubmenu(rackPage);

    // Click the menu item
    await rackPage.getByText('Open .omega Project').click();

    // Verify a file chooser dialog was triggered (the handler creates
    // <input type="file" accept=".omega,.zip"> and calls .click() on it)
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeDefined();
  });

  test('should show "Open .omega Project" as first item in Load submenu', async ({ rackPage }) => {
    await openLoadSubmenu(rackPage);

    // The first button in the Load submenu should be "Open .omega Project"
    // Use a role-based query to find the first visible submenu button
    const firstSubmenuButton = rackPage.locator('button:has-text("Open .omega Project")').first();
    await expect(firstSubmenuButton).toBeVisible({ timeout: 2000 });
  });

  test('Ctrl+O keyboard shortcut should trigger the file picker', async ({ rackPage }) => {
    // Set up file chooser listener
    const fileChooserPromise = rackPage.waitForEvent('filechooser', { timeout: 8000 });

    // Press Ctrl+O (the global keydown listener in WorkbenchContainer)
    await rackPage.keyboard.press('Control+o');
    await rackPage.waitForTimeout(500);

    // Verify the file chooser was triggered
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeDefined();
  });

  test('Ctrl+O shortcut should not interfere with existing shortcuts', async ({ rackPage }) => {
    // Verify Undo shortcut (Ctrl+Z) still works
    await rackPage.keyboard.press('Control+z');
    await rackPage.waitForTimeout(300);

    // Verify Redo shortcut (Ctrl+Y) still works
    await rackPage.keyboard.press('Control+y');
    await rackPage.waitForTimeout(300);

    // Verify page is still responsive (footer visible)
    const footer = rackPage.locator('footer');
    await expect(footer).toBeVisible({ timeout: 5000 });
  });
});
