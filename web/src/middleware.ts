/**
 * @purpose Gestiona internacionalización de rutas para aplicaciones Next.js utilizando middleware next-intl.
 * @purpose_en Manages internationalization of routes for Next.js applications using middleware next-intl.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1gxs51j
 * @lastUpdated 2026-06-15T15:17:51.622Z
 */

import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

/**
 * OMEGA ERA 7 MIDDLEWARE
 * Standardized next-intl integration for Next.js 15/16.
 */
export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
