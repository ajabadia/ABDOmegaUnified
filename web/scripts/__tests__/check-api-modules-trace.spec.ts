/**
 * El presupuesto de la lambda `api/modules`, medido sobre la traza de NFT.
 *
 * Se prueban las funciones puras contra trazas fabricadas y contra ficheros reales
 * en un directorio temporal, NO contra `.next/`: la suite de Jest corre en un
 * runner donde no hay build previo, y atar el test a un artefacto de `next build`
 * lo volvería verde por no ejecutarse. El peso de verdad se mide en el paso de CI
 * que invoca el script tras compilar.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  MAX_FOREIGN_FILES,
  MAX_TRACE_BYTES,
  checkBudget,
  formatMb,
  measureTrace,
  readApiModulesTrace,
} from '../check-api-modules-trace.mjs';

/** Escribe un fichero de `bytes` tamaño dentro de `dir` y devuelve su ruta. */
function fileOf(dir: string, name: string, bytes: number) {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.alloc(bytes, 1));
  return p;
}

describe('check-api-modules-trace: measureTrace', () => {
  let tmp: string;
  let distDir: string;
  let root: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nft-trace-'));
    // La raíz de Next ES `web/`, y `.next/` vive DENTRO de ella. Reproducir esa
    // forma importa: si el fixture sacara `.next` fuera de la raíz, sus propios
    // ficheros salirían clasificados como foráneos y la medición no probaría nada.
    root = path.join(tmp, 'web');
    distDir = path.join(root, '.next', 'server', 'app', 'api', 'modules');
    fs.mkdirSync(root, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('suma los bytes reales de la traza', () => {
    const traced = fileOf(distDir, 'route.js', 1000);
    const nftPath = path.join(distDir, 'route.js.nft.json');

    const measured = measureTrace({ files: ['route.js'] }, nftPath, root);

    expect(measured).toMatchObject({ totalBytes: 1000, totalFiles: 1, foreignFiles: 0, missing: 0 });
    expect(traced).toContain('route.js');
  });

  it('cuenta como foráneo lo que sale de la raíz de Next', () => {
    // El caso medido: la traza arrastraba exports/, src/, public/, docs/ y
    // wasm-runtime/ del repo, todos por encima de `web/`.
    const foreign = fileOf(path.join(tmp, 'exports'), 'build.js', 10);
    const nftPath = path.join(distDir, 'route.js.nft.json');
    const files = [path.relative(distDir, foreign), path.relative(distDir, fileOf(distDir, 'route.js', 5))];

    const measured = measureTrace({ files }, nftPath, root);

    expect(measured.foreignFiles).toBe(1);
    expect(measured.totalFiles).toBe(2);
  });

  it('no infla el total con ficheros que la traza nombra y no existen', () => {
    fileOf(distDir, 'route.js', 250);
    const nftPath = path.join(distDir, 'route.js.nft.json');

    // `fantasma.wasm` es el caso real: el runner de CI no compila los .wasm, asi
    // que la traza los nombra y no estan en disco.
    const measured = measureTrace({ files: ['route.js', 'fantasma.wasm'] }, nftPath, root);

    expect(measured.missing).toBe(1);
    expect(measured.totalBytes).toBe(250);
  });
});

describe('check-api-modules-trace: checkBudget', () => {
  it('pasa una traza sana', () => {
    expect(checkBudget({ totalBytes: 30 * 1024 * 1024, foreignFiles: 0 })).toEqual([]);
  });

  it('falla al superar el presupuesto, y nombra los bytes medidos', () => {
    // El estado de partida: 294.07 MB, por encima del límite de Vercel.
    const problems = checkBudget({ totalBytes: 294.07 * 1024 * 1024, foreignFiles: 3000 });

    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('294.07 MB');
    expect(problems[1]).toContain(String(MAX_FOREIGN_FILES));
  });

  it('el presupuesto es más estricto que el límite de Vercel', () => {
    // 250 MB es donde Vercel dice que no; el presupuesto corta antes a propósito.
    expect(MAX_TRACE_BYTES).toBeLessThan(250 * 1024 * 1024);
  });
});

describe('check-api-modules-trace: readApiModulesTrace', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nft-read-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('devuelve null si no hay build, para que el script lo diga en vez de romperse', () => {
    expect(readApiModulesTrace(tmp)).toBeNull();
  });

  it('lee la traza desde el sitio donde la deja next build', () => {
    const nftDir = path.join(tmp, 'server', 'app', 'api', 'modules');
    fs.mkdirSync(nftDir, { recursive: true });
    fs.writeFileSync(path.join(nftDir, 'route.js.nft.json'), JSON.stringify({ files: ['a.js'] }), 'utf8');

    const found = readApiModulesTrace(tmp);

    expect(found?.trace.files).toEqual(['a.js']);
  });
});

describe('check-api-modules-trace: formatMb', () => {
  it('formatea en MB con dos decimales', () => {
    expect(formatMb(1024 * 1024)).toBe('1.00 MB');
    expect(formatMb(294.07 * 1024 * 1024)).toBe('294.07 MB');
  });
});
