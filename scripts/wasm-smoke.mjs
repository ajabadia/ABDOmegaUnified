/**
 * Runtime smoke test for the 3 regenerated OMEGA WASM modules.
 *
 * Validates the exact path the user asked to check: that midi_in /
 * midi_trigger / omega_lab_monitor instantiate without
 * WebAssembly.instantiate errors, run their constructors, expose a valid
 * self-descriptive contract (omega_get_contract) and exercise the basic
 * host API (init / process / on_midi / on_param).
 *
 * Import object follows the Emscripten PIC convention used by the real
 * dynamic linker: __memory_base / __table_base are immutable, while
 * __stack_pointer and GOT.mem entries are mutable globals.
 *
 * NOTE: GOT.mem values here are heuristic addresses (32768 + offset) to keep
 * reads/writes in-bounds. This is a BINARY-VALIDITY + API-SURFACE check, NOT a
 * full relocation: the production runtime (C++ host via WAMR,
 * host/src/Core/Wasm/Service/WasmModuleService.cpp) performs real relocation.
 *
 * NOTE: in the web runtime the shelf modules are NOT instantiated by the app;
 * web/src/services/wasmLoader.ts (deprecated, Proxy env-only importObject) can
 * only load non-PIC/self-contained modules. This is a pre-existing gap, not a
 * regression from the WASM regeneration.
 *
 * Run: node scripts/wasm-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MODULES = [
  { id: 'midi_in', file: 'web/public/wasm/midi_in.wasm' },
  { id: 'midi_trigger', file: 'web/public/wasm/midi_trigger.wasm' },
  { id: 'omega_lab_monitor', file: 'web/public/wasm/omega_lab_monitor.wasm' },
];

function readCString(memory, ptr) {
  const view = new Uint8Array(memory.buffer);
  let end = ptr;
  while (end < view.length && view[end] !== 0) end++;
  return new TextDecoder().decode(view.slice(ptr, end));
}

/** Builds the importObject from the module's ACTUAL import list. */
function buildImportObject(module, memory) {
  const importObject = {};
  let gotIndex = 0;
  for (const imp of WebAssembly.Module.imports(module)) {
    if (!importObject[imp.module]) importObject[imp.module] = {};
    if (imp.kind === 'memory') {
      importObject[imp.module][imp.name] = memory;
    } else if (imp.kind === 'global') {
      // PIC convention: stack pointer + GOT entries are MUTABLE; base addresses immutable.
      const isStack = imp.name === '__stack_pointer';
      const isGot = imp.module === 'GOT.mem';
      const value = isStack ? 65536 : isGot ? 32768 + gotIndex * 4 : 0;
      if (isGot) gotIndex++;
      importObject[imp.module][imp.name] = new WebAssembly.Global(
        { value: 'i32', mutable: isStack || isGot },
        value,
      );
    } else if (imp.kind === 'table') {
      importObject[imp.module][imp.name] = new WebAssembly.Table({ element: 'anyfunc', initial: 16, maximum: 16 });
    } else {
      importObject[imp.module][imp.name] = () => {}; // host function stub
    }
  }
  return importObject;
}

let failures = 0;
for (const mod of MODULES) {
  console.log(`\n=== ${mod.id} ===`);
  try {
    const bytes = readFileSync(path.resolve(BASE, mod.file));
    const module = new WebAssembly.Module(bytes);
    const memory = new WebAssembly.Memory({ initial: 256, maximum: 512 });
    const importObject = buildImportObject(module, memory);

    // Module passed -> instantiate resolves DIRECTLY to the Instance
    const instance = await WebAssembly.instantiate(module, importObject);
    const exp = instance.exports;
    console.log('  exports:', Object.keys(exp).join(', ') || '(none)');

    if (typeof exp.__wasm_call_ctors === 'function') {
      exp.__wasm_call_ctors();
      console.log('  __wasm_call_ctors: OK');
    }

    if (typeof exp.omega_get_contract === 'function') {
      const ptr = exp.omega_get_contract();
      const json = readCString(memory, ptr);
      const contract = JSON.parse(json);
      const idOk = contract.id === mod.id || (contract.id || '').includes(mod.id.split('_').pop());
      // The macro-generated JSON uses the key 'parameters' (see OmegaContract.h).
      const parameters = contract.parameters || contract.params || [];
      const ports = contract.ports || [];
      console.log(
        `  omega_get_contract: id=${contract.id} parameters=${parameters.length} ports=${ports.length}`,
      );
      if (!idOk) { console.log('  FAIL: contract id mismatch'); failures++; }
    } else {
      // A module that instantiates but is not OMEGA-compliant must FAIL the check.
      console.log('  FAIL: no omega_get_contract export (not OMEGA-compliant)');
      failures++;
    }

    // Loosely-typed smoke calls (signatures differ: float / float* / int) — all
    // args are 32-bit so (0, 128) is safe; this only proves the API surface runs.
    for (const fn of ['omega_init', 'omega_on_midi', 'omega_on_param', 'omega_process']) {
      if (typeof exp[fn] === 'function') {
        try { exp[fn](0, 128); console.log(`  ${fn}: OK`); }
        catch (e) { console.log(`  ${fn}: threw (${e.message})`); failures++; }
      }
    }

    console.log(`  ${mod.id}: INSTANTIATED + EXERCISED`);
  } catch (e) {
    failures++;
    console.log(`  FAIL: ${e.message}`);
  }
}
console.log(`\n=== RESULT: ${failures === 0 ? 'ALL OK' : failures + ' FAILURE(S)'} ===`);
process.exit(failures === 0 ? 0 : 1);
