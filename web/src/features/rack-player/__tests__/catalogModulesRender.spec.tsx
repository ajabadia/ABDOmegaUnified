/**
 * @purpose Verifica que TODOS los mÃ³dulos del catÃ¡logo ACEMM regenerado
 * (incl. los 5 DSP P0: vco, vcf, adsr, vca, lfo) atraviesan el pipeline
 * UCA de render sin error: manifestToTree â†’ resolveNodeSemantics,
 * el mismo que usa RackPlayerContainer.
 *
 * fetch se mockea para servir los .acemm reales desde public/modules
 * (jest no tiene servidor HTTP).
 */
import fs from 'fs';
import path from 'path';
import { SharedModuleCatalogService } from '@/services/sharedModuleCatalog';
import { manifestToTree } from '@/omega-ui-core/uca/ucaBridge';
import { resolveNodeSemantics } from '@/omega-ui-core/uca/ucaSemantics';

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

describe('catÃ¡logo ACEMM â†’ pipeline UCA de render', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn((url: any) => Promise.resolve(serveManifest(String(url)))) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('todos los mÃ³dulos del catÃ¡logo compilan a tree y semÃ¡ntica sin error', async () => {
    const catalog = SharedModuleCatalogService.getCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(11);

    const dspIds = ['vco', 'vcf', 'adsr', 'vca', 'lfo'];
    for (const id of dspIds) {
      expect(catalog.some((m) => m.id === id)).toBe(true);
    }

    for (const entry of catalog) {
      const manifest = await SharedModuleCatalogService.fetchManifest(entry.id);
      expect(manifest).toBeTruthy();

      const tree = manifestToTree(manifest);
      expect(tree).toBeTruthy();
      expect(['rack', 'container'].includes(tree.kind)).toBe(true);

      let ports = 0;
      const visit = (node: any) => {
        if (!node) return;
        if (node.cellRef === 'port') ports++;
        (node.children || []).forEach(visit);
      };
      visit(tree);
      if (ports === 0) {
        console.warn(`[catalogModulesRender] ${entry.id} no produjo nodos 'port' en el tree`);
      }
      expect(ports).toBeGreaterThan(0);

      const semantics = resolveNodeSemantics(tree, {
        catalog: manifest.moduleTemplates || {},
      });
      expect(semantics).toBeDefined();
    }
  });

  it('los 5 módulos DSP producen jacks "port" en el tree UCA', async () => {
    const dspIds = ['vco', 'vcf', 'adsr', 'vca', 'lfo'];

    for (const id of dspIds) {
      const manifest = await SharedModuleCatalogService.fetchManifest(id);
      const tree = manifestToTree(manifest);

      let ports = 0;
      const visit = (node: any) => {
        if (!node) return;
        if (node.cellRef === 'port') ports++;
        (node.children || []).forEach(visit);
      };
      visit(tree);
      expect(ports).toBeGreaterThan(0);
      expect(tree).toBeTruthy();
    }
  });

  it('los 5 módulos DSP exponen jacks de puerto en el panel', async () => {
    const expectedPorts: Record<string, string[]> = {
      vco: ['v_oct', 'fm', 'pwm', 'sync', 'out', 'sub_out'],
      vcf: ['in', 'cutoff_cv', 'res_cv', 'out'],
      adsr: ['gate_in', 'out'],
      vca: ['in', 'gate_in', 'out'],
      lfo: ['out'],
    };

    for (const [id, portBinds] of Object.entries(expectedPorts)) {
      const manifest = await SharedModuleCatalogService.fetchManifest(id);
      const uiControls: any[] = manifest?.ui?.controls ?? [];
      const boundPorts = uiControls
        .filter((c) => c.presentation?.component === 'port')
        .map((c) => c.bind);

      expect(boundPorts).toEqual(expect.arrayContaining(portBinds));
      expect(boundPorts.length).toBe(portBinds.length);
    }
  });
});

