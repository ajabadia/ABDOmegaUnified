'use client';

/**
 * @purpose Renderiza el menú principal del editor de manifesto OMEGA con navegación por teclado.
 * @purpose_en Renders the main menu bar for the OMEGA manifest editor with keyboard navigation.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:5,sig:1s7zrro
 * @lastUpdated 2026-06-20T09:40:09.921Z
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { buildMenuItems } from './menuDefinitions';
import MenuItem from './MenuItem';

// Static menu IDs — never changes between renders
const MENU_IDS = ['file', 'edit', 'view', 'window', 'help'];

export interface MenuBarProps {
  onTriggerUpload: (id: string) => void;
  onExportManifest: (mode: 'work' | 'distilled') => void;
  onExportPack: () => void;
  onExportOmegaRack: () => void;
  onExportCAD: () => void;
  onExportContract: (format: 'ts' | 'cpp') => void;
  onDeploy: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLogs: () => void;
  showLogs?: boolean | undefined;
  onHelp: () => void;
  onGenerateMockup: () => void;
  onTabFocus: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  onOpenAudit: () => void;
  onOpenAbout: () => void;
  onOpenConfig: () => void;
  onOpenCellEditor?: (() => void) | undefined;
  onToggleTour?: (() => void) | undefined;
  onOpenGallery?: (() => void) | undefined;
  onImportDistilledJson?: (() => void) | undefined;
  onLinkDirectory?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;
  gridVisible?: boolean | undefined;
  onToggleGrid?: (() => void) | undefined;
  showGuides?: boolean | undefined;
  onToggleGuides?: (() => void) | undefined;
  miniMapVisible?: boolean | undefined;
  onToggleMiniMap?: (() => void) | undefined;
  windowStates?: { window_layers: boolean; window_properties: boolean; window_rack_properties: boolean; window_blueprints: boolean; window_compliance: boolean; window_info: boolean; window_history: boolean; window_logs: boolean } | undefined;
  onToggleWindow?: ((name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void) | undefined;
  selectedNodeId?: string | null | undefined;
  multiSelectedIds?: string[] | undefined;
  onSaveCellAsBlueprint?: (() => void) | undefined;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  onSetInspectorLevel?: ((level: 'simple' | 'medium' | 'advanced') => void) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  onUpdateManifest?: ((updates: Partial<OMEGA_Manifest>) => void) | undefined;
  rackSections?: {
    identity: boolean;
    essentialIdentity: boolean;
    identityBranding: boolean;
    globalUiSkin: boolean;
    activeConstructionPlane: boolean;
    moduleTaxonomy: boolean;
    physicalEmulationProfile: boolean;
    aestheticsGlobals: boolean;
    aestheticsElements: boolean;
    architecture: boolean;
    diagnostics?: boolean;
  } | undefined;
  onToggleRackSection?: ((section: 'identity' | 'essentialIdentity' | 'identityBranding' | 'globalUiSkin' | 'activeConstructionPlane' | 'moduleTaxonomy' | 'physicalEmulationProfile' | 'aestheticsGlobals' | 'aestheticsElements' | 'architecture' | 'diagnostics') => void) | undefined;
  onSetTool?: ((tool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null) => void) | undefined;
  onOpenNumericResize?: (() => void) | undefined;
  onOpenNumericRotate?: (() => void) | undefined;
  onCopyTransform?: (() => void) | undefined;
  onPasteTransform?: (() => void) | undefined;
  onAlign?: ((dir: string) => void) | undefined;
  onDistribute?: ((dir: string) => void) | undefined;

  // Clipboard actions
  onCopy?: (() => void) | undefined;
  onCut?: (() => void) | undefined;
  onPaste?: (() => void) | undefined;
  canCopy?: boolean | undefined;
  canCut?: boolean | undefined;
  canPaste?: boolean | undefined;
  isLiveMode?: boolean | undefined;
}

export default function MenuBar(props: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Build menu definitions from props (memoized)
  const menus = useMemo(() => buildMenuItems(props), [props]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus first item when a menu opens
  useEffect(() => {
    if (!activeMenu) return;
    const timer = setTimeout(() => {
      const container = menuRef.current?.querySelector(`[data-menu-id="${activeMenu}"]`);
      if (container) {
        const firstItem = container.querySelector<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]');
        firstItem?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeMenu]);

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  const handleMenuBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const currentIdx = activeMenu ? MENU_IDS.indexOf(activeMenu) : -1;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % MENU_IDS.length;
        setActiveMenu(MENU_IDS[nextIdx]);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIdx = currentIdx < 0 ? 0 : (currentIdx - 1 + MENU_IDS.length) % MENU_IDS.length;
        setActiveMenu(MENU_IDS[prevIdx]);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (!activeMenu && MENU_IDS.length > 0) setActiveMenu(MENU_IDS[0]);
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setActiveMenu(null);
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (MENU_IDS.length > 0) setActiveMenu(MENU_IDS[0]);
        break;
      }
      case 'End': {
        e.preventDefault();
        if (MENU_IDS.length > 0) setActiveMenu(MENU_IDS[MENU_IDS.length - 1]);
        break;
      }
    }
  }, [activeMenu]);

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, menuId: string) => {
    const container = menuRef.current?.querySelector(`[data-menu-id="${menuId}"]`);
    if (!container) return;
    const items = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]'));
    const currentIdx = items.indexOf(e.currentTarget);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        items[(currentIdx + 1) % items.length]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        items[(currentIdx - 1 + items.length) % items.length]?.focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setActiveMenu(null);
        const trigger = menuRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${menuId}"]`);
        trigger?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
    }
  }, []);

  return (
    <nav
      className="flex items-center"
      ref={menuRef}
      role="menubar"
      aria-label="Main menu"
      onKeyDown={handleMenuBarKeyDown}
    >
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            data-menu-trigger={menu.id}
            aria-haspopup="true"
            aria-expanded={activeMenu === menu.id}
            className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
              activeMenu === menu.id ? 'bg-primary text-black' : 'hover:bg-white/5 wb-text-muted hover:wb-text'
            }`}
          >
            {menu.label}
          </button>

          <AnimatePresence>
            {activeMenu === menu.id && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.1 }}
                className="absolute left-0 mt-0 w-56 bg-[#0a0a0b] border border-outline shadow-2xl z-[110] py-1"
                role="menu"
                data-menu-id={menu.id}
              >
                {menu.items.map((item, idx) => (
                  <MenuItem key={idx} item={item} closeMenu={closeMenu} menuId={menu.id} onItemKeyDown={handleItemKeyDown} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </nav>
  );
}
