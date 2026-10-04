/**
 * check_acemm_layout.mjs — Guard de reglas de layout de los manifiestos.
 *
 * Verifica las dos reglas geometricas que el renderer da por ciertas, en la
 * UNICA fuente de manifiestos (modules/):
 *
 *   1. SNAP DE 5 PX — toda posicion (pos) de controls, jacks y containers debe
 *      caer en un multiplo de 5. Es la "regla de los 5px" del briefing tecnico:
 *      evita el jitter visual y garantiza que knobs y jacks queden simetricos
 *      en el faceplate.
 *
 *   2. ANCHURA = HP x 15 — el ancho declarado en ui.dimensions debe ser exactamente
 *      metadata.rack.hp * RACK_HP_WIDTH_PX, con RACK_HP_WIDTH_PX = 15 (constante
 *      de web/src/omega-ui-core/uca/panelGeometry.ts). Si divergen, el chasis se
 *      dimensiona por una unidad y los controles se posicionan sobre otra.
 *
 * POR QUE NO SE COMPRUEBA EL TAMANO DE LOS COMPONENTES
 * ---------------------------------------------------
 * Los `presentation.size` de knobs, ports y leds son tokens del design system
 * (24x24, 22x22, 30x30...), NO coordenadas: no tienen sentido multiplo de 5 y
 * forzarlo romperia el skin. El snap se aplica solo a posiciones.
 *
 * QUE ES "LA ESCALA 1.5x"
 * ------------------------
 * El factor 1.5 de CellRenderer (renderers/CellRenderer.ts) multiplica unicamente
 * style.offsetX / style.offsetY, no las coordenadas del manifiesto. Este guard
 * comprueba el invariant que el renderer SI cumple — que la anchura del panel sea
 * HP * 15 — porque es el unico factor de escala que se puede verificar desde el
 * .acemm.
 *
 * Uso:  node scripts/check_acemm_layout.mjs
 *       node scripts/check_acemm_layout.mjs --json
 * Exit 0 = todos los modulos cumplen · 1 = algun incumplimiento
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');

const require = createRequire(path.join(ROOT, 'web', 'package.json'));
const yaml = require('js-yaml');

/** Multiplo de la rejilla de alineacion, en px. */
export const SNAP_PX = 5;

/** Anchura de 1 HP en px (RACK_HP_WIDTH_PX de panelGeometry.ts). */
export const PX_PER_HP = 15;

// ── Analisis puro (testeable sin filesystem) ──────────────────────────────────

/**
 * Extrae todos los puntos posicionados de un manifiesto.
 * Recorre controls, jacks y layout.containers, que son las tres listas que
 * llevan `pos` en el formato real de los .acemm.
 *
 * @param {object} manifestManifiesto ya parseado (YAML -> objeto)
 * @returns {{where: string, id: string, x: number, y: number}[]}
 */
export function collectPoints(manifest) {
  const points = [];
  const push = (pos, where, id) => {
    if (!pos || typeof pos !== 'object') return;
    const { x, y } = pos;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    points.push({ where, id, x, y });
  };

  const groups = [
    ['control', manifest?.ui?.controls],
    ['jack', manifest?.ui?.jacks],
    ['container', manifest?.ui?.layout?.containers],
  ];

  for (const [where, list] of groups) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id ?? item.bind ?? '?');
      push(item.pos, where, id);
    }
  }
  return points;
}

/** Comprueba el snap de un punto. Devuelve null si cumple. */
export function checkSnap(point, snap = SNAP_PX) {
  const offX = ((point.x % snap) + snap) % snap;
  const offY = ((point.y % snap) + snap) % snap;
  if (offX === 0 && offY === 0) return null;
  const snapUp = (v) => v + ((snap - offX) % snap || 0);
  const parts = [];
  if (offX !== 0) parts.push(`x=${point.x} (off por ${offX}px, sugerencia ${snapUp(point.x)})`);
  if (offY !== 0) parts.push(`y=${point.y} (off por ${offY}px, sugerencia ${point.y + (snap - offY)})`);
  return { kind: 'snap', where: point.where, id: point.id, message: `FUERA DE SNAP ${snap}px: ${parts.join(', ')}` };
}

/** Comprueba que el ancho del panel sea HP * PX_PER_HP. Devuelve null si cumple. */
export function checkWidth(manifest, pxPerHp = PX_PER_HP) {
  const width = manifest?.ui?.dimensions?.width;
  const hp = manifest?.metadata?.rack?.hp;

  if (typeof width !== 'number') return null; // sin dims: nada que afirmar
  if (typeof hp !== 'number') {
    return {
      kind: 'width',
      where: 'ui.dimensions.width',
      id: 'width',
      message: `ANCHURA SIN HP: declara width ${width} pero no metadata.rack.hp, no se puede verificar el ratio`,
    };
  }

  const expected = hp * pxPerHp;
  if (Math.abs(width - expected) < 0.01) return null;
  return {
    kind: 'width',
    where: 'ui.dimensions.width',
    id: 'width',
    message: `ANCHURA DESALINEADA: width ${width} no es hp ${hp} x ${pxPerHp} = ${expected}`,
  };
}

/**
 * Analiza un manifiesto completo.
 * @returns {{module: string, issues: object[], points: number}}
 */
export function analyzeManifest(id, manifest, opts = {}) {
  const snap = opts.snap ?? SNAP_PX;
  const pxPerHp = opts.pxPerHp ?? PX_PER_HP;
  const points = collectPoints(manifest);
  const issues = [];
  for (const p of points) {
    const issue = checkSnap(p, snap);
    if (issue) issues.push(issue);
  }
  const widthIssue = checkWidth(manifest, pxPerHp);
  if (widthIssue) issues.push(widthIssue);
  return { module: id, points: points.length, issues };
}

// ── Recorrido de la estanteria ───────────────────────────────────────────────

/** Modulos que tienen manifiesto en la estanteria canonica. */
export function listModules(modulesDir = MODULES_DIR) {
  return readdirSync(modulesDir)
    .filter((id) => existsSync(path.join(modulesDir, id, `${id}.acemm`)))
    .sort();
}

/** Analiza todos los modulos de la estanteria. */
export function runCheck(modulesDir = MODULES_DIR, opts = {}) {
  const results = [];
  for (const id of listModules(modulesDir)) {
    const raw = readFileSync(path.join(modulesDir, id, `${id}.acemm`), 'utf8');
    results.push(analyzeManifest(id, yaml.load(raw), opts));
  }
  return results;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function main(argv) {
  const asJson = argv.includes('--json');
  const results = runCheck();
  const failures = results.filter((r) => r.issues.length > 0);
  const totalPoints = results.reduce((n, r) => n + r.points, 0);
  const totalIssues = results.reduce((n, r) => n + r.issues.length, 0);

  if (asJson) {
    process.stdout.write(
      JSON.stringify(
        {
          snapPx: SNAP_PX,
          pxPerHp: PX_PER_HP,
          modules: results.length,
          points: totalPoints,
          issues: totalIssues,
          results: results.map((r) => ({ module: r.module, points: r.points, issues: r.issues })),
        },
        null,
        2,
      ) + '\n',
    );
    process.exit(totalIssues > 0 ? 1 : 0);
  }

  console.log('[check_acemm_layout] Reglas: snap ' + SNAP_PX + 'px · ancho = hp x ' + PX_PER_HP);
  console.log('[check_acemm_layout] Revisando ' + results.length + ' modulos de modules/...\n');

  for (const r of results) {
    if (r.issues.length === 0) {
      console.log(`  OK   ${r.module} (${r.points} posiciones)`);
      continue;
    }
    console.log(`  FAIL ${r.module} (${r.points} posiciones)`);
    for (const issue of r.issues) {
      console.log(`         - [${issue.where}/${issue.id}] ${issue.message}`);
    }
  }

  console.log('\n========================================');
  if (totalIssues === 0) {
    console.log(`RESULTADO: ${results.length} modulos, ${totalPoints} posiciones, 0 incumplimientos OK`);
  } else {
    console.log(`RESULTADO: ${totalIssues} INCUMPLIMIENTO(S) en ${failures.length} modulo(s) FALLA`);
    console.log('Arregla las posiciones sugeridas en cada mensaje y vuelve a ejecutar.');
  }
  process.exit(totalIssues > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2));
}