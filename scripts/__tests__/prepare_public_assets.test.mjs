/**
 * Tests de `scripts/prepare_public_assets.mjs`.
 *
 * POR QUÉ UN ARBOL SINTÉTICO Y NO EL REPO REAL
 * ---------------------------------------------
 * El repo de desarrollo tiene los cuatro destinos YA materializados como
 * junctions, así que un test que usara las rutas reales no ejercitaría la copia
 * (que es justo lo que hay que probar) ydependería del estado de la máquina.
 * Aquí se construye un mini-repo en un directorio temporal.
 *
 * Ejecución: `node --test scripts/__tests__/prepare_public_assets.test.mjs`
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  TARGETS,
  countFiles,
  isLink,
  materialize,
  materializeTarget,
  samePath,
  sourcesPresent,
  selectTargets,
  targetStatus,
} from '../prepare_public_assets.mjs';

/** Crea un enlace a directorio. En Windows el tipo correcto es 'junction'. */
function linkDir(target, linkPath) {
  fs.symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

function writeFileAt(file, content = 'x') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Mini-repo: <tmp>/repo con `modules/` y `web/public/` vacíos. */
function makeRepo(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ppa-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  writeFileAt(path.join(repo, 'modules', 'vco', 'vco.acemm'), 'name: VCO');
  writeFileAt(path.join(repo, 'modules', 'vco', 'vco.wasm'), 'bin');
  fs.mkdirSync(path.join(repo, 'web', 'public'), { recursive: true });
  return repo;
}

/** Destino de test con la forma de los reales pero en el mini-repo. */
const modulesTarget = {
  name: 'modules',
  dest: 'web/public/modules',
  sources: ['modules'],
  required: true,
  why: 'test',
};

test('materialize copia un árbol plano y lo cuenta', (t) => {
  const repo = makeRepo(t);
  const dest = path.join(repo, 'out');

  const result = materialize(path.join(repo, 'modules'), dest);

  assert.equal(result.files, 2);
  assert.equal(fs.readFileSync(path.join(dest, 'vco', 'vco.acemm'), 'utf8'), 'name: VCO');
  assert.equal(countFiles(dest), 2);
});

test('materialize convierte un junction anidado en contenido real', (t) => {
  const repo = makeRepo(t);
  writeFileAt(path.join(repo, 'core', 'index.css'), 'body{}');
  writeFileAt(path.join(repo, 'core', 'nested', 'deep.txt'), 'deep');
  fs.mkdirSync(path.join(repo, 'host'), { recursive: true });
  linkDir(path.join(repo, 'core'), path.join(repo, 'host', 'omega-ui-core'));
  writeFileAt(path.join(repo, 'host', 'index.html'), '<html>');

  const dest = path.join(repo, 'out');
  materialize(path.join(repo, 'host'), dest);

  // Lo que un junction resolvía al vuelo ahora son bytes de verdad.
  assert.equal(fs.lstatSync(path.join(dest, 'omega-ui-core')).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(path.join(dest, 'omega-ui-core', 'index.css'), 'utf8'), 'body{}');
  assert.equal(fs.readFileSync(path.join(dest, 'omega-ui-core', 'nested', 'deep.txt'), 'utf8'), 'deep');
});

test('un junction que apunta a un ancestro no cuelga el copiado', (t) => {
  const repo = makeRepo(t);
  // Anillo: host/self -> host. Sin la guarda de realpath, esto es ELOOP.
  fs.mkdirSync(path.join(repo, 'host'), { recursive: true });
  linkDir(path.join(repo, 'host'), path.join(repo, 'host', 'self'));
  writeFileAt(path.join(repo, 'host', 'index.html'), '<html>');

  const dest = path.join(repo, 'out');
  const result = materialize(path.join(repo, 'host'), dest);

  assert.equal(result.files, 1);
  assert.equal(fs.existsSync(path.join(dest, 'index.html')), true);
  // Y no se ha colado el subárbol repetido.
  assert.equal(countFiles(dest), 1);
});

test('un enlace roto se reporta en vez de reventar el copiado', (t) => {
  const repo = makeRepo(t);
  fs.mkdirSync(path.join(repo, 'host'), { recursive: true });
  writeFileAt(path.join(repo, 'host', 'index.html'), '<html>');
  linkDir(path.join(repo, 'no-existe'), path.join(repo, 'host', 'roto'));

  const result = materialize(path.join(repo, 'host'), path.join(repo, 'out'));

  assert.equal(result.files, 1);
  assert.equal(result.skipped.length, 1);
  assert.ok(result.skipped[0].endsWith('roto'));
});

test('targetStatus distingue missing, materialized y junction', (t) => {
  const repo = makeRepo(t);
  const dest = path.join(repo, modulesTarget.dest);

  assert.equal(targetStatus(modulesTarget, repo), 'missing');

  fs.mkdirSync(dest, { recursive: true });
  assert.equal(targetStatus(modulesTarget, repo), 'missing', 'un directorio vacío no está materializado');

  fs.mkdirSync(dest, { recursive: true });
  writeFileAt(path.join(dest, 'vco', 'vco.acemm'), 'name: VCO');
  assert.equal(targetStatus(modulesTarget, repo), 'materialized');

  fs.rmSync(dest, { recursive: true, force: true });
  linkDir(path.join(repo, 'modules'), dest);
  assert.equal(targetStatus(modulesTarget, repo), 'junction');
  assert.equal(isLink(dest), true);
});

test('samePath no se rompe con mayúsculas distintas (junction de Windows)', { skip: process.platform !== 'win32' }, (t) => {
  const repo = makeRepo(t);
  const modules = path.join(repo, 'modules');

  // Este es el fallo real que encontró esta suite: el junction resolvía a
  // `d:\...` y su fuente a `D:\...`, el script los daba por distintos y
  // borraba el junction creyendo que era un directorio materializado.
  assert.equal(samePath(modules, path.join(repo.toUpperCase(), 'MODULES')), true);
  assert.equal(samePath(modules, path.join(repo, 'web', 'public')), false);
  assert.equal(samePath(modules, path.join(repo, 'no-existe')), false);
});

test('materializeTarget rehace el destino y deja rastro limpio', (t) => {
  const repo = makeRepo(t);
  const dest = path.join(repo, modulesTarget.dest);
  // Fichero de una pasada anterior que ya no existe en la fuente.
  writeFileAt(path.join(dest, 'obsoleto', 'viejo.acemm'), 'old');

  const result = materializeTarget(modulesTarget, repo);

  assert.equal(result.files, 2);
  assert.equal(fs.existsSync(path.join(dest, 'obsoleto')), false, 'no debe arrastrar restos');
  assert.equal(fs.existsSync(path.join(dest, 'vco', 'vco.wasm')), true);
});

test('materializeTarget dice qué fuente falta, en vez de copiar en silencio', (t) => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ppa-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));

  assert.throws(() => materializeTarget(modulesTarget, repo), /Falta la fuente can/);
  assert.equal(fs.existsSync(path.join(repo, modulesTarget.dest)), false, 'no crea un destino vacío');
});

test('sourcesPresent distingue el checkout completo del parcial', (t) => {
  const repo = makeRepo(t);
  assert.equal(sourcesPresent(modulesTarget, repo), true);

  fs.rmSync(path.join(repo, 'modules'), { recursive: true, force: true });
  assert.equal(sourcesPresent(modulesTarget, repo), false);
});

test('selectTargets aplica --only, --skip y el todo por defecto', () => {
  const names = (argv) => selectTargets(argv).map((t) => t.name);

  assert.deepEqual(names([]), TARGETS.map((t) => t.name));
  assert.deepEqual(names(['--only=modules,fonts']), ['modules', 'fonts']);
  assert.deepEqual(names(['--skip=host-ui,omega-ui-core']), ['modules', 'fonts']);
  assert.deepEqual(names(['--only=modules,fonts', '--skip=fonts']), ['modules']);
  // Un nombre que no existe no rompe: la lista sale vacía, no un error.
  assert.deepEqual(names(['--only=inventado']), []);
});