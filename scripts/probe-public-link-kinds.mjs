/**
 * Sondea cómo reporta Node los cuatro enlaces de web/public/.
 *
 * POR QUÉ EXISTE
 * --------------
 * `prepare_public_assets.mjs` decide "esto es un junction, no lo toco" con
 * `lstatSync(p).isSymbolicLink()`. Si Node NO reporta así un junction de
 * Windows, el script creería que hay un directorio real, lo borraría
 * (`rmSync`) y —peor— el materializado dejaría de reflejar `modules/`.
 *
 * Ejecutar: `node scripts/probe-public-link-kinds.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['modules', 'fonts', 'host-ui', 'omega-ui-core'];

console.log(`node ${process.version} en ${process.platform}\n`);

for (const name of NAMES) {
  const p = path.join(REPO, 'web', 'public', name);
  if (!fs.existsSync(p)) {
    console.log(`${name.padEnd(14)} NO EXISTE`);
    continue;
  }
  const st = fs.lstatSync(p);
  let real = null;
  try {
    real = fs.realpathSync(p);
  } catch (e) {
    real = `ERROR ${e.code}`;
  }
  const firstEntry = fs.readdirSync(p)[0] ?? '(vacio)';
  console.log(
    [
      name.padEnd(14),
      `isSymbolicLink=${String(st.isSymbolicLink()).padEnd(5)}`,
      `isDirectory=${String(st.isDirectory()).padEnd(5)}`,
      `mode=${st.mode.toString(8)}`,
      `real=${real}`,
      `primerHijo=${firstEntry}`,
    ].join('  ')
  );
}