import { test, expect } from '@playwright/test';

/**
 * OMEGA — Internationalized routing
 *
 * ESTE TEST EXISTE PORQUE EL ENRUTADO POR LOCALE ESTUVO ROTA Y NADIE LO VIÓ
 *
 * `/editor` devolvía 404 en vez de redirigir a `/en/editor`, y `/en-US/editor`
 * hacía lo mismo. Todo lo demás de la app funcionaba: las páginas se servían
 * directamente, el editor cargaba, las pruebas E2E existentes pasaban. El
 * síntoma parecía un problema de rutas y no de middlewares, y la causa estaba
 * a dos capas de distancia (un backslash descartado al extraer `config.matcher`
 * y, por encima, un archivo en `src/` que Turbopack nunca llegaba a ejecutar).
 *
 * Estos asserts son de nivel HTTP a propósito: `request` sigue las redirecciones
 * con `maxRedirects: 0` para poder distinguir "redirige a /en/editor" (bien) de
 * "vuelve 200 porque alguien ya normalizó la URL" (también bien, pero otra
 * cosa) de "404" (el bug).
 */

const LOCALES = ['en', 'es'] as const;

test.describe('locale routing', () => {
  test('/ redirects to the default locale', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/en');
  });

  test('the editor is reachable WITHOUT the locale prefix', async ({ request }) => {
    // Este es el assert que falla con el bug: 404 en vez de 307.
    const response = await request.get('/editor', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toBe('/en/editor');
  });

  test('the player is reachable WITHOUT the locale prefix', async ({ request }) => {
    const response = await request.get('/player', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toBe('/en/player');
  });

  test('an already-localized route is served, not redirected', async ({ request }) => {
    for (const locale of LOCALES) {
      const response = await request.get(`/${locale}/editor`, { maxRedirects: 0 });
      expect(response.status(), `/${locale}/editor should be 200`).toBe(200);
    }
  });
});

test.describe('locale detection', () => {
  test('Accept-Language: es lands on the Spanish locale', async ({ request }) => {
    const response = await request.get('/', {
      maxRedirects: 0,
      headers: { 'Accept-Language': 'es-ES,es;q=0.9' },
    });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toBe('/es');
  });

  test('an unsupported language falls back to the default locale', async ({ request }) => {
    // `fr` no está en `routing.locales`. El fallback a `en` es el
    // comportamiento correcto; una redirección a `/fr` sería un 404 detrás.
    const response = await request.get('/', {
      maxRedirects: 0,
      headers: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
    });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toBe('/en');
  });
});

test.describe('paths that must bypass the proxy', () => {
  // La lookahead negativa del matcher existe para esto. Si alguien la
  // rompiera (como pasó con el `\.` perdido), las APIs empezarían a recibir
  // redirecciones de locale y el cliente dejaría de funcionar.
  test('API routes are not redirected', async ({ request }) => {
    const response = await request.get('/api/modules', { maxRedirects: 0 });
    expect(response.status()).not.toBe(307);
  });

  test('static assets are served directly', async ({ request }) => {
    const response = await request.get('/favicon.ico', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });
});
