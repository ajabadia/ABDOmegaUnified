import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * @deprecated Use the fixture-based setup from `e2e/fixtures/omegaFixtures.ts` instead.
 *
 * This helper is still functional but no longer the primary injection path.
 * New tests should use the `rackPage` or `pageWithBlueprint` fixtures which
 * provide pre-cached blueprint JSON data and pre-navigated rack view.
 * The helper is kept for backward compatibility with existing tests that
 * call `injectBlueprint()` mid-test (e.g., sequential injections).
 *
 * Selector for the gallery toggle button in the floating toolbar.
 * Title attribute comes from the Toolbar component.
 * v9.2.0-dev: now opens BlueprintLibraryPanel (right dock) instead of TemplateGallery modal.
 */
const GALLERY_BTN_SELECTOR = 'button[title="Blueprints & Templates (B)"]';

/**
 * Selector for a fully-rendered cell in the rack.
 * Replaces a fixed `waitForTimeout(2000)` after the blueprint card click
 * with a deterministic wait — the cell must be present in the DOM before
 * any post-injection assertions can be trusted.
 */
const RACK_CELL_SELECTOR = '.uca-node.uca-cell';

/**
 * Selector for the Official Store tab button — reliable panel-open marker.
 * The BlueprintLibraryPanel's placeholder text varies by activeTab, so using
 * a stable button label is more robust than attribute selectors.
 */
const OFFICIAL_TAB_SELECTOR = 'button:has-text("Official Store")';

/**
 * Default blueprint to inject. "Industrial VCF" adds 1 knob cell with proper
 * renderer — the most reliable cell type for follow-up assertions.
 */
export const DEFAULT_BLUEPRINT_LABEL = 'Industrial VCF';

/**
 * Options for the shared blueprint injection helper.
 */
export interface InjectBlueprintOptions {
  /** Label of the blueprint entry to click. Defaults to "Industrial VCF". */
  blueprintLabel?: string;
  /**
   * Maximum time to wait for the catalog to load and the blueprint entry
   * to become visible in the BlueprintLibraryPanel (ms). Default 10_000.
   */
  panelLoadTimeoutMs?: number;
  /**
   * Maximum time to wait for the injected cell to appear in the rack (ms).
   * Default 10_000.
   */
  cellAppearTimeoutMs?: number;
}

/**
 * Inject a blueprint into the rack via the BlueprintLibraryPanel.
 *
 * v9.2.0-dev: The Toolbar's gallery button now opens the BlueprintLibraryPanel
 * (right dock) instead of the TemplateGallery modal. The panel loads the catalog
 * from /blueprints/v2/index.json and fetches each blueprint's JSON data.
 *
 * Flow:
 *   1. Click the gallery toggle button in the floating toolbar
 *   2. Wait for the BlueprintLibraryPanel to mount and catalog to load
 *   3. Click the blueprint entry matching `blueprintLabel`
 *   4. Wait for the cell to be added to the rack
 *
 * This is the single source of truth for blueprint injection across all e2e
 * tests. Previously duplicated as `injectDefaultBlueprint` and `injectBlueprint`
 * in `e2e/rack-features.spec.ts` (Fix candidato C from v9.1.8-dev addendum).
 *
 * @param page - Playwright Page instance
 * @param options - Optional configuration
 */
export async function injectBlueprint(
  page: Page,
  options: InjectBlueprintOptions = {}
): Promise<void> {
  const {
    blueprintLabel = DEFAULT_BLUEPRINT_LABEL,
    panelLoadTimeoutMs = 10_000,
    cellAppearTimeoutMs = 10_000,
  } = options;

  // 1. Open the gallery (Toolbar button → toggles BlueprintLibraryPanel via window_blueprints)
  //    First check if panel is already open to avoid toggle-closing it (critical for sequential
  //    injections like test 4 which calls injectBlueprint twice).
  const officialTab = page.locator(OFFICIAL_TAB_SELECTOR);
  if (!(await officialTab.isVisible({ timeout: 1000 }).catch(() => false))) {
    const galleryBtn = page.locator(GALLERY_BTN_SELECTOR);
    await expect(galleryBtn).toBeVisible({ timeout: 10_000 });
    await galleryBtn.click();
    await expect(officialTab).toBeVisible({ timeout: 8_000 });
  }

  // 3. Wait for catalog data: the blueprint entry uses .cursor-pointer class
  //    and shows the blueprint label. When visible, bp.data has loaded.
  const bpEntry = page.locator('.cursor-pointer', { hasText: blueprintLabel }).first();
  await expect(bpEntry).toBeVisible({ timeout: panelLoadTimeoutMs });

  // 4. Click the blueprint entry → calls onSelectBlueprint(bp.data) → injection
  await bpEntry.click();

  // 5. Wait deterministically for the injected cell to be mounted in the rack
  await page.waitForSelector(RACK_CELL_SELECTOR, {
    state: 'visible',
    timeout: cellAppearTimeoutMs,
  });
}
