/**
 * @purpose Verifica que renderModuleHTML (réplica web de
 * ManifestRenderer.renderModulePanel) emite el chassis UNIFICADO con
 * geometría completa: 3U → 432px de alto, hp → max(hp*15, 60) de ancho.
 * Garantiza la decisión de producto "Full chassis geometry": el player usa
 * resolvePanelGeometry, NO ui.dimensions.height (compacto).
 */
import fs from 'fs';
import path from 'path';
import { SharedModuleCatalogService } from '@/services/sharedModuleCatalog';
import { renderModuleHTML } from '@/features/rack-player/lib/renderModuleHTML';

const MODULES_DIR = path.join(process.cwd(), 'public', 'modules');

function serveManifest(url: string) {
  const rel = url.replace(/^\/+/, '').replace(/^modules\//, '');
  const file = path.join(MODULES_DIR, rel);
  const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
  return {
    ok: body.length > 0,
    status: body.length > 0 ? 200 : 404,
    text: async () => body,
  };
}

describe('renderModuleHTML (chassis unificado full-geometry)', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn((url: any) => Promise.resolve(serveManifest(String(url)))) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('vco (hp 8, 3U) → chassis 120×432px, no usa ui.dimensions.height', async () => {
    const manifest = await SharedModuleCatalogService.fetchManifest('vco');
    expect(manifest).toBeTruthy();

    const html = renderModuleHTML(manifest);
    expect(html).toContain('omega-module-chassis');
    expect(html).toContain('width: 120px');
    expect(html).toContain('height: 432px');
    // ui.dimensions.height del vco.acemm es 140 → NO debe aparecer compacto
    // en el tag del chassis (la guarda se limita al opening tag del chassis,
    // no a child nodes que pueden tener layout y:140 legítimo).
    const chassisTag = html.match(/<div class="omega-module-chassis[^>]*>/)?.[0] ?? '';
    expect(chassisTag).toContain('height: 432px');
    expect(chassisTag).not.toContain('height: 140px');
    expect(html).toContain('omega-node-rack');
  });

  it('todos los módulos del catálogo emiten chassis con altura rack (3U/1U)', async () => {
    const catalog = SharedModuleCatalogService.getCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(11);

    for (const entry of catalog) {
      const manifest = await SharedModuleCatalogService.fetchManifest(entry.id);
      const html = renderModuleHTML(manifest);
      expect(html).toContain('omega-module-chassis');
      expect(html).toMatch(/omega-module-chassis chassis-(1u|3u)/);
      expect(html).toMatch(/height: \d+px/);
    }
  });

  it('undefined → string vacío (misma guarda que ManifestRenderer)', () => {
    expect(renderModuleHTML(undefined)).toBe('');
  });
});
