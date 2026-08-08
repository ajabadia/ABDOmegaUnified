/**
 * OMEGA Era 7.2.3 - ACEMM Catalog & Manifest Resolver
 * 
 * FUENTE ÚNICA: los manifiestos canónicos viven en `modules/<id>/<id>.acemm`
 * (estantería compartida editor + rack). `GENERATED_ACEMM_CATALOG` se deriva
 * de ellos en build (`node scripts/generate_acemm_catalog.mjs`) — este archivo
 * ya NO mantiene copias inline de los .acemm.
 * 
 * Las entradas LEGACY (oscillator_vA, filter_vA, envelope_adsr, vca, lfo) son
 * placeholders planos SIN .acemm canónico aún — se conservan como fallback
 * mientras no exista su manifiesto en modules/.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import { resolveRackTarget } from '../Logic/RackRouter.js';
import { DEFAULT_SKIN, MIN_CHASSIS_WIDTH_PX } from '../../omega-ui-core/uca/panelGeometry.js';
import { CANONICAL_PALETTE_KEYS } from '../../omega-ui-core/utils/styleResolverDistill.js';
import { GENERATED_ACEMM_CATALOG } from './acemmCatalog.generated.js';

/**
 * Entradas legacy planas sin .acemm canónico (pendientes de promoción a modules/).
 * No drift: no tienen contrapartida de archivo; su forma plana alimenta el
 * normalizador (controls/jacks → ui block).
 */
const LEGACY_ACEMM_ENTRIES: Record<string, any> = {
  "oscillator_vA": {
    id: "oscillator_vA",
    name: "Analog Oscillator (VCO)",
    rack: { slot: "lower", hp: 10 },
    controls: [
      { id: "pitch", name: "Coarse Pitch", type: "knob" },
      { id: "fine", name: "Fine Tune", type: "knob" },
      { id: "shape", name: "Wave Shape", type: "knob" },
      { id: "fm_depth", name: "FM Depth", type: "knob" }
    ],
    jacks: [
      { id: "pitch_in", name: "V/OCT In", dataType: "cv", direction: "input" },
      { id: "fm_in", name: "FM CV", dataType: "cv", direction: "input" },
      { id: "sine_out", name: "Sine Out", dataType: "audio", direction: "output" },
      { id: "saw_out", name: "Saw Out", dataType: "audio", direction: "output" }
    ]
  },
  "filter_vA": {
    id: "filter_vA",
    name: "Ladder VCF Filter",
    rack: { slot: "lower", hp: 10 },
    controls: [
      { id: "cutoff", name: "Cutoff Freq", type: "knob" },
      { id: "resonance", name: "Resonance", type: "knob" },
      { id: "drive", name: "Overdrive", type: "knob" },
      { id: "env_amount", name: "Env Modulation", type: "knob" }
    ],
    jacks: [
      { id: "audio_in", name: "Audio In", dataType: "audio", direction: "input" },
      { id: "cutoff_cv", name: "Cutoff CV", dataType: "cv", direction: "input" },
      { id: "audio_out", name: "Audio Out", dataType: "audio", direction: "output" }
    ]
  },
  "envelope_adsr": {
    id: "envelope_adsr",
    name: "ADSR Envelope Generator",
    rack: { slot: "lower", hp: 8 },
    controls: [
      { id: "attack", name: "Attack", type: "knob" },
      { id: "decay", name: "Decay", type: "knob" },
      { id: "sustain", name: "Sustain", type: "knob" },
      { id: "release", name: "Release", type: "knob" }
    ],
    jacks: [
      { id: "gate_in", name: "Gate In", dataType: "cv", direction: "input" },
      { id: "env_out", name: "Env Out", dataType: "cv", direction: "output" }
    ]
  },
  "vca": {
    id: "vca",
    name: "Dual Linear VCA",
    rack: { slot: "lower", hp: 6 },
    controls: [
      { id: "gain", name: "Initial Gain", type: "knob" },
      { id: "cv_amt", name: "CV Amount", type: "knob" }
    ],
    jacks: [
      { id: "in", name: "Signal In", dataType: "audio", direction: "input" },
      { id: "cv", name: "CV In", dataType: "cv", direction: "input" },
      { id: "out", name: "Signal Out", dataType: "audio", direction: "output" }
    ]
  },
  "lfo": {
    id: "lfo",
    name: "Multi-Wave LFO",
    rack: { slot: "lower", hp: 6 },
    controls: [
      { id: "rate", name: "LFO Speed", type: "knob" },
      { id: "depth", name: "Output Depth", type: "knob" }
    ],
    jacks: [
      { id: "reset_in", name: "Sync Reset", dataType: "cv", direction: "input" },
      { id: "lfo_out", name: "LFO Out", dataType: "cv", direction: "output" }
    ]
  }
};

/** Catálogo combinado: canónico (generado desde modules/) + legacy planos. */
export const ACEMM_CATALOG: Record<string, any> = {
  ...GENERATED_ACEMM_CATALOG,
  ...LEGACY_ACEMM_ENTRIES,
};

/**
 * Canonical render components understood by omega-ui-core CellRenderer.
 * Used to upgrade legacy `type` strings from the flat catalog into
 * presentation.component hints that flatToTree / CellRenderer accept.
 */
const CONTROL_COMPONENTS: Record<string, string> = {
  knob: 'knob',
  slider: 'slider-v',
  'slider-v': 'slider-v',
  'slider-h': 'slider-h',
  button: 'button',
  switch: 'switch',
  toggle: 'toggle',
  led: 'led',
  display: 'display',
  stepper: 'stepper',
  fader: 'fader',
};

/**
 * Spreads an item list into a deterministic grid within the panel bounds.
 * Returns the items enriched with pos + presentation (component/size) so that
 * flatToTree can place them on MAIN_FACE instead of stacking them at (0,0).
 */
function layoutItems(
  items: any[],
  width: number,
  height: number,
  opts: { cols?: number; startY: number; rowStep: number; size: number; component: string | ((item: any) => string); role?: string; type?: string }
): any[] {
  const n = items.length || 0;
  if (n === 0) return [];
  const cols = opts.cols ?? n;
  const rows = Math.max(1, Math.ceil(n / cols));
  const perRow = Math.ceil(n / rows);

  return items.map((item, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const colsInRow = Math.min(perRow, n - row * perRow);
    const xStep = width / (colsInRow + 1);
    const size = opts.size;
    const component = typeof opts.component === 'function' ? opts.component(item) : opts.component;
    return {
      ...item,
      role: opts.role,
      type: opts.type,
      pos: { x: Math.round(xStep * (col + 1) - size / 2), y: Math.round(opts.startY + row * opts.rowStep) },
      presentation: {
        component,
        size: { width: size, height: size },
      },
    };
  });
}

/**
 * Inyecta la paleta canónica (chassis/hardware/knob tokens) en `ui` IN-PLACE
 * cuando el ACEMM no la define. Sin esto, ColorResolver.resolve('chassis')
 * devuelve 'transparent' y el rack se ve sin fondo. In-place para que
 * normalizeCatalogManifest siga siendo idempotente por referencia.
 */
function ensureCanonicalPalette(ui: any): void {
  if (ui.palette && Object.keys(ui.palette).length > 0) return;
  const existing = ui.colors || {};
  ui.palette = { ...CANONICAL_PALETTE_KEYS, ...existing };
}

/**
 * Wraps a flat catalog entry (top-level controls/jacks, no `ui` block) into a
 * normalized manifest that flatToTree / ManifestRenderer can consume:
 * - metadata.rack  → resolved by resolvePanelGeometry (units/hp → chassis size)
 * - ui.dimensions  → bounds used by flatToTree for the tree
 * - ui.controls/ui.jacks → enriched with pos + presentation.component/size
 *
 * Idempotent: manifests that already carry a usable ui block are returned as-is.
 */
export function normalizeCatalogManifest(entry: any): any {
  if (!entry) return entry;

  if (entry.ui && (entry.ui.tree || Array.isArray(entry.ui.controls) || Array.isArray(entry.ui.jacks) || Array.isArray(entry.ui.items))) {
    ensureCanonicalPalette(entry.ui);
    return entry;
  }

  const slot = entry.rack?.slot === 'upper' ? 'upper' : 'lower';
  const hp = Number(entry.rack?.hp) || 8;
  const units = slot === 'upper' ? '1U' : '3U';
  const width = Math.max(hp * 15, MIN_CHASSIS_WIDTH_PX);
  const height = slot === 'upper' ? 144 : 432;

  const controls = layoutItems(entry.controls || [], width, height, {
    cols: slot === 'upper' ? (entry.controls?.length || 1) : 3,
    startY: slot === 'upper' ? height - 52 : height - 320,
    rowStep: slot === 'upper' ? 40 : 56,
    size: slot === 'upper' ? 24 : 28,
    component: (c: any) => CONTROL_COMPONENTS[c.type] || 'knob',
  });

  const jacks = layoutItems(entry.jacks || [], width, height, {
    cols: entry.jacks?.length || 1,
    startY: slot === 'upper' ? height - 24 : height - 42,
    rowStep: 0,
    size: slot === 'upper' ? 18 : 20,
    component: 'port',
    role: 'io',
    type: 'jack',
  });

  return {
    ...entry,
    metadata: {
      ...(entry.metadata || {}),
      rack: { hp, units, slot },
    },
    ui: {
      skin: entry.ui?.skin || DEFAULT_SKIN,
      palette: { ...CANONICAL_PALETTE_KEYS, ...(entry.ui?.palette || {}), ...(entry.ui?.colors || {}) },
      dimensions: { width, height },
      controls,
      jacks,
      layout: { width, height, gridSnap: 1, containers: [] },
    },
  };
}

/**
 * Fetches or resolves a module manifest by ID from schemaStore or ACEMM_CATALOG.
 */
export async function getOrFetchManifest(id: string): Promise<any> {
  if (!id) return null;
  const win = window as any;
  let manifest = win.schemaStore?.getSchema(id);

  if (!manifest && ACEMM_CATALOG[id]) {
    manifest = ACEMM_CATALOG[id];
  }

  if (!manifest) {
    manifest = {
      id,
      name: id.toUpperCase(),
      rack: { slot: resolveRackTarget(id, {}, null).isUpper ? "upper" : "lower", hp: 8 },
      controls: [{ id: "param1", name: "Param 1", type: "knob" }],
      jacks: [{ id: "in1", name: "In 1", dataType: "audio", direction: "input" }, { id: "out1", name: "Out 1", dataType: "audio", direction: "output" }]
    };
  }

  // Always normalize (idempotent): upgrades bare schemas from schemaStore and
  // catalog entries into ui-block manifests that flatToTree / ManifestRenderer
  // / ModuleRenderer can consume. No-op for already-normalized manifests.
  manifest = normalizeCatalogManifest(manifest);

  // Re-register so ModuleManager / ModuleRegistry / future getSchema() consumers
  // receive the normalized (enriched) manifest instead of the bare schema.
  if (win.schemaStore && typeof win.schemaStore.registerSchema === 'function') {
    win.schemaStore.registerSchema(id, manifest);
  }

  return manifest;
}

// Bind to window for global access
if (typeof window !== 'undefined') {
  (window as any).ACEMM_CATALOG = ACEMM_CATALOG;
  (window as any).getOrFetchManifest = getOrFetchManifest;
}
