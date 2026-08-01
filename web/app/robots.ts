/**
 * @purpose Gestiona un archivo robots.txt para propósitos de SEO, especificando rutas permitidas e inhabilitadas y proporcionando una URL de mapa de sitios.
 * @purpose_en Generates a robots.txt file for SEO purposes, specifying allowed and disallowed paths and providing a sitemap URL.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:c9ywjv
 * @lastUpdated 2026-06-15T17:04:14.709Z
 */

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/'],
    },
    sitemap: 'https://abdsynths.com/sitemap.xml',
  };
}
