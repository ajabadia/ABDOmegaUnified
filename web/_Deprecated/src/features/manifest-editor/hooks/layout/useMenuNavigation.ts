'use client';

/**
 * @purpose Hook que gestiona la navegación por teclado del menú, cierre al hacer clic fuera y auto-foco.
 * @purpose_en Hook that manages menu keyboard navigation, click-outside closing, and auto-focus.
 * @classification Hook
 * @complexity Low
 */

import { useState, useRef, useEffect, useCallback } from 'react';

const ARIA_MENU_ITEM = 'button[role="menuitem"], button[role="menuitemcheckbox"]';

export interface UseMenuNavigationOptions {
  menuIds: string[];
}

export interface UseMenuNavigationReturn {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  handleMenuBarKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  handleItemKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, menuId: string) => void;
  closeMenu: () => void;
}

/**
 * Hook que maneja:
 * - Estado del menú activo
 * - Navegación por teclado entre menús (ArrowLeft/Right, ArrowDown, Escape, Home/End)
 * - Navegación por teclado dentro de items (ArrowDown/Up, Escape, Home/End)
 * - Cierre al hacer clic fuera
 * - Auto-foco del primer item al abrir un menú
 */
export function useMenuNavigation({
  menuIds,
}: UseMenuNavigationOptions): UseMenuNavigationReturn {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
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
        const firstItem = container.querySelector<HTMLButtonElement>(ARIA_MENU_ITEM);
        firstItem?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeMenu]);

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  const handleMenuBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const currentIdx = activeMenu ? menuIds.indexOf(activeMenu) : -1;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % menuIds.length;
        setActiveMenu(menuIds[nextIdx]);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIdx = currentIdx < 0 ? 0 : (currentIdx - 1 + menuIds.length) % menuIds.length;
        setActiveMenu(menuIds[prevIdx]);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (!activeMenu && menuIds.length > 0) setActiveMenu(menuIds[0]);
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setActiveMenu(null);
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (menuIds.length > 0) setActiveMenu(menuIds[0]);
        break;
      }
      case 'End': {
        e.preventDefault();
        if (menuIds.length > 0) setActiveMenu(menuIds[menuIds.length - 1]);
        break;
      }
    }
  }, [activeMenu, menuIds]);

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, menuId: string) => {
    const container = menuRef.current?.querySelector(`[data-menu-id="${menuId}"]`);
    if (!container) return;
    const items = Array.from(container.querySelectorAll<HTMLButtonElement>(ARIA_MENU_ITEM));
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

  return {
    activeMenu,
    setActiveMenu,
    menuRef,
    handleMenuBarKeyDown,
    handleItemKeyDown,
    closeMenu,
  };
}
