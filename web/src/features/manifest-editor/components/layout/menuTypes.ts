'use client';

/**
 * @purpose Gestiona tipos compartidos para los menús y categorías en el editor de manifesto OMEGA.
 * @purpose_en Defines shared types for menu items and categories in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:13kg3gw
 * @lastUpdated 2026-06-20T09:40:19.795Z
 */

import type { ComponentType } from 'react';

/** A single item inside a menu dropdown */
export interface MenuItemData {
  /** 'divider' for separator, undefined for regular item */
  type?: 'item' | 'divider';
  /** Display label */
  label?: string;
  /** Lucide icon component */
  icon?: ComponentType<{ className?: string }>;
  /** Click handler */
  onClick?: () => void;
  /** Keyboard shortcut text (e.g. "Ctrl+Z") */
  shortcut?: string;
  /** Whether the item is disabled */
  disabled?: boolean | undefined;
  /** Checked state for toggle items */
  checked?: boolean | undefined;
  /** Visual highlight variant */
  highlight?: 'accent' | 'deprecated';
  /** Nested submenu items */
  submenu?: MenuItemData[];
}

/** A top-level menu category (File, Edit, View, Window, Help) */
export interface MenuCategory {
  id: string;
  label: string;
  items: MenuItemData[];
}
