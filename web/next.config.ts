import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

const nextConfig: NextConfig = {
  // Este proyecto (`web/`) es autónomo: `node_modules`, `package.json`,
  // `package-lock.json`, `app/`, `src/` y `public/` están todos aquí dentro,
  // no hay dependencias `file:`/`workspace:`/`link:`, y el alias `@/*` solo
  // apunta a `./src/*` y `./*`. No se referencia nada por encima de `web/`.
  //
  // Aun así, sin esto Next.js sube a buscar lockfiles hacia arriba y encuentra
  // `pnpm-workspace.yaml` + `pnpm-lock.yaml` en `D:\desarrollos\ABDSynths`,
  // donde viven una docena de proyectos hermanos. Eso convertía el directorio
  // padre en la raíz del proyecto, y Turbopack pasaba a reportar sus rutas
  // como `[project]/ABDOmegaUnified/web/...` en lugar de `[project]/...`.
  outputFileTracingRoot: path.join(__dirname),

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
