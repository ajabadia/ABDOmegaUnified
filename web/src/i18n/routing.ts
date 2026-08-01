/**
 * @purpose Gestiona herramientas de navegación y routing para localizaciones en ABDOmegaEditor utilizando Next.js internationalization (next-intl).
 * @purpose_en Manages routing and navigation utilities for localizations in ABDOmegaEditor using Next.js internationalization (next-intl).
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:aaf9n5
 * @lastUpdated 2026-06-15T15:17:43.889Z
 */

import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'es'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
