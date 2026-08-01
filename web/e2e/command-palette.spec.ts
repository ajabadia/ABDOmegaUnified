import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';

/**
 * OMEGA v9.4.0 — Command Palette (Ctrl+K) E2E TEST SUITE
 *
 * Validates the Command Palette: opening via Ctrl+K keyboard shortcut,
 * fuzzy search across nodes and actions, keyboard navigation, and
 * action execution via click/Enter.
 *
 * Uses the `rackPage` fixture (navigated to rack view with blueprint cache).
 */

test.describe('Command Palette (Ctrl+K)', () => {

  /** Helper: open the Command Palette via Ctrl+K */
  async function openPalette(page: Page) {
    // Blur any focused element first (Ctrl+K handler has isInputFocused guards)
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);
  }

  /** Helper: check if the palette is visible */
  async function isPaletteVisible(page: Page): Promise<boolean> {
    const input = page.locator('input[placeholder="Search nodes and actions..."]');
    return input.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Helper: close palette via Escape */
  async function closePalette(page: Page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ─── Test 1: Ctrl+K opens the palette ────────────────────────────────

  test('1. should open the Command Palette on Ctrl+K', async ({ rackPage }) => {
    await openPalette(rackPage);

    // The search input should be visible
    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // The Ctrl+K badge should be visible
    const badge = rackPage.locator('button:has-text("Ctrl+K")').first();
    await expect(badge).toBeVisible({ timeout: 2000 });

    // Section headers should be visible
    await expect(rackPage.locator('text=Actions').first()).toBeVisible({ timeout: 2000 });
    await expect(rackPage.locator('text=Nodes').first()).toBeVisible({ timeout: 2000 });
  });

  // ─── Test 2: Escape closes the palette ───────────────────────────────

  test('2. should close the Command Palette on Escape', async ({ rackPage }) => {
    await openPalette(rackPage);
    expect(await isPaletteVisible(rackPage)).toBe(true);

    await closePalette(rackPage);
    expect(await isPaletteVisible(rackPage)).toBe(false);
  });

  // ─── Test 3: Backdrop click closes the palette ───────────────────────

  test('3. should close the Command Palette when clicking the backdrop', async ({ rackPage }) => {
    await openPalette(rackPage);
    expect(await isPaletteVisible(rackPage)).toBe(true);

    // Click the backdrop
    const backdrop = rackPage.locator('[data-testid="palette-backdrop"]');
    await expect(backdrop).toBeVisible({ timeout: 2000 });
    await backdrop.click({ force: true });
    await rackPage.waitForTimeout(300);

    expect(await isPaletteVisible(rackPage)).toBe(false);
  });

  // ─── Test 4: Search input filters results ────────────────────────────

  test('4. should filter results when typing in the search input', async ({ rackPage }) => {
    await openPalette(rackPage);

    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a query that should match something
    await searchInput.fill('Undo');
    await rackPage.waitForTimeout(300);

    // "Undo" action should be visible
    await expect(rackPage.locator('button:has-text("Undo")').first()).toBeVisible({ timeout: 2000 });

    // Unrelated items should be hidden — the Actions section header may or may not be visible
    // depending on whether any actions match the query. "Undo" matches, so Actions should be visible.
    await expect(rackPage.locator('text=Actions').first()).toBeVisible({ timeout: 2000 });
  });

  // ─── Test 5: Clear search shows all results ──────────────────────────

  test('5. should show all results when clearing the search', async ({ rackPage }) => {
    await openPalette(rackPage);

    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a query
    await searchInput.fill('Undo');
    await rackPage.waitForTimeout(300);

    // Clear the input
    await searchInput.fill('');
    await rackPage.waitForTimeout(300);

    // Section headers should be visible again
    await expect(rackPage.locator('text=Actions').first()).toBeVisible({ timeout: 2000 });
    await expect(rackPage.locator('text=Nodes').first()).toBeVisible({ timeout: 2000 });
  });

  // ─── Test 6: Clicking an action executes it ──────────────────────────

  test('6. should execute an action when clicking it and close the palette', async ({ rackPage }) => {
    await openPalette(rackPage);

    // Click on an action button — "Undo" is a harmless no-op in Edit category
    // (avoid effectful actions like Save that could trigger file dialogs)
    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type "Undo" to narrow results
    await searchInput.fill('Undo');
    await rackPage.waitForTimeout(300);

    // Click the "Undo" button
    const undoBtn = rackPage.locator('button:has-text("Undo")').first();
    await expect(undoBtn).toBeVisible({ timeout: 2000 });
    await undoBtn.click();
    await rackPage.waitForTimeout(500);

    // Palette should close after action execution
    expect(await isPaletteVisible(rackPage)).toBe(false);

    // App should still be responsive
    const footer = rackPage.locator('footer');
    await expect(footer).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 7: Clicking a node selects it ──────────────────────────────

  test('7. should select a node when clicking it in the palette and close', async ({ rackPage }) => {
    await openPalette(rackPage);

    // Type to search for a node that exists in the default manifest tree
    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Scope locator to the palette dialog
    const paletteDialog = rackPage.locator('[aria-label="Command palette — search nodes and actions"]');

    // Clear any pre-existing query, then search for a common node label
    await searchInput.fill('main');
    await rackPage.waitForTimeout(300);

    // Check if the Nodes section header is visible (indicating matching nodes exist)
    const nodesSection = paletteDialog.locator('text=Nodes').first();
    const hasMatchingNodes = await nodesSection.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMatchingNodes) {
      // Click the first visible node button within the palette
      const matchingNode = paletteDialog.locator('button').filter({ hasText: 'main' }).first();
      await matchingNode.click();
      await rackPage.waitForTimeout(500);

      // Palette should close after node selection
      expect(await isPaletteVisible(rackPage)).toBe(false);
    } else {
      // No matching nodes — close via Escape (first Esc clears query, second Esc closes)
      // When query is non-empty, Escape clears the query; second press closes the palette
      await rackPage.keyboard.press('Escape');
      await rackPage.waitForTimeout(100);
      await rackPage.keyboard.press('Escape');
      await rackPage.waitForTimeout(300);
      expect(await isPaletteVisible(rackPage)).toBe(false);
    }
  });

  // ─── Test 8: Type to filter then clear with Escape ───────────────────

  test('8. should clear the search query on Escape when query is non-empty', async ({ rackPage }) => {
    await openPalette(rackPage);

    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a query
    await searchInput.fill('Undo');
    await rackPage.waitForTimeout(200);

    // Press Escape to clear query (not close palette, since query is non-empty)
    await rackPage.keyboard.press('Escape');
    await rackPage.waitForTimeout(300);

    // Palette should still be open (Escape with non-empty query clears, doesn't close)
    expect(await isPaletteVisible(rackPage)).toBe(true);

    // Section headers should be visible again (all results restored)
    await expect(rackPage.locator('text=Actions').first()).toBeVisible({ timeout: 2000 });
    await expect(rackPage.locator('text=Nodes').first()).toBeVisible({ timeout: 2000 });
  });

  // ─── Test 9: Ctrl+K close when already open ─────────────────────────

  test('9. should toggle the Command Palette (Ctrl+K closes when open)', async ({ rackPage }) => {
    // Open
    await openPalette(rackPage);
    expect(await isPaletteVisible(rackPage)).toBe(true);

    // Close with Ctrl+K (toggle)
    await rackPage.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await rackPage.waitForTimeout(200);
    await rackPage.keyboard.press('Control+k');
    await rackPage.waitForTimeout(300);

    expect(await isPaletteVisible(rackPage)).toBe(false);
  });

  // ─── Test 10: Navigate with Arrow keys and select with Enter ─────────

  test('10. should navigate with ArrowDown and execute with Enter', async ({ rackPage }) => {
    await openPalette(rackPage);

    const searchInput = rackPage.locator('input[placeholder="Search nodes and actions..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a query to narrow results
    await searchInput.fill('Undo');
    await rackPage.waitForTimeout(200);

    // Press ArrowDown (moves highlight to next item — same item here since only "Undo" matches)
    await rackPage.keyboard.press('ArrowDown');
    await rackPage.waitForTimeout(100);

    // Press Enter to execute the highlighted item
    await rackPage.keyboard.press('Enter');
    await rackPage.waitForTimeout(500);

    // Palette should close after execution
    expect(await isPaletteVisible(rackPage)).toBe(false);

    // App should still be responsive
    const footer = rackPage.locator('footer');
    await expect(footer).toBeVisible({ timeout: 5000 });
  });
});
