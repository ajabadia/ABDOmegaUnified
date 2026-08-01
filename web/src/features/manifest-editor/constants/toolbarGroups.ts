/**
 * @purpose Mapa estático de IDs de botones del toolbar a sus categorías visuales para insertar divisores.
 * @purpose_en Static map of toolbar button IDs to their visual categories for divider insertion.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1g8k2m
 * @lastUpdated 2026-06-21T00:00:00.000Z
 */

import type { ToolbarButtonGroup } from './toolbarDefinitions';

/** Categoría visual de cada botón del toolbar (usado para insertar divisores) */
export const BUTTON_GROUPS: Record<string, ToolbarButtonGroup> = {
  select: 'tools',
  marquee: 'tools',
  transform: 'tools',
  add: 'tools',
  studio: 'edit',
  group: 'edit',
  ungroup: 'edit',
  blueprints: 'views',
  config: 'views',
  live: 'system',
  zen: 'system',
};
