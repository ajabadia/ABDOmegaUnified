/**
 * Tests de `scripts/check_acemm_layout.mjs`.
 *
 * POR QUÉ UN MANIFIESTO SINTÉTICO Y NO UN .acemm REAL
 * ---------------------------------------------------
 * El guard se ejercita contra objetos construidos aquí, no contra `modules/`:
 * un test que leyera los manifiestos reales pasaría hoy, pero en cuanto alguien
 * añade un módulo nuevo legítimamente a medio cerrar el test empezaría a fallar
 * sin que el guard tenga nada que ver. Con objetos sintéticos, cada caso declara
 * exactamente la regla que quiere comprobar. El barrido de la estantería real se
 * comprueba aparte ejecutando el script (`node scripts/check_acemm_layout.mjs`).
 *
 * Ejecución: `node --test scripts/__tests__/check_acemm_layout.test.mjs`
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  analyzeManifest,
  checkSnap,
  checkWidth,
  collectPoints,
  listModules,
  PX_PER_HP,
  SNAP_PX,
} from '../check_acemm_layout.mjs';

/** Manifiesto minimo con un control, un jack y un container. */
const baseManifest = (over = {}) => ({
  metadata: { name: 'x', rack: { hp: 8 } },
  ui: {
    dimensions: { width: 120, height: 140 },
    controls: [],
    jacks: [],
    layout: { containers: [] },
  },
  ...over,
});

test('las constantes del guard son las del design system', () => {
  assert.equal(SNAP_PX, 5);
  // RACK_HP_WIDTH_PX de web/src/omega-ui-core/uca/panelGeometry.ts
  assert.equal(PX_PER_HP, 15);
});

// ── collectPoints ─────────────────────────────────────────────────────────────

test('collectPoints recorre controls, jacks y containers', () => {
  const m = baseManifest();
  m.ui.controls = [{ id: 'k1', pos: { x: 10, y: 20 } }];
  m.ui.jacks = [{ id: 'j1', pos: { x: 30, y: 40 } }];
  m.ui.layout.containers = [{ id: 'main', pos: { x: 5, y: 5 } }];

  const points = collectPoints(m);
  assert.equal(points.length, 3);
  assert.deepEqual(
    points.map((p) => p.where),
    ['control', 'jack', 'container'],
  );
  assert.equal(points[0].id, 'k1');
});

test('collectPoints usa bind como id cuando no hay id', () => {
  const m = baseManifest();
  m.ui.controls = [{ bind: 'cutoff', pos: { x: 0, y: 0 } }];
  assert.equal(collectPoints(m)[0].id, 'cutoff');
});

test('collectPoints ignora lo que no tiene pos numerica', () => {
  const m = baseManifest();
  m.ui.controls = [{ id: 'sin_pos' }, { id: 'pos_mal', pos: { x: 'a', y: 2 } }, { id: 'ok', pos: { x: 5, y: 5 } }];
  assert.equal(collectPoints(m).length, 1);
});

test('collectPoints no revienta si el manifiesto esta vacio', () => {
  assert.deepEqual(collectPoints({}), []);
  assert.deepEqual(collectPoints(undefined), []);
});

test('collectPoints ignora listas que no son arrays', () => {
  const m = baseManifest({ ui: { controls: 'nope' } });
  assert.deepEqual(collectPoints(m), []);
});

// ── checkSnap ─────────────────────────────────────────────────────────────────

test('checkSnap acepta multiplos de 5', () => {
  assert.equal(checkSnap({ x: 0, y: 0, where: 'control', id: 'a' }), null);
  assert.equal(checkSnap({ x: 10, y: 15, where: 'control', id: 'a' }), null);
  assert.equal(checkSnap({ x: 35, y: 120, where: 'control', id: 'a' }), null);
});

test('checkSnap rechaza un x fuera de rejilla y lo dice', () => {
  const issue = checkSnap({ x: 33, y: 15, where: 'control', id: 'knob' });
  assert.ok(issue);
  assert.equal(issue.kind, 'snap');
  assert.match(issue.message, /FUERA DE SNAP 5px/);
  assert.match(issue.message, /x=33/);
  // La sugerencia debe ser multiplo de 5.
  assert.match(issue.message, /sugerencia 35/);
});

test('checkSnap rechaza un y fuera de rejilla', () => {
  const issue = checkSnap({ x: 10, y: 12, where: 'control', id: 'disp' });
  assert.ok(issue);
  assert.match(issue.message, /y=12/);
  assert.match(issue.message, /sugerencia 15/);
});

test('checkSnap reporta ambos ejes cuando los dos fallan', () => {
  const issue = checkSnap({ x: 33, y: 12, where: 'control', id: 'a' });
  assert.match(issue.message, /x=33/);
  assert.match(issue.message, /y=12/);
});

test('checkSnap respeta un snap distinto si se le pasa', () => {
  // 10 y 10 cumplen el snap de 5, pero no el de 20.
  assert.equal(checkSnap({ x: 10, y: 10, where: 'control', id: 'a' }), null);
  assert.ok(checkSnap({ x: 10, y: 10, where: 'control', id: 'a' }, 20));
});

// ── checkWidth ────────────────────────────────────────────────────────────────

test('checkWidth acepta el ratio hp x 15', () => {
  const m = baseManifest();
  assert.equal(checkWidth(m), null);
});

test('checkWidth acepta cualquier hp mientras el width siga el ratio', () => {
  for (const [hp, width] of [[4, 60], [8, 120], [12, 180], [16, 240], [24, 360]]) {
    const m = baseManifest({
      metadata: { rack: { hp } },
      ui: { dimensions: { width, height: 140 } },
    });
    assert.equal(checkWidth(m), null, `hp ${hp} width ${width} deberia cumplir`);
  }
});

test('checkWidth rechaza un width que no corresponde a su hp', () => {
  const m = baseManifest({
    metadata: { rack: { hp: 8 } },
    ui: { dimensions: { width: 60, height: 140 } },
  });
  const issue = checkWidth(m);
  assert.ok(issue);
  assert.equal(issue.kind, 'width');
  assert.match(issue.message, /width 60/);
  assert.match(issue.message, /hp 8 x 15 = 120/);
});

test('checkWidth no juzga si el manifiesto no declara width', () => {
  assert.equal(checkWidth(baseManifest({ ui: { dimensions: {} } })), null);
});

test('checkWidth avisa si hay width pero no hay hp', () => {
  const m = baseManifest({
    metadata: { rack: {} },
    ui: { dimensions: { width: 120, height: 140 } },
  });
  const issue = checkWidth(m);
  assert.ok(issue);
  assert.match(issue.message, /ANCHURA SIN HP/);
});

// ── analyzeManifest ───────────────────────────────────────────────────────────

test('analyzeManifest pasa un manifiesto correcto', () => {
  const m = baseManifest();
  m.ui.controls = [{ id: 'k', pos: { x: 10, y: 15 } }];
  const r = analyzeManifest('demo', m);
  assert.deepEqual(r.issues, []);
  assert.equal(r.points, 1);
  assert.equal(r.module, 'demo');
});

test('analyzeManifest acumula snap y ancho', () => {
  const m = baseManifest({
    metadata: { rack: { hp: 8 } },
    ui: { dimensions: { width: 60, height: 140 }, controls: [{ id: 'k', pos: { x: 33, y: 15 } }] },
  });
  const r = analyzeManifest('demo', m);
  assert.equal(r.issues.length, 2);
  assert.deepEqual(r.issues.map((i) => i.kind).sort(), ['snap', 'width']);
});

test('analyzeManifest NO juzga los size de los componentes', () => {
  // knob 24x24 y port 22x22 son tokens del skin: multiplos de 5 no tienen
  // sentido ahi, asi que el guard debe ignorarlos.
  const m = baseManifest();
  m.ui.controls = [
    { id: 'k', pos: { x: 10, y: 15 }, presentation: { component: 'knob', size: { w: 24, h: 24 } } },
    { id: 'p', pos: { x: 20, y: 25 }, presentation: { component: 'port', size: { w: 22, h: 22 } } },
  ];
  const r = analyzeManifest('demo', m);
  assert.deepEqual(r.issues, [], 'los size no deben producir incumplimientos');
  assert.equal(r.points, 2);
});

// ── La estanteria real ───────────────────────────────────────────────────────

test('la estanteria real tiene los 11 modulos con .acemm', () => {
  const ids = listModules();
  assert.ok(ids.includes('vco'));
  assert.ok(ids.includes('lfo'));
  assert.ok(ids.includes('test_parity'), 'test_parity tambien es un modulo valido');
  assert.ok(ids.length >= 11, `esperaba al menos 11 modulos, hay ${ids.length}`);
});

test('todos los modulos de la estanteria real cumplen el guard', () => {
  const ids = listModules();
  for (const id of ids) {
    const m = analyzeManifest(id, loadReal(id));
    assert.deepEqual(
      m.issues.map((i) => `${i.where}/${i.id}: ${i.message}`),
      [],
      `el modulo ${id} incumple las reglas de layout`,
    );
  }
});

/** Carga el .acemm real desde modules/ (solo para el test de integracion). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const yaml = createRequire(path.join(ROOT, 'web', 'package.json'))('js-yaml');

function loadReal(id) {
  return yaml.load(fs.readFileSync(path.join(ROOT, 'modules', id, `${id}.acemm`), 'utf8'));
}