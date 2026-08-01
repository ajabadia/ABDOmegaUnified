import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * OMEGA v9.9.1 — Toolbar E2E Test Suite
 *
 * Covers toolbar interactions NOT already tested by other E2E specs:
 *   - Tool selection (click + active state)
 *   - Add flyout (open + inject primitive)
 *   - Toolbar customize popover (open + toggle visibility + reset)
 *   - Live mode toggle
 *   - Zen mode toggle
 *   - Keyboard shortcuts for tool switching
 *   - Draggable toolbar repositioning
 *   - Numeric resize/rotate popovers (selection-gated)
 */

const ONBOARDING_KEY = 'omega_onboarding_completed';

/** Mark onboarding tour as completed before page load. */
async function suppressOnboarding(page: Page) {
  await page.addInitScript(`
    (function() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('${ONBOARDING_KEY}', 'true');
      }
    })();
  `);
}

/** Toolbar selectors */
const TOOLBAR = 'div[role="toolbar"][aria-label="Floating tools"]';
const SELECT_BTN = `${TOOLBAR} button[title="Select & Move Tool (V)"]`;
const MARQUEE_BTN = `${TOOLBAR} button[title="Marquee Selection Tool (M)"]`;
const TRANSFORM_BTN = `${TOOLBAR} button[title="Transform/Scale Tool (T)"]`;
const ADD_BTN = `${TOOLBAR} button[title="Add Primitives & Ports (A)"]`;
const BLUEPRINTS_BTN = `${TOOLBAR} button[title="Blueprints & Templates (B)"]`;
const CONFIG_BTN = `${TOOLBAR} button[title="Module Signature & Governance"]`;
const LIVE_BTN = `${TOOLBAR} button[title*="HIL Engine"]`;
const ZEN_BTN = `${TOOLBAR} button[title*="Zen Mode"]`;
const CUSTOMIZE_BTN = `${TOOLBAR} button[title="Customize Toolbar"]`;
const NUMERIC_RESIZE_BTN = `${TOOLBAR} button[title="Numeric Resize (Ctrl+Alt+R)"]`;
const NUMERIC_ROTATE_BTN = `${TOOLBAR} button[title="Numeric Rotate (Ctrl+Alt+T)"]`;

/** Flyout anchor — use text content, not CSS classes */
const FLYOUT_HEADER = 'text=Inject Component';

test.describe('Toolbar — Tool Selection', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should render the floating toolbar with role="toolbar"', async ({ page }) => {
    const toolbar = page.locator(TOOLBAR);
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    await expect(toolbar).toHaveAttribute('role', 'toolbar');
    await expect(toolbar).toHaveAttribute('aria-label', 'Floating tools');
  });

  test('should have Select tool active by default', async ({ page }) => {
    const selectBtn = page.locator(SELECT_BTN);
    await expect(selectBtn).toBeVisible({ timeout: 5000 });
    // Select tool should have aria-pressed="true" when active
    await expect(selectBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch active tool when clicking Marquee', async ({ page }) => {
    await page.locator(MARQUEE_BTN).click();
    await page.waitForTimeout(300);

    // Marquee should now be active
    await expect(page.locator(MARQUEE_BTN)).toHaveAttribute('aria-pressed', 'true');
    // Select should be inactive
    await expect(page.locator(SELECT_BTN)).toHaveAttribute('aria-pressed', 'false');
  });

  test('should switch active tool when clicking Transform', async ({ page }) => {
    await page.locator(TRANSFORM_BTN).click();
    await page.waitForTimeout(300);

    await expect(page.locator(TRANSFORM_BTN)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(SELECT_BTN)).toHaveAttribute('aria-pressed', 'false');
  });

  test('should switch active tool when clicking Add', async ({ page }) => {
    await page.locator(ADD_BTN).click();
    await page.waitForTimeout(300);

    await expect(page.locator(ADD_BTN)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(SELECT_BTN)).toHaveAttribute('aria-pressed', 'false');
  });

  test('should revert to Select tool after adding a primitive from the flyout', async ({ page }) => {
    // Click Add to open flyout
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });

    // Click Knob in the flyout
    await page.locator('button:has-text("Knob")').click();
    await page.waitForTimeout(1000);

    // Should revert to Select tool after adding
    await expect(page.locator(SELECT_BTN)).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Toolbar — Add Flyout', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should open the add flyout when clicking the Add button', async ({ page }) => {
    await page.locator(ADD_BTN).click();

    // Should contain "Inject Component" header
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });
  });

  test('should show primitive buttons (Knob, Slider, Switch, etc.)', async ({ page }) => {
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });

    // Verify key primitives are listed
    for (const label of ['Knob', 'Slider (V)', 'Button', 'Switch', 'LED Light']) {
      await expect(page.getByRole('button', { name: label }).first()).toBeVisible();
    }
  });

  test('should show port groups (Audio, CV, Gate, MIDI)', async ({ page }) => {
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });

    for (const label of ['Audio', 'CV', 'Gate/Trig', 'MIDI']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('should inject a Knob primitive into the rack', async ({ page }) => {
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: 'Knob' }).click();
    await page.waitForTimeout(1500);

    // A cell should appear in the rack
    const cell = page.locator('.uca-node.uca-cell').first();
    await expect(cell).toBeVisible({ timeout: 5000 });
  });

  test('should inject an Audio In port', async ({ page }) => {
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });

    // Click the Audio In button
    await page.getByRole('button', { name: 'Audio input port' }).click();
    await page.waitForTimeout(1500);

    // A port node should appear in the rack
    const port = page.locator('.uca-node.uca-port').first();
    await expect(port).toBeVisible({ timeout: 5000 });
  });

  test('should close the flyout when clicking a primitive', async ({ page }) => {
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: 'Knob' }).click();

    // Flyout should close (header no longer visible)
    await expect(page.locator(FLYOUT_HEADER)).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Toolbar — Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should switch to Marquee via "M" key', async ({ page }) => {
    // Shortcuts are global document-level listeners
    await page.keyboard.press('m');
    await expect(page.locator(MARQUEE_BTN)).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch to Transform via "T" key', async ({ page }) => {
    await page.keyboard.press('t');
    await expect(page.locator(TRANSFORM_BTN)).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch to Add via "A" key', async ({ page }) => {
    await page.keyboard.press('a');
    await expect(page.locator(ADD_BTN)).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch to Select via "V" key', async ({ page }) => {
    // First switch to Marquee
    await page.keyboard.press('m');
    await expect(page.locator(MARQUEE_BTN)).toHaveAttribute('aria-pressed', 'true');

    // Now switch back to Select
    await page.keyboard.press('v');
    await expect(page.locator(SELECT_BTN)).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Toolbar — Live Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should toggle live mode on click without crashing', async ({ page }) => {
    const liveBtn = page.locator(LIVE_BTN);
    await expect(liveBtn).toBeVisible({ timeout: 5000 });

    // Initial state: not live (title contains "Connect")
    const initialTitle = await liveBtn.getAttribute('title');
    expect(initialTitle).toContain('Connect');

    // Click — WASM may not be available, so we just verify no crash
    await liveBtn.click();
    await page.waitForTimeout(500);

    // Button should still be visible and functional after click
    await expect(liveBtn).toBeVisible();
  });
});

test.describe('Toolbar — Zen Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should toggle zen mode on click', async ({ page }) => {
    const zenBtn = page.locator(ZEN_BTN);
    await expect(zenBtn).toBeVisible({ timeout: 5000 });

    // Initial state: not zen (title "Enter Zen Mode")
    const initialTitle = await zenBtn.getAttribute('title');
    expect(initialTitle).toContain('Enter Zen Mode');

    await zenBtn.click();
    await page.waitForTimeout(500);

    // After click: title should change to "Exit Zen Mode"
    const newTitle = await zenBtn.getAttribute('title');
    expect(newTitle).toContain('Exit Zen Mode');
  });

  test('should exit zen mode on second click', async ({ page }) => {
    const zenBtn = page.locator(ZEN_BTN);
    await expect(zenBtn).toBeVisible({ timeout: 5000 });

    // Enter zen
    await zenBtn.click();
    await page.waitForTimeout(500);
    await expect(zenBtn).toHaveAttribute('title', 'Exit Zen Mode');

    // Exit zen
    await zenBtn.click();
    await page.waitForTimeout(500);
    await expect(zenBtn).toHaveAttribute('title', 'Enter Zen Mode');
  });
});

test.describe('Toolbar — Customize Popover', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should open the customize popover when clicking the gear icon', async ({ page }) => {
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);

    // Popover should appear with "Customize Toolbar" header
    await expect(page.locator('text=Customize Toolbar')).toBeVisible({ timeout: 3000 });
  });

  test('should show all non-conditional buttons in the customize list', async ({ page }) => {
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);

    // Non-conditional buttons: select, marquee, transform, add, blueprints, config, live, zen
    for (const label of ['Select Tool', 'Marquee Select', 'Transform Tool', 'Add Primitives', 'Blueprints', 'Config', 'Live Mode', 'Zen Mode']) {
      await expect(page.locator(`text=${label}`)).toBeVisible();
    }
  });

  test('should show visibility toggle for each button', async ({ page }) => {
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);

    // Each row has a toggle button with "Show button" or "Hide button" aria-label
    const toggleBtns = page.locator('[aria-label="Hide button"]');
    const count = await toggleBtns.count();
    expect(count).toBeGreaterThanOrEqual(5); // At least 5 buttons should be visible
  });

  test('should toggle button visibility and update the toolbar', async ({ page }) => {
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);

    // Find the "Zen Mode" row and click its visibility toggle to hide it
    // Use the last Hide button (Zen Mode is the last non-conditional button)
    const hideButtons = page.locator('[aria-label="Hide button"]');
    const hideCount = await hideButtons.count();
    await hideButtons.last().click();
    await page.waitForTimeout(500);

    // The customize popover should now show one fewer visible button
    const newHideCount = await page.locator('[aria-label="Hide button"]').count();
    expect(newHideCount).toBe(hideCount - 1);

    // Re-open customize and restore
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);
    const showButtons = page.locator('[aria-label="Show button"]');
    await showButtons.last().click();
    await page.waitForTimeout(500);
  });

  test('should reset to default when clicking Reset', async ({ page }) => {
    // First hide a button
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);

    // Hide the last visible button (Zen Mode)
    await page.locator('[aria-label="Hide button"]').last().click();
    await page.waitForTimeout(300);

    // Click Reset
    const resetBtn = page.locator('button:has-text("Reset")');
    await resetBtn.click();
    await page.waitForTimeout(500);

    // All buttons should be visible again
    const visibleToggles = page.locator('[aria-label="Hide button"]');
    const count = await visibleToggles.count();
    expect(count).toBeGreaterThanOrEqual(7); // Default: most buttons visible
  });

  test('should close the customize popover on Escape key', async ({ page }) => {
    await page.locator(CUSTOMIZE_BTN).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Customize Toolbar')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Customize Toolbar')).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Toolbar — Draggable Repositioning', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should be draggable to a new position', async ({ page }) => {
    const toolbar = page.locator(TOOLBAR);
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    const box = await toolbar.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;

    // Drag the toolbar by 100px right and 50px down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX + 100 * (i / 10), startY + 50 * (i / 10));
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const newBox = await toolbar.boundingBox();
    expect(newBox).not.toBeNull();

    // The toolbar should have moved (at least 50px in one direction to account for drag elasticity)
    const movedX = Math.abs(newBox!.x - box!.x);
    const movedY = Math.abs(newBox!.y - box!.y);
    expect(movedX + movedY).toBeGreaterThan(30);
  });
});

test.describe('Toolbar — Blueprints & Config Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should open Blueprint Library panel when clicking Blueprints button', async ({ page }) => {
    await page.locator(BLUEPRINTS_BTN).click();
    await page.waitForTimeout(1000);

    // The BlueprintLibraryPanel should open (Official Store tab visible)
    await expect(page.locator('button:has-text("Official Store")')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle the Config/Properties panel when clicking Config button', async ({ page }) => {
    await page.locator(CONFIG_BTN).click();
    await page.waitForTimeout(1000);

    // The Properties panel should open in the right dock
    const propsPanel = page.locator('button[title="Properties"]');
    await expect(propsPanel).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Toolbar — Selection-Gated Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await suppressOnboarding(page);
    await page.goto('/en');
    await page.waitForTimeout(4000);
  });

  test('should not show Studio/Numeric buttons when nothing is selected', async ({ page }) => {
    // Studio, numeric-resize, numeric-rotate are conditional on selectedNodeId
    await expect(page.locator(`${TOOLBAR} button[title="Universal Cell Laboratory (Studio)"]`)).not.toBeVisible();
    await expect(page.locator(NUMERIC_RESIZE_BTN)).not.toBeVisible();
    await expect(page.locator(NUMERIC_ROTATE_BTN)).not.toBeVisible();
  });

  test('should show Studio, Numeric Resize and Numeric Rotate when a node is selected', async ({ page }) => {
    // First inject a cell via the Add flyout
    await page.locator(ADD_BTN).click();
    await expect(page.locator(FLYOUT_HEADER)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Knob' }).click();
    await page.waitForTimeout(1500);

    // Click on the cell to select it
    const cell = page.locator('.uca-node.uca-cell').first();
    await expect(cell).toBeVisible({ timeout: 5000 });
    await cell.click({ force: true });
    await page.waitForTimeout(500);

    // All selection-gated buttons should now be visible
    const studioBtn = page.locator(`${TOOLBAR} button[title="Universal Cell Laboratory (Studio)"]`);
    await expect(studioBtn).toBeVisible({ timeout: 3000 });
    await expect(page.locator(NUMERIC_RESIZE_BTN)).toBeVisible({ timeout: 3000 });
    await expect(page.locator(NUMERIC_ROTATE_BTN)).toBeVisible({ timeout: 3000 });
  });
});
