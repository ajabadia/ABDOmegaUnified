/**
 * @jest-environment jsdom
 *
 * Tests for the dynamic "Open Shelf Module (/modules)" submenu built by
 * buildMenuItems — derived from SharedModuleCatalogService (modules/ canonical
 * source), never from a hardcoded list.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { buildMenuItems } from '../menuDefinitions';
import { SharedModuleCatalogService } from '@/services/sharedModuleCatalog';
import type { MenuBarProps } from '../MenuBar';
import type { MenuItemData } from '../menuTypes';

// ── Required MenuBar props as no-ops (mirrors MenuBar.spec.tsx) ────
const BASE_PROPS: MenuBarProps = {
  onTriggerUpload: () => {},
  onExportManifest: () => {},
  onExportPack: () => {},
  onExportOmegaRack: () => {},
  onExportCAD: () => {},
  onExportContract: () => {},
  onDeploy: () => {},
  onReset: () => {},
  onUndo: () => {},
  onRedo: () => {},
  onToggleLogs: () => {},
  onHelp: () => {},
  onGenerateMockup: () => {},
  onTabFocus: () => {},
  onOpenAudit: () => {},
  onOpenAbout: () => {},
  onOpenConfig: () => {},
};

// ── Helper: extract the Open Shelf submenu ─────────────────────────
function getShelfSubmenu(): MenuItemData[] {
  const fileMenu = buildMenuItems(BASE_PROPS).find((m) => m.id === 'file');
  const loadItem = fileMenu?.items.find((i) => i.label === 'Load');
  const shelfItem = loadItem?.submenu?.find(
    (i) => i.label === 'Open Shelf Module (/modules)'
  );
  return shelfItem?.submenu ?? [];
}

describe('buildMenuItems — Open Shelf Module submenu', () => {
  it('derives one entry per catalog module (no hardcoded list)', () => {
    const shelf = getShelfSubmenu();
    expect(shelf.length).toBe(SharedModuleCatalogService.getCatalog().length);
  });

  it('includes midi_2_cv (regression: missing from old hardcoded list)', () => {
    const labels = getShelfSubmenu().map((i) => i.label);
    expect(labels).toContain('MIDI 2 CV (midi_2_cv)');
  });

  it('labels each entry as "name (id)"', () => {
    const catalog = SharedModuleCatalogService.getCatalog();
    const labels = getShelfSubmenu().map((i) => i.label);
    for (const entry of catalog) {
      expect(labels).toContain(`${entry.name} (${entry.id})`);
    }
  });

  it('gives every module a Load Manifest action', () => {
    const shelf = getShelfSubmenu();
    for (const entry of shelf) {
      expect(entry.submenu?.map((i) => i.label)).toContain('Load Manifest');
    }
  });

  it('calls __omegaLoadShelfModule with the module id on Load Manifest', () => {
    const loadShelf = jest.fn();
    (window as unknown as { __omegaLoadShelfModule: (id: string) => void }).__omegaLoadShelfModule = loadShelf;
    const shelf = getShelfSubmenu();
    const entry = shelf.find((i) => i.label?.includes('midi_2_cv'))!;
    const loadItem = entry.submenu?.find((i) => i.label === 'Load Manifest');
    loadItem?.onClick?.();
    expect(loadShelf).toHaveBeenCalledWith('midi_2_cv');
  });

  it('enables View Source Code for modules that have a .cpp', () => {
    const shelf = getShelfSubmenu();
    const entry = shelf.find((i) => i.label?.includes('midi_2_cv'))!;
    const sourceItem = entry.submenu?.find((i) => i.label === 'View Source Code (.cpp)');
    expect(sourceItem).toBeDefined();
    expect(sourceItem?.disabled).not.toBe(true);
  });

  it('disables the source item for modules without a .cpp', () => {
    const shelf = getShelfSubmenu();
    const entry = shelf.find((i) => i.label?.includes('test_parity'))!;
    const sourceItem = entry.submenu?.find((i) => i.label === 'No source (.cpp)');
    expect(sourceItem).toBeDefined();
    expect(sourceItem?.disabled).toBe(true);
  });

  it('calls __omegaViewModuleSource with the module id on View Source', () => {
    const viewSource = jest.fn();
    (window as unknown as { __omegaViewModuleSource: (id: string) => void }).__omegaViewModuleSource = viewSource;
    const shelf = getShelfSubmenu();
    const entry = shelf.find((i) => i.label?.includes('midi_2_cv'))!;
    const sourceItem = entry.submenu?.find((i) => i.label === 'View Source Code (.cpp)');
    sourceItem?.onClick?.();
    expect(viewSource).toHaveBeenCalledWith('midi_2_cv');
  });
});
