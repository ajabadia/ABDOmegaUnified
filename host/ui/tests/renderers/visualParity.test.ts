/**
 * Visual Parity — editor vs runtime (CellRenderer single source of truth)
 *
 * Verifica que el renderizado de celdas del manifiesto es idéntico entre los
 * dos entornos que consumen omega-ui-core:
 *
 *  1. SINGLE SOURCE OF TRUTH (junction): `host/ui/omega-ui-core` y
 *     `web/src/omega-ui-core` deben ser byte-idénticos (el junction NTFS hace
 *     que ambos apunten al mismo archivo físico). Si alguien reemplazara el
 *     junction por una copia divergente, este test lo detecta.
 *
 *  2. PARIDAD DE CALL SITES (editor vs runtime): el editor (CellPreview /
 *     useCellStudioPreview) y el runtime (templates.renderItemHTML /
 *     ManifestRenderer) construyen las CellOptions con campos distintos.
 *     Para el MISMO manifiesto, ambos deben producir el MISMO control-cell.
 *
 *  3. GOLDEN SNAPSHOT: el HTML de celda del manifiesto canónico queda
 *     congelado — cualquier cambio en el engine compartido (desde cualquiera
 *     de los dos lados) rompe el test y fuerza una revisión consciente.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { CellRenderer } from '../../omega-ui-core/renderers/CellRenderer';
import { buildCellOptions } from '../../omega-ui-core/renderers/cellOptions';
import { AssetResolver } from '../../src/Util/AssetResolver';
import { renderItemHTML, buildPanelHTML } from '../../src/Renderers/templates';
import { ManifestRenderer } from '../../src/Renderers/ManifestRenderer';
import { renderRackHTML } from '../../omega-ui-core/renderers/chassisRenderer';

// Ruta real (sin el prefijo virtual @fs que vitest inyecta en import.meta.url).
// Nota: asumen el layout del repo — el test vive en host/ui/tests/renderers/ y
// sube hasta la raíz para leer web/src/omega-ui-core (fuente canónica vía junction).
const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const HOST_CORE_DIR = resolve(TEST_DIR, '../../omega-ui-core');
const WEB_CORE_DIR = resolve(TEST_DIR, '../../../../web/src/omega-ui-core');

// ---------------------------------------------------------------------------
// Fixture canónico (mismo manifiesto para ambos entornos)
// ---------------------------------------------------------------------------

const CANONICAL_MANIFEST: any = {
  schemaVersion: '7.0',
  id: 'parity_fixture',
  metadata: {
    name: 'Parity Fixture',
    family: 'TEST',
    version: '1.0.0',
    author: 'parity',
    rack: { hp: 8, units: '3U', width: 8 },
  },
  ui: {
    skin: 'industrial',
    dimensions: { width: 120, height: 420 },
    layout: { width: 120, height: 420, containers: [], planes: ['MAIN'], tabStyles: {} },
    styles: {},
    palette: {},
    controls: [
      { id: 'cutoff', bind: 'cutoff', kind: 'knob', pos: { x: 10, y: 20 }, style: { variant: 'B_cyan' }, presentation: { component: 'knob', tab: 'MAIN' } },
      { id: 'res', bind: 'res', kind: 'slider-v', pos: { x: 50, y: 20 }, style: { variant: 'B_orange' }, presentation: { component: 'slider-v' } },
      { id: 'sync_led', bind: 'sync', kind: 'led', pos: { x: 90, y: 20 }, style: { variant: 'B_green' }, presentation: { component: 'led' } },
      { id: 'bpm', bind: 'bpm', kind: 'display', pos: { x: 10, y: 120 }, style: { variant: 'B_cyan' }, presentation: { component: 'display' } },
      { id: 'bypass', bind: 'bypass', kind: 'switch', pos: { x: 90, y: 120 }, style: { variant: 'B_red' }, presentation: { component: 'switch' } },
    ],
    jacks: [
      { id: 'cv_in', bind: 'cv_in', kind: 'port', pos: { x: 10, y: 300 }, style: { variant: 'B_cyan' }, presentation: { component: 'port' } },
      { id: 'audio_out', bind: 'audio_out', kind: 'port', pos: { x: 90, y: 300 }, style: { variant: 'B_cyan' }, presentation: { component: 'port' } },
    ],
  },
  resources: { wasm: 'internal', assets: [] },
};

function allItems(): any[] {
  return [...(CANONICAL_MANIFEST.ui.controls as any[]), ...(CANONICAL_MANIFEST.ui.jacks as any[])];
}

/** Firma estructural del control-cell: wrapper + variant + data-node-id. */
function cellSignature(html: string): string {
  const match = html.match(/<div class="control-cell[^"]*"[^>]*data-node-id="[^"]*"/);
  if (!match) return html;
  return match[0].replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// 1. Single source of truth (junction)
// ---------------------------------------------------------------------------

describe('visual parity — single source of truth (junction)', () => {
  const files = ['renderers/CellRenderer.ts', 'renderers/cellRendererMap.ts', 'renderers/chassisRenderer.ts', 'renderers/cellOptions.ts'];

  it.each(files)('%s es byte-idéntico entre host/ui y web/src', (rel) => {
    const hostBytes = readFileSync(resolve(HOST_CORE_DIR, rel), 'utf8');
    const webBytes = readFileSync(resolve(WEB_CORE_DIR, rel), 'utf8');
    expect(hostBytes).toBe(webBytes);
  });
});

// ---------------------------------------------------------------------------
// 2. Paridad de call sites (editor vs runtime)
// ---------------------------------------------------------------------------

describe('visual parity — editor vs runtime cell HTML', () => {
  it('cada control/jack produce el mismo control-cell desde ambos call sites', () => {
    for (const item of allItems()) {
      // AMBOS contratos se construyen con el builder compartido (buildCellOptions),
      // la misma vía que usan CellPreview (editor) y templates.renderItemHTML (runtime):
      // si los defaults del builder cambian, ambos lados derivan los mismos valores
      // y el test de paridad lo detecta al comparar el HTML producido.
      // Zoom:1 fija la escala para comparar la celda pura, sin transformaciones.
      const editorHTML = CellRenderer.renderCellHTML(item, buildCellOptions(undefined, {
        skin: 'industrial',
        zoom: 1,
        runtimeValue: 0.5,
        steps: 100,
        isLiveMode: false,
        resolveAsset: (ref) => ref,
      }));

      // Contrato RUNTIME (templates.renderItemHTML): idem + manifest + isLiveMode:true
      const runtimeHTML = CellRenderer.renderCellHTML(item, buildCellOptions(CANONICAL_MANIFEST, {
        skin: 'industrial',
        zoom: 1,
        runtimeValue: 0.5,
        steps: 100,
        isLiveMode: true,
        resolveAsset: (ref) => `/${CANONICAL_MANIFEST.id}/${ref}`,
      }));

      // Misma firma estructural (wrapper + variant + data-node-id)
      expect(cellSignature(editorHTML)).toBe(cellSignature(runtimeHTML));
      // El id del nodo está presente en ambos
      expect(editorHTML).toContain(`data-node-id="${item.id}"`);
      expect(runtimeHTML).toContain(`data-node-id="${item.id}"`);
      // Ambos emiten la clase control-cell
      expect(editorHTML).toContain('control-cell');
      expect(runtimeHTML).toContain('control-cell');
    }
  });

  it('el wrapper del runtime (renderItemHTML) embebe la celda canónica sin alterarla', () => {
    for (const item of allItems()) {
      const id = item.bind || item.paramId || item.source || item.portId;
      const wrapper = renderItemHTML(item, CANONICAL_MANIFEST, { [id]: 0.5 }, 1);
      // El runtime usa AssetResolver.resolve — mismo resolver para comparación exacta
      const direct = CellRenderer.renderCellHTML(item, buildCellOptions(CANONICAL_MANIFEST, {
        skin: 'industrial',
        zoom: 1,
        runtimeValue: 0.5,
        steps: 100,
        isLiveMode: true,
        resolveAsset: (ref) => AssetResolver.resolve(CANONICAL_MANIFEST.id, ref),
      }));
      // El wrapper solo añade el cell-anchor de posicionamiento: la celda canónica va dentro
      expect(wrapper).toContain('cell-anchor');
      expect(wrapper).toContain(direct.trim());
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Chassis unificado (ManifestRenderer delega en chassisRenderer)
// ---------------------------------------------------------------------------

describe('visual parity — chassis frame unificado', () => {
  it('ManifestRenderer delega en chassisRenderer (misma fuente que el editor), sin gradiente hardcodeado', () => {
    const m: any = {
      ...CANONICAL_MANIFEST,
      ui: { ...CANONICAL_MANIFEST.ui, tree: undefined },
    };
    const html = ManifestRenderer.renderModulePanel(m);

    // El frame viene de chassisRenderer (fuente compartida con el editor):
    // industrial-rack-chassis + tornillos, NO el gradiente hardcodeado.
    expect(html).toContain('omega-module-chassis');
    expect(html).toContain('industrial-rack-chassis');
    expect(html).not.toContain('linear-gradient(180deg, #1e2638');

    // Paridad directa: el mismo chassisNode + opciones que renderModulePanel
    // producen el MISMO industrial-rack-chassis vía renderRackHTML.
    const chassisNode: any = { id: m.id, kind: 'rack', style: {}, children: [] };
    const direct = renderRackHTML(chassisNode, buildCellOptions(m, {
      skin: 'industrial',
      zoom: 1,
      runtimeValue: 0.5,
      steps: 100,
      isLiveMode: true,
      resolveAsset: (ref?: string) => AssetResolver.resolve(m.id, ref),
    }), m.id);
    expect(html).toContain(direct.trim());
  });
});


describe('visual parity — golden snapshot (drift guard)', () => {
  it('el HTML de celda del manifiesto canónico queda congelado', () => {
    const values: Record<string, number> = { cutoff: 0.75, res: 0.25, sync: 1, bpm: 0.5, bypass: 1, cv_in: 0, audio_out: 0 };
    const panelHTML = buildPanelHTML(CANONICAL_MANIFEST, 'MAIN', values, 1);
    // El snapshot congelado detecta cualquier cambio en el engine compartido
    // (producido desde cualquiera de los dos entornos) y fuerza revisión.
    expect(panelHTML).toMatchSnapshot('canonical-manifest-panel');
  });
});
