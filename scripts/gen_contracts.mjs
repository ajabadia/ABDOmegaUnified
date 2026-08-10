/**
 * gen_contracts.mjs — Regenerates modules/<id>/<id>.contract.json from the REAL
 * binaries in web/public/wasm/ (single source of truth: omega_get_contract()).
 *
 * Run: node scripts/gen_contracts.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['vco', 'vcf', 'adsr', 'vca', 'lfo'];

for (const id of MODULES) {
  const wasmPath = resolve(ROOT, 'web/public/wasm', `${id}.wasm`);
  const bytes = readFileSync(wasmPath);
  const module = new WebAssembly.Module(bytes);
  const memory = new WebAssembly.Memory({ initial: 8 });
  const imports = { env: { memory, __memory_base: 0 } };
  for (const imp of WebAssembly.Module.imports(module)) {
    if (imp.kind === 'function' && imp.name.startsWith('omega_')) imports.env[imp.name] = () => {};
  }
  const instance = new WebAssembly.Instance(module, imports);
  if (typeof instance.exports.__wasm_call_ctors === 'function') instance.exports.__wasm_call_ctors();
  const ptr = instance.exports.omega_get_contract();
  const view = new Uint8Array(memory.buffer);
  let end = ptr;
  while (end < view.length && view[end] !== 0) end++;
  const json = new TextDecoder().decode(view.subarray(ptr, end));
  const contract = JSON.parse(json);

  const dir = resolve(ROOT, 'modules', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${id}.contract.json`), JSON.stringify(contract, null, 2) + '\n');
  console.log(`${id}: ${contract.name} — ${contract.parameters.length} params, ${contract.ports.length} ports`);
}
console.log('contracts written.');
