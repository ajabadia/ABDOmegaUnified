import { describe, it } from 'vitest';
import { ACEMM_CATALOG, normalizeCatalogManifest } from '../src/Catalog/AcemmCatalog.js';
import { ManifestRenderer } from '../src/Renderers/ManifestRenderer.js';
import { flatToTree } from '../omega-ui-core/uca/converters/flatToTree.js';

describe('diag', () => {
  it('prints midi_in panel html', () => {
    const manifest = normalizeCatalogManifest(ACEMM_CATALOG['midi_in']);
    console.log('NORMALIZED KEYS:', JSON.stringify({ id: manifest.id, ui: manifest.ui ? Object.keys(manifest.ui) : null, ctrlLen: manifest.ui?.controls?.length, jackLen: manifest.ui?.jacks?.length }, null, 2));
    console.log('CONTROL[0]:', JSON.stringify(manifest.ui.controls[0]));
    const tree = flatToTree(manifest);
    console.log('TREE:', JSON.stringify(tree, null, 2).slice(0, 2500));
    const html = ManifestRenderer.renderModulePanel(manifest);
    console.log('HTML LEN:', html.length);
    console.log('HAS KNOB:', html.includes('knob'));
    console.log('HAS PORT:', html.includes('port'));
    console.log('NO RENDERER:', html.includes('NO RENDERER'));
    console.log('HAS CELL:', html.includes('control-cell') || html.includes('omega-cell'));
    require('fs').writeFileSync('C:/Users/ajaba/AppData/Local/Temp/opencode/midi_in_panel.html', html);
  });
});
