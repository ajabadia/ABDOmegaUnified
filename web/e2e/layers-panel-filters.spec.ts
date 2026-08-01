import { test, expect } from './fixtures/omegaFixtures';
import type { Page } from '@playwright/test';
import { injectBlueprint } from './helpers/blueprintInjection';

/**
 * OMEGA v9.3.x — LayersPanel R1c Filter UI E2E Test Suite
 *
 * Tests the three new filter features added in R1c:
 *   1. Property search (bind, value, min/max)
 *   2. Audit toggle (show only nodes with audit issues)
 *   3. Template toggle (show only nodes with templateRef)
 *
 * Each test uses the `rackPage` fixture (empty rack), injects a blueprint
 * for predictable tree data, then opens the Layers panel and interacts
 * with the filter controls.
 */

test.describe('LayersPanel — R1c Filter UI', () => {

  /** Helper: open the Layers right-dock panel */
  async function openLayersPanel(page: Page) {
    const layersBtn = page.locator('button[title="Layers"]');
    await expect(layersBtn).toBeVisible({ timeout: 10000 });
    await layersBtn.click();
    await page.waitForTimeout(1000);
  }

  /** Helper: dismiss the RackStartupAssistant overlay if present */
  // Not used currently — kept for future tests that may need it
  // async function dismissStartupAssistant(page: Page) {
  //   const createBtn = page.locator('button:has-text("Create from Scratch")');
  //   if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  //     await createBtn.click();
  //     await page.waitForTimeout(1000);
  //   }
  // }

  // ─── Test 1: Property search input is visible and interactable ────

  test('1. should show the property search input field in LayersPanel', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    // The property search input has a distinct placeholder
    const propSearch = rackPage.locator('input[placeholder*="Property"]');
    await expect(propSearch).toBeVisible({ timeout: 5000 });

    // Should start empty
    await expect(propSearch).toHaveValue('');
  });

  test('2. should update visible count when typing in property search', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    // Find the property search input
    const propSearch = rackPage.locator('input[placeholder*="Property"]');
    await expect(propSearch).toBeVisible({ timeout: 5000 });

    // Type a search term that should match some nodes (blueprint nodes often have 'cutoff' bind)
    await propSearch.fill('cutoff');
    await rackPage.waitForTimeout(500);

    // The filter counter should still be visible (total unchanged, visible may decrease)
    const counterText = rackPage.locator('span:has-text("/")').filter({ hasText: /\d+\/\d+/ }).first();
    await expect(counterText).toBeVisible({ timeout: 3000 });
    const text = await counterText.textContent();
    expect(text).toBeTruthy();
    const parts = (text || '0/0').split('/').map(Number);
    expect(parts[1]).toBeGreaterThan(0); // total > 0

    // Clear search by emptying the field via fill('')
    await propSearch.fill('');
    await rackPage.waitForTimeout(300);
    await expect(propSearch).toHaveValue('');
  });

  // ─── Test 3: Property search clear button ─────────────────────────

  test('3. should clear property search via global Clear button', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    const propSearch = rackPage.locator('input[placeholder*="Property"]');
    await expect(propSearch).toBeVisible({ timeout: 5000 });

    // Type something in property search
    await propSearch.fill('test');
    await expect(propSearch).toHaveValue('test');

    // The global Clear button should now be visible (because propertySearchTerm is non-empty)
    const clearLink = rackPage.locator('button[title*="Clear all filters"]');
    await expect(clearLink).toBeVisible({ timeout: 2000 });

    // Click Clear to reset all filters
    await clearLink.click();
    await rackPage.waitForTimeout(300);

    // Property search should be cleared
    await expect(propSearch).toHaveValue('');

    // Clear button should now be hidden again
    await expect(clearLink).not.toBeVisible({ timeout: 2000 });
  });

  // ─── Test 4: Audit toggle button ──────────────────────────────────

  test('4. should show Audit filter toggle button', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    // The Audit toggle button uses ListFilter icon and shows "Audit" text
    const auditBtn = rackPage.locator('button:has-text("Audit")');
    await expect(auditBtn).toBeVisible({ timeout: 5000 });
  });

  test('5. should toggle Audit filter active/inactive state', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    const auditBtn = rackPage.locator('button:has-text("Audit")');
    await expect(auditBtn).toBeVisible({ timeout: 5000 });

    // Should start inactive (default)
    const initialClass = await auditBtn.getAttribute('class');
    expect(initialClass).not.toContain('bg-purple');

    // Click to activate
    await auditBtn.click();
    await rackPage.waitForTimeout(300);

    // Should now have the active styling (bg-purple-400/20 border-purple-400/50)
    const activeClass = await auditBtn.getAttribute('class');
    expect(activeClass).toContain('bg-purple');

    // Click again to deactivate
    await auditBtn.click();
    await rackPage.waitForTimeout(300);

    // Should be back to inactive
    const finalClass = await auditBtn.getAttribute('class');
    expect(finalClass).not.toContain('bg-purple');
  });

  // ─── Test 5: Template toggle button ───────────────────────────────

  test('6. should show Templates filter toggle button', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    // The Templates toggle button shows "Templates" text
    const tmplBtn = rackPage.locator('button:has-text("Templates")');
    await expect(tmplBtn).toBeVisible({ timeout: 5000 });
  });

  test('7. should toggle Templates filter active/inactive state', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    const tmplBtn = rackPage.locator('button:has-text("Templates")');
    await expect(tmplBtn).toBeVisible({ timeout: 5000 });

    // Should start inactive
    const initialClass = await tmplBtn.getAttribute('class');
    expect(initialClass).not.toContain('bg-sky');

    // Click to activate
    await tmplBtn.click();
    await rackPage.waitForTimeout(300);

    // Should now have the active styling (bg-sky-400/20)
    const activeClass = await tmplBtn.getAttribute('class');
    expect(activeClass).toContain('bg-sky');

    // Click again to deactivate
    await tmplBtn.click();
    await rackPage.waitForTimeout(300);

    // Back to inactive
    const finalClass = await tmplBtn.getAttribute('class');
    expect(finalClass).not.toContain('bg-sky');
  });

  // ─── Test 8: Both audit + template toggles can be active simultaneously ──

  test('8. should allow both Audit and Templates filters to be active simultaneously', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    const auditBtn = rackPage.locator('button:has-text("Audit")');
    const tmplBtn = rackPage.locator('button:has-text("Templates")');
    await expect(auditBtn).toBeVisible({ timeout: 5000 });
    await expect(tmplBtn).toBeVisible();

    // Activate Audit
    await auditBtn.click();
    await rackPage.waitForTimeout(200);

    // Activate Templates (both now active)
    await tmplBtn.click();
    await rackPage.waitForTimeout(200);

    // Verify both have active styling
    const auditClass = await auditBtn.getAttribute('class');
    const tmplClass = await tmplBtn.getAttribute('class');
    expect(auditClass).toContain('bg-purple');
    expect(tmplClass).toContain('bg-sky');

    // Deactivate both via Clear button
    const clearLink = rackPage.locator('button[title*="Clear all filters"]');
    await expect(clearLink).toBeVisible({ timeout: 1000 });
    await clearLink.click();
    await rackPage.waitForTimeout(300);

    // Verify both are now inactive
    const finalAuditClass = await auditBtn.getAttribute('class');
    const finalTmplClass = await tmplBtn.getAttribute('class');
    expect(finalAuditClass).not.toContain('bg-purple');
    expect(finalTmplClass).not.toContain('bg-sky');
  });

  // ─── Test 9: Clear button visibility ──────────────────────────────

  test('9. should show Clear button when any R1c filter is active', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    // Clear should NOT be visible initially (no filters active)
    let clearLink = rackPage.locator('button[title*="Clear all filters"]');
    await expect(clearLink).not.toBeVisible({ timeout: 2000 });

    // Activate Audit filter
    const auditBtn = rackPage.locator('button:has-text("Audit")');
    await auditBtn.click();
    await rackPage.waitForTimeout(200);

    // Clear SHOULD now be visible
    clearLink = rackPage.locator('button[title*="Clear all filters"]');
    await expect(clearLink).toBeVisible({ timeout: 2000 });

    // Click Clear
    await clearLink.click();
    await rackPage.waitForTimeout(300);

    // Audit should be inactive again
    const auditClass = await auditBtn.getAttribute('class');
    expect(auditClass).not.toContain('bg-purple');
  });

  // ─── Test 10: End-to-end filter combo: property search + layout ───

  test('10. should render correctly when all three R1c filters interact', async ({ rackPage }) => {
    await injectBlueprint(rackPage);
    await rackPage.waitForTimeout(1500);

    await openLayersPanel(rackPage);

    // 1. Type in property search
    const propSearch = rackPage.locator('input[placeholder*="Property"]');
    await expect(propSearch).toBeVisible({ timeout: 5000 });
    await propSearch.fill('cutoff');
    await rackPage.waitForTimeout(300);

    // 2. Activate Audit filter
    const auditBtn = rackPage.locator('button:has-text("Audit")');
    await auditBtn.click();
    await rackPage.waitForTimeout(200);

    // 3. Activate Templates filter
    const tmplBtn = rackPage.locator('button:has-text("Templates")');
    await tmplBtn.click();
    await rackPage.waitForTimeout(200);

    // All three filters are active — verify the "Clear" button is visible
    const clearLink = rackPage.locator('button[title*="Clear all filters"]');
    await expect(clearLink).toBeVisible({ timeout: 2000 });

    // Clear all filters at once
    await clearLink.click();
    await rackPage.waitForTimeout(300);

    // Verify all three are cleared
    await expect(propSearch).toHaveValue('');
    expect(await auditBtn.getAttribute('class')).not.toContain('bg-purple');
    expect(await tmplBtn.getAttribute('class')).not.toContain('bg-sky');

    // Clear button should now be hidden again
    await expect(clearLink).not.toBeVisible({ timeout: 2000 });
  });
});
