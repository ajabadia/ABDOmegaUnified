/**
 * verify_440demo_runtime.mjs — Verificación runtime del módulo 440demo
 *
 * Instancia el binario REAL `modules/440demo/440demo.wasm` (el mismo archivo
 * que el host standalone carga vía junction `host/Resources/modules/440demo/`)
 * con stubs de host (WAMR + `omega_publish_telemetry`), y verifica:
 *
 *   1. Contrato embebido (`omega_get_contract`) == `440demo.contract.json`.
 *   2. Tono 440 Hz: frecuencia por cruces por cero + RMS derivado del default
 *      de `amplitude` del contrato (0.5 → RMS ≈ 0.354).
 *   3. Vía voz (length == 1): bus 1 == bus 0 (duplicación L/R).
 *   4. LED: ~8 actualizaciones de telemetría por segundo con brillo OSCILANTE
 *      (S&H `led_rate` Hz de un LFO rectificado de 3 Hz — tasas coprimas). La
 *      cadencia de actualización es `led_rate` (default 8 Hz); la envolvente
 *      de brillo tiene periodo 0.5 s.
 *   5. Params del manifiesto: `amplitude` duplica el RMS (1.0 → ≈ 0.707) y
 *      `led_rate` cambia la cadencia del LED (4 Hz → 4 actualizaciones/s).
 *   6. Switch: ON por defecto (suena nada más instanciar) → OFF = silencio +
 *      LED 0 → ON = el tono vuelve.
 *
 * Los valores esperados (amplitud, cadencia LED) se derivan del contract.json
 * — el contrato es la ÚNICA fuente de los defaults.
 *
 * Uso:  node scripts/verify_440demo_runtime.mjs   (exit 0 = PASS)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_DIR = resolve(ROOT, 'modules/440demo');
const WASM_PATH = resolve(MODULE_DIR, '440demo.wasm');
const CONTRACT_PATH = resolve(MODULE_DIR, '440demo.contract.json');

const SAMPLE_RATE = 48000;
const SCRATCH_PTR = 4 * 65536; // lejos de cualquier bss del módulo (memoria 8 páginas = 512 KiB)

// Frecuencia del tono: espejo JS de Omega::Constants::CONCERT_A_FREQ (el
// contrato no la expone; la fuente canónica es la cabecera del SDK C++).
const CONCERT_A_FREQ_HZ = 440;

// --- Telemetría (LED) ---
const telemetry = [];
function omega_publish_telemetry(value) {
  telemetry.push(value);
}

// --- Carga del wasm ---
const wasmBytes = readFileSync(WASM_PATH);
const memory = new WebAssembly.Memory({ initial: 8 }); // 8 páginas = 512 KiB
const imports = {
  env: {
    memory,
    __memory_base: 0,
    omega_publish_telemetry,
  },
};

const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
const wasm = instance.exports;

const readCString = (ptr) => {
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0) end++;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
};

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log('=== verify_440demo_runtime.mjs ===');
console.log(`wasm: ${WASM_PATH} (${wasmBytes.length} bytes)\n`);

// --- 1. Contrato embebido vs contract.json ---
if (typeof wasm.__wasm_call_ctors === 'function') wasm.__wasm_call_ctors();
wasm.omega_init(SAMPLE_RATE);

const contractFromWasm = JSON.parse(readCString(wasm.omega_get_contract()));
const contractFile = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));

const paramDefs = (c) => (c.parameters ?? []).map((p) => [p.id, p.min, p.max, p.default, p.unit]);
const portDefs = (c) => (c.ports ?? []).map((p) => [p.id, p.direction, p.type]);

check(
  'Contrato embebido == contract.json',
  contractFromWasm.id === contractFile.id &&
    JSON.stringify(paramDefs(contractFromWasm)) === JSON.stringify(paramDefs(contractFile)) &&
    JSON.stringify(portDefs(contractFromWasm)) === JSON.stringify(portDefs(contractFile)) &&
    (contractFromWasm.family ?? '') === (contractFile.family ?? ''),
  `id=${contractFromWasm.id} params=${JSON.stringify(paramDefs(contractFromWasm))} ports=${JSON.stringify(portDefs(contractFromWasm))}`,
);

// Defaults del contrato (única fuente de los valores esperados).
const paramById = Object.fromEntries(contractFile.parameters.map((p) => [p.id, p]));
const paramIndex = Object.fromEntries(contractFile.parameters.map((p, i) => [p.id, i]));
const AMPLITUDE_DEFAULT = paramById.amplitude?.default ?? 0.5;
const LED_RATE_DEFAULT = paramById.led_rate?.default ?? 8;
const rmsForAmplitude = (amp) => amp / Math.SQRT2; // senoide pura: RMS = amp/√2

// --- 2/3/4. Un segundo de audio (vía voz: length == 1, bus 0 + bus 1) ---
const samples = new Float32Array(SAMPLE_RATE);
let bus1Match = true;
let risingCrossings = 0;
let prev = 0;
telemetry.length = 0;

for (let i = 0; i < SAMPLE_RATE; i++) {
  wasm.omega_process(SCRATCH_PTR, 1);
  const bus0 = new Float32Array(memory.buffer, SCRATCH_PTR, 1)[0];
  const bus1 = new Float32Array(memory.buffer, SCRATCH_PTR + 4, 1)[0];
  samples[i] = bus0;
  if (Math.abs(bus1 - bus0) > 1e-6) bus1Match = false;
  if (prev <= 0 && bus0 > 0) risingCrossings++;
  prev = bus0;
}

let sumSq = 0;
for (const s of samples) sumSq += s * s;
const rms = Math.sqrt(sumSq / SAMPLE_RATE);

check('Switch ON por defecto (tono audible nada más instanciar)', rms > 0.30, `rms=${rms.toFixed(4)}`);
check(`Frecuencia ≈ ${CONCERT_A_FREQ_HZ} Hz (cruces por cero)`, Math.abs(risingCrossings - CONCERT_A_FREQ_HZ) <= 3, `${risingCrossings} cruces/s`);
check(
  `Amplitud default (${AMPLITUDE_DEFAULT}) → RMS ≈ ${rmsForAmplitude(AMPLITUDE_DEFAULT).toFixed(3)}`,
  Math.abs(rms - rmsForAmplitude(AMPLITUDE_DEFAULT)) < 0.02,
  `rms=${rms.toFixed(4)}`,
);
check('Vía voz: bus 1 == bus 0 (L/R duplicado)', bus1Match);

check(
  `LED: ${LED_RATE_DEFAULT} actualizaciones/s (S&H ${LED_RATE_DEFAULT} Hz)`,
  telemetry.length === LED_RATE_DEFAULT,
  `${telemetry.length} actualizaciones`,
);
const ledValues = [...telemetry];
const ledMax = Math.max(...ledValues);
const ledDistinct = new Set(ledValues.map((v) => v.toFixed(2))).size;
check(
  'LED: brillo OSCILANTE (no congelado en 0)',
  ledMax >= 0.99 && ledDistinct >= 3,
  `max=${ledMax.toFixed(3)} valores=${[...new Set(ledValues.map((v) => v.toFixed(2)))].join(', ')}`,
);
check(
  'LED: valores en [0,1]',
  ledValues.every((v) => v >= 0 && v <= 1),
  JSON.stringify(ledValues.map((v) => v.toFixed(3))),
);

// --- 5. Params de configuración (parte del manifiesto) ---
const runSecond = () => {
  telemetry.length = 0;
  let acc = 0;
  for (let i = 0; i < SAMPLE_RATE; i++) {
    wasm.omega_process(SCRATCH_PTR, 1);
    const v = new Float32Array(memory.buffer, SCRATCH_PTR, 1)[0];
    acc += v * v;
  }
  return { rms: Math.sqrt(acc / SAMPLE_RATE), updates: telemetry.length };
};

wasm.omega_on_param(paramIndex.amplitude, 1.0); // amplitude = 1.0 (full scale)
const ampFull = runSecond();
check(
  `Param amplitude (1.0) → RMS ≈ ${rmsForAmplitude(1.0).toFixed(3)} (doble del default ${AMPLITUDE_DEFAULT})`,
  Math.abs(ampFull.rms - rmsForAmplitude(1.0)) < 0.02,
  `rms=${ampFull.rms.toFixed(4)}`,
);
wasm.omega_on_param(paramIndex.amplitude, AMPLITUDE_DEFAULT); // reset default

wasm.omega_on_param(paramIndex.led_rate, 4.0); // led_rate = 4 Hz
const led4 = runSecond();
check(
  'Param led_rate (4 Hz) → 4 actualizaciones/s (la mitad del default)',
  led4.updates === 4,
  `${led4.updates} actualizaciones`,
);
wasm.omega_on_param(paramIndex.led_rate, LED_RATE_DEFAULT); // reset default

// --- 6. Switch OFF → silencio + LED 0; ON → el tono vuelve ---
const runHalfSecond = () => {
  let maxAbs = 0;
  telemetry.length = 0;
  for (let i = 0; i < SAMPLE_RATE / 2; i++) {
    wasm.omega_process(SCRATCH_PTR, 1);
    const v = Math.abs(new Float32Array(memory.buffer, SCRATCH_PTR, 1)[0]);
    if (v > maxAbs) maxAbs = v;
  }
  return { maxAbs, updates: telemetry.length, ledMax: Math.max(0, ...telemetry) };
};

wasm.omega_on_param(paramIndex.enabled, 0.0); // enabled = OFF
const off = runHalfSecond();
check('Switch OFF → silencio (|sample| < 1e-5)', off.maxAbs < 1e-5, `maxAbs=${off.maxAbs.toExponential(2)}`);
check(
  `Switch OFF → LED apagado (${Math.round(LED_RATE_DEFAULT / 2)} actualizaciones a 0)`,
  off.updates === Math.round(LED_RATE_DEFAULT / 2) && off.ledMax === 0,
  `updates=${off.updates} max=${off.ledMax}`,
);

wasm.omega_on_param(paramIndex.enabled, 1.0); // enabled = ON
const on = runHalfSecond();
check('Switch ON → el tono vuelve', on.maxAbs > 0.3, `maxAbs=${on.maxAbs.toFixed(3)}`);

// --- Resumen ---
const failed = checks.filter((c) => !c.ok);
console.log(`\n=== ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed.length}/${checks.length} checks ===`);
process.exit(failed.length === 0 ? 0 : 1);
