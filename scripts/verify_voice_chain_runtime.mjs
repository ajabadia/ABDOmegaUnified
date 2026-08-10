/**
 * verify_voice_chain_runtime.mjs — Verificación runtime de la FASE A
 * (cadena de voz analógica: VCO → VCF → ADSR → VCA, modulable por LFO).
 *
 * Replica fielmente el puente del host (WasmModuleService::process): cada
 * módulo tiene SU PROPIA memoria WASM (instancia WAMR por slot) y el host
 * mapea `state.buses` (el mismo array nativo) al espacio de direcciones del
 * módulo vía wasm_runtime_addr_native_to_app — puente zero-copy por llamada.
 *
 * En JS esto equivale a: un array de buses host compartido (VoiceState), que
 * se copia a la memoria de cada módulo antes de omega_process y se lee de
 * vuelta después, manteniendo el estado del bus entre módulos.
 *
 * Orden topológico de la voz: VCO → VCF → ADSR → VCA (+ LFO).
 * Layout de buses: 0/1 = audio L/R, 2 = sub/aux L, 3 = aux R, 4 = ENV,
 * 5 = LFO, 6-9 = CV VCO (v_oct/fm/pwm/sync), 10-11 = CV VCF (cutoff/res),
 * 12/13 = gate CV ADSR/VCA.
 *
 * Verifica DSP real (no solo superficie de API):
 *   1. Contratos embebidos == *.contract.json de los 5 módulos.
 *   2. VCO: la frecuencia responde a omega_get_voice_frequency (440/220 Hz).
 *   3. VCO: coarse +12 st → ~880 Hz sobre 440 Hz base.
 *   4. VCF: cutoff bajo (40 Hz) atenúa el saw ≫ 20 kHz (RMS relativo).
 *   5. ADSR: con gate alto el env llega a sustain (0.8); al soltar → 0.
 *   6. VCA: ENV 0 → silencio; ENV 1 → pasa; ENV 0.5 → mitad.
 *   7. LFO: 2 Hz sine en bus 5, pico ≈ amount (0.5).
 *
 * Host stubs: omega_get_voice_frequency / gate / velocity con estado mutable.
 *
 * Uso:  node scripts/verify_voice_chain_runtime.mjs   (exit 0 = PASS)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE_RATE = 48000;
const BUSES_PTR = 4 * 65536; // offset del buffer de buses en CADA módulo

const voice = { freq: 440.0, gate: 0.0, vel: 1.0 };
const telemetry = [];

// El array de buses del host (VoiceState.buses[16]) — compartido entre módulos.
const hostBuses = new Float32Array(16);

// Carga una instancia fresca de un módulo (memoria propia + stubs del host).
const loadModule = async (id) => {
  const bytes = readFileSync(resolve(ROOT, `web/public/wasm/${id}.wasm`));
  const memory = new WebAssembly.Memory({ initial: 8 });
  const imports = {
    env: {
      memory,
      __memory_base: 0,
      omega_get_voice_frequency: () => voice.freq,
      omega_get_voice_gate: () => voice.gate,
      omega_get_voice_velocity: () => voice.vel,
      omega_publish_telemetry: (v) => telemetry.push(v),
    },
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  if (typeof instance.exports.__wasm_call_ctors === 'function') instance.exports.__wasm_call_ctors();
  instance.exports.omega_init(SAMPLE_RATE);
  return { id, wasm: instance.exports, memory, contract: null };
};

const modules = {};
for (const id of ['vco', 'vcf', 'adsr', 'vca', 'lfo']) {
  modules[id] = await loadModule(id);
}

const readCString = (mem, ptr) => {
  const bytes = new Uint8Array(mem.buffer);
  let end = ptr;
  while (bytes[end] !== 0) end++;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
};

// Zero-copy bridge: copia hostBuses a la memoria del módulo y ejecuta.
const moduleProcess = (id) => {
  const { wasm, memory } = modules[id];
  const mem = new Float32Array(memory.buffer);
  mem.set(hostBuses, BUSES_PTR >> 2);
  wasm.omega_process(BUSES_PTR, 1);
  hostBuses.set(new Float32Array(memory.buffer, BUSES_PTR, 16));
};

// Render one sample through the full chain (topological order).
const renderSample = () => {
  hostBuses.fill(0);
  moduleProcess('lfo');
  moduleProcess('vco');
  moduleProcess('vcf');
  moduleProcess('adsr');
  moduleProcess('vca');
  return { l: hostBuses[0], r: hostBuses[1], env: hostBuses[4], lfo: hostBuses[5] };
};

const paramIdx = (id, param) =>
  modules[id].contract.parameters.findIndex((p) => p.id === param);

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log('=== verify_voice_chain_runtime.mjs ===\n');

// --- 0. Cargar contracts y verificar los embebidos ---
for (const id of Object.keys(modules)) {
  const contractFile = JSON.parse(
    readFileSync(resolve(ROOT, `modules/${id}/${id}.contract.json`), 'utf8'),
  );
  modules[id].contract = contractFile;
  const embedded = JSON.parse(readCString(modules[id].memory, modules[id].wasm.omega_get_contract()));
  const sig = (c) =>
    JSON.stringify([
      ...(c.parameters ?? []).map((p) => [p.id, p.min, p.max, p.default]),
      ...(c.ports ?? []).map((p) => [p.id, p.direction, p.type]),
      c.family ?? '',
    ]);
  check(`[${id}] Contrato embebido == contract.json`, sig(embedded) === sig(contractFile));
}

// --- Helpers de análisis ---
const zeroCrossings = (samples) => {
  let n = 0;
  let prev = 0;
  for (const s of samples) {
    if (prev <= 0 && s > 0) n++;
    prev = s;
  }
  return n;
};
const rmsOf = (samples) => {
  let acc = 0;
  for (const s of samples) acc += s * s;
  return Math.sqrt(acc / samples.length);
};

const runSamples = (n, gate = true) => {
  voice.gate = gate ? 1.0 : 0.0;
  telemetry.length = 0;
  const buf = new Float32Array(n);
  const envBuf = new Float32Array(n);
  const lfoBuf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = renderSample();
    buf[i] = s.l;
    envBuf[i] = s.env;
    lfoBuf[i] = s.lfo;
  }
  return { buf, envBuf, lfoBuf };
};

// Bypass: VCF abierto, VCA abierto, VCO saw determinista, ADSR rápido.
const setBypass = () => {
  modules.vcf.wasm.omega_on_param(paramIdx('vcf', 'cutoff'), 20000);
  modules.vcf.wasm.omega_on_param(paramIdx('vcf', 'resonance'), 0);
  modules.vcf.wasm.omega_on_param(paramIdx('vcf', 'mode'), 0);
  modules.vcf.wasm.omega_on_param(paramIdx('vcf', 'keytrack'), 0);
  modules.vcf.wasm.omega_on_param(paramIdx('vcf', 'cutoff_cv'), 0);
  modules.vcf.wasm.omega_on_param(paramIdx('vcf', 'res_cv'), 0);
  modules.vca.wasm.omega_on_param(paramIdx('vca', 'level'), 1.0);
  modules.vca.wasm.omega_on_param(paramIdx('vca', 'env_depth'), 1.0);
  modules.vca.wasm.omega_on_param(paramIdx('vca', 'curve'), 0.0);
  modules.vco.wasm.omega_on_param(paramIdx('vco', 'waveform'), 2); // saw
  modules.vco.wasm.omega_on_param(paramIdx('vco', 'coarse'), 0);
  modules.vco.wasm.omega_on_param(paramIdx('vco', 'drift'), 0.0); // determinista
  modules.adsr.wasm.omega_on_param(paramIdx('adsr', 'attack'), 1.0);
  modules.adsr.wasm.omega_on_param(paramIdx('adsr', 'decay'), 1.0);
  modules.adsr.wasm.omega_on_param(paramIdx('adsr', 'sustain'), 0.8);
  modules.adsr.wasm.omega_on_param(paramIdx('adsr', 'release'), 1.0);
};

// --- 2/3. VCO: frecuencia + detune ---
setBypass();
voice.freq = 440.0;
const v440 = runSamples(SAMPLE_RATE).buf;
const v440Rms = rmsOf(v440);
const v440Zero = zeroCrossings(v440);
check('VCO saw suena (RMS > 0.05)', v440Rms > 0.05, `rms=${v440Rms.toFixed(4)}`);
check('VCO 440 Hz: ~440 cruces por segundo', Math.abs(v440Zero - 440) <= 8, `${v440Zero} cruces/s`);

voice.freq = 220.0;
const v220Zero = zeroCrossings(runSamples(SAMPLE_RATE).buf);
check('VCO responde a voice.frequency (220 Hz → ~220)', Math.abs(v220Zero - 220) <= 8, `${v220Zero} cruces/s`);

voice.freq = 440.0;
modules.vco.wasm.omega_on_param(paramIdx('vco', 'coarse'), 12); // +1 octava
const v880Zero = zeroCrossings(runSamples(SAMPLE_RATE).buf);
check('VCO coarse +12 st → ~880 Hz', Math.abs(v880Zero - 880) <= 12, `${v880Zero} cruces/s`);
modules.vco.wasm.omega_on_param(paramIdx('vco', 'coarse'), 0);

// --- 4. VCF: corte bajo vs alto sobre un saw ---
// Engine fresco por medición: los estados del filtro cargados en la corrida
// "abierta" (20 kHz) tardan en descargarse por los polos de 40 Hz y
// contaminarían el RMS de la corrida "cerrada" si se reutilizara el motor.
const runVcfCutoff = async (cutoffHz, samples = 0.5 * SAMPLE_RATE) => {
  const vco = await loadModule('vco');
  const vcf = await loadModule('vcf');
  const adsr = await loadModule('adsr');
  const vca = await loadModule('vca');
  const set = (m, id, param, value) => m.wasm.omega_on_param(paramIdx(id, param), value);
  set(vco, 'vco', 'waveform', 2);
  set(vco, 'vco', 'coarse', 0);
  set(vco, 'vco', 'drift', 0);
  set(vcf, 'vcf', 'cutoff', cutoffHz);
  set(vcf, 'vcf', 'resonance', 0);
  set(vcf, 'vcf', 'mode', 0);
  set(vcf, 'vcf', 'keytrack', 0);
  set(vcf, 'vcf', 'cutoff_cv', 0);
  set(vcf, 'vcf', 'res_cv', 0);
  set(adsr, 'adsr', 'attack', 1.0);
  set(adsr, 'adsr', 'decay', 1.0);
  set(adsr, 'adsr', 'sustain', 0.8);
  set(adsr, 'adsr', 'release', 1.0);
  set(vca, 'vca', 'level', 1.0);
  set(vca, 'vca', 'env_depth', 1.0);
  set(vca, 'vca', 'curve', 0.0);
  const proc = (m) => {
    const mem = new Float32Array(m.memory.buffer);
    mem.set(hostBuses, BUSES_PTR >> 2);
    m.wasm.omega_process(BUSES_PTR, 1);
    hostBuses.set(new Float32Array(m.memory.buffer, BUSES_PTR, 16));
  };
  const buf = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    hostBuses.fill(0);
    proc(vco);
    proc(vcf);
    proc(adsr);
    proc(vca);
    buf[i] = hostBuses[0];
  }
  return buf;
};

voice.freq = 440.0;
const sawOpen = rmsOf(await runVcfCutoff(20000)); // abierto
const sawClosed = rmsOf(await runVcfCutoff(40)); // cerrado
check('VCF: cutoff 40 Hz atenúa el saw ≫ 20 kHz', sawClosed < sawOpen * 0.12,
  `open=${sawOpen.toFixed(4)} closed=${sawClosed.toFixed(4)}`);

// --- 5. ADSR: env llega a sustain con gate; baja a 0 al soltar ---
const envOn = runSamples(SAMPLE_RATE, true).envBuf;
const sustainLevel = envOn[envOn.length - 1];
check('ADSR: env sube a ≈ sustain (0.8) con gate alto', Math.abs(sustainLevel - 0.8) < 0.1,
  `env_final=${sustainLevel.toFixed(3)}`);
const envOff = runSamples(0.25 * SAMPLE_RATE, false).envBuf;
const releaseLevel = envOff[envOff.length - 1];
check('ADSR: release lleva env a ~0 al soltar gate', releaseLevel < 0.05,
  `env_release=${releaseLevel.toFixed(3)}`);

// --- 6. VCA: gate por env (bus 4) — render directo del módulo ---
const vcaDirect = (envVal, inputVal) => {
  hostBuses.fill(0);
  hostBuses[0] = inputVal;
  hostBuses[4] = envVal;
  moduleProcess('vca');
  return hostBuses[0];
};
check('VCA: env 0 → silencio', Math.abs(vcaDirect(0.0, 0.5)) < 1e-6, `out=${vcaDirect(0.0, 0.5).toExponential(2)}`);
check('VCA: env 1 → señal pasa (out ≈ in)', Math.abs(vcaDirect(1.0, 0.5) - 0.5) < 1e-4, `out=${vcaDirect(1.0, 0.5).toFixed(4)}`);
check('VCA: env 0.5 → atenuación a la mitad', Math.abs(vcaDirect(0.5, 0.5) - 0.25) < 1e-4, `out=${vcaDirect(0.5, 0.5).toFixed(4)}`);

// --- 7. LFO: 2 Hz sine en bus 5, pico ≈ amount ---
modules.lfo.wasm.omega_on_param(paramIdx('lfo', 'rate'), 2.0);
modules.lfo.wasm.omega_on_param(paramIdx('lfo', 'shape'), 0); // sine
modules.lfo.wasm.omega_on_param(paramIdx('lfo', 'amount'), 0.5);
const lfoSamples = runSamples(SAMPLE_RATE, true).lfoBuf;
let lfoMax = 0;
let lfoZero = 0;
for (let i = 1; i < lfoSamples.length; i++) {
  if (lfoSamples[i - 1] <= 0 && lfoSamples[i] > 0) lfoZero++;
}
for (const s of lfoSamples) lfoMax = Math.max(lfoMax, Math.abs(s));
check('LFO: 2 Hz sine en bus 5 (~2 ciclos/s)', lfoZero >= 1 && lfoZero <= 3, `${lfoZero} cruces ascendentes/s`);
check('LFO: pico ≈ amount (0.5)', Math.abs(lfoMax - 0.5) < 0.02, `peak=${lfoMax.toFixed(4)}`);

// --- Resumen ---
const failed = checks.filter((c) => !c.ok);
console.log(`\n=== ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed.length}/${checks.length} checks ===`);
process.exit(failed.length === 0 ? 0 : 1);
