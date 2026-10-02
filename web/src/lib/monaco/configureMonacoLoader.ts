/**
 * Configure el cargador de Monaco para que lo sirva ESTA aplicación.
 *
 * =============================================================================
 * POR QUÉ ESTE FICHERO EXISTE
 * ---------------------------
 * `@monaco-editor/react` no trae el editor dentro: trae un cargador que, si
 * nadie lo configura, descarga Monaco de un CDN. Medido en la librería
 * instalada (`@monaco-editor/loader@1.x`):
 *
 *     https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs
 *
 * `grep` sobre `src/` y `app/`: ninguna llamada a `loader.config`. Es decir,
 * que la vista de código (la pestaña "Source") **dependía de internet y de un
 * tercero**. Sin red —sin proxy, con jsdelivr bloqueado, en un despliegue con
 * CSP restrictiva— el editor se quedaba en "Loading..." para siempre, sin error
 * en consola que lo explicara.
 *
 * La ruta local la deja disponible `scripts/prepare_public_assets.mjs`
 * (destino `monaco`, `prebuild` de `web/package.json`), copiando
 * `web/node_modules/monaco-editor/min/` → `web/public/monaco/`. Se copia la build
 * AMD tal cual, con su `loader.js` y sus trozos con hash, porque es el loader
 * AMD el que instancia los *workers* del editor a partir de esa misma base: si
 * en su lugar se empaquetase el ESM con el bundler, el editor cargaría pero
 * **sin validación de JSON**, que es justo lo que `SourceView` lee para los
 * diagnósticos (`getModelMarkers`).
 *
 * `configureMonacoLoader()` es idempotente: llamarla dos veces no pisa una
 * configuración previa.
 */

import { loader } from '@monaco-editor/react';

/** Base URL desde la que se sirve el editor. Debe terminar en `/vs`. */
export const MONACO_VS_PATH = '/monaco/vs';

let configured = false;

/** Apunta el cargador de Monaco a la copia local. Llamar antes de montar `<Editor>`. */
export function configureMonacoLoader(): void {
  if (configured) return;
  configured = true;
  loader.config({ paths: { vs: MONACO_VS_PATH } });
}