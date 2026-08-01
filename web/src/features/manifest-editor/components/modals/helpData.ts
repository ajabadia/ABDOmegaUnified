/**
 * @purpose Gestiona y exporta ayuda de secciones de datos para el editor de manifesto OMEGA, combinando manual del usuario y del desarrollador en un solo arreglo.
 * @purpose_en Manages and exports help data sections for the OMEGA manifest editor, combining user and developer manuals into a single array.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:3,sig:17z2kvx
 * @lastUpdated 2026-06-19T18:47:48.241Z
 */

export type { HelpSection, HelpSubsection } from './helpDataTypes';
export { USER_SECTIONS } from './helpDataUser';
export { DEVELOPER_SECTIONS } from './helpDataDeveloper';

import type { HelpSection } from './helpDataTypes';
import { USER_SECTIONS } from './helpDataUser';
import { DEVELOPER_SECTIONS } from './helpDataDeveloper';

/**
 * HELP_DATA — Array completo de secciones del manual de ingeniería.
 * Combina secciones de usuario + desarrollador en un solo array.
 */
export const HELP_DATA: HelpSection[] = [...USER_SECTIONS, ...DEVELOPER_SECTIONS];
