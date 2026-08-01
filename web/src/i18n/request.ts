/**
 * @purpose Gestiona solicitudes para archivos de mensaje específicos para el editor de manifesto locales de OMEGA.
 * @purpose_en Manages requests for specific message files for OMEGA manifest editor locales.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:0,imports:2,sig:1nkwygk
 * @lastUpdated 2026-06-15T15:17:39.210Z
 */

import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // This should correspond to the [locale] segment
  let locale = await requestLocale;
 
  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as "en" | "es")) {
    locale = routing.defaultLocale;
  }
 
  return {
    locale,
    messages: {
      common: (await import(`../../messages/${locale}/common.json`)).default,
      home: (await import(`../../messages/${locale}/home.json`)).default,
      instruments: (await import(`../../messages/${locale}/instruments.json`)).default,
      contact: (await import(`../../messages/${locale}/contact.json`)).default
    }
  };
});
