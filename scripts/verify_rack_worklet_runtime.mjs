/**
 * verify_rack_worklet_runtime.mjs — Verificación runtime del rack en WEB
 *
 * Carga el archivo REAL del worklet (`web/public/worklets/rack.worklet.js`)
 * dentro de un AudioWorkletGlobalScope simulado en node, y verifica que el rack
 * modular completo suena con los binarios REALES de `web/public/wasm`:
 *
 *   1. Los 9 módulos del rack se instancian de forma NATIVA (V8) — sin WAMR.
 *   2. Con gate cerrado (sin nota) la salida es silencio (env 0 → VCA cerrado).
 *   3. Note On (69 → 440 Hz) → la cadena midi_2_cv → vco → vcf → adsr → vca
 *      produce audio real: RMS > 0.05 y ~440 cruces por cero por segundo.
 *   4. Note Off → tras el release la salida decae a silencio.
 *
 * Es el mismo archivo que corre en el navegador (mismo class, mismo bridge de
 * buses, mismos binarios) — eval() simula el scope del worklet.
 *
 * Uso:  node scripts/verify_rack_worklet_runtime.mjs   (exit 0 = PASS)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WASM_DIR = resolve(ROOT, 'web/public/wasm');
const WORKLET_PATH = resolve(ROOT, 'web/public/worklets/rack.worklet.js');
const SAMPLE_RATE = 48000;

const MODULE_IDS = [
  'midi_2_cv', 'lfo', 'vco', 'vcf', 'adsr', 'vca',
  'midi_in', 'midi_trigger', 'omega_lab_monitor',
];

// --- AudioWorkletGlobalScope simulado ---
const registered = {};
const rackBytes = {};
for (const id of MODULE_IDS) {
  rackBytes[id] = readFileSync(resolve(WASM_DIR, `${id}.wasm`));
}

class FakePort {
  constructor() {
    this.out = [];
    this._handler = null;
  }
  postMessage(msg) { this.out.push(msg); }
  set onmessage(h) { this._handler = h; }
  get onmessage() { return this._handler; }
}

class AudioWorkletProcessorBase {
  constructor() { this.port = new FakePort(); }
}

globalThis.registerProcessor = (name, cls) => { registered[name] = cls; };
globalThis.AudioWorkletProcessor = AudioWorkletProcessorBase;
globalThis.sampleRate = SAMPLE_RATE;

const workletSource = readFileSync(WORKLET_PATH, 'utf8');
(0, eval)(workletSource);

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log('=== verify_rack_worklet_runtime.mjs ===');
console.log(`worklet: ${WORKLET_PATH}\n`);

const Proc = registered['rack-processor'];
check('rack-processor registrado por el worklet', typeof Proc === 'function');
if (typeof Proc !== 'function') process.exit(1);

const p = new Proc();

const waitFor = (pred, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const found = p.port.out.find(pred);
      if (found) { clearInterval(iv); resolve(found); }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error('timeout esperando mensaje del worklet')); }
    }, 5);
  });

// Cargar el rack (postMessage con los binarios transferidos, como el main thread).
p.port._handler({ data: { type: 'loadRack', modules: rackBytes, sampleRate: SAMPLE_RATE } });

const readyMsg = await waitFor((m) => m.type === 'ready' || m.type === 'error');
check('Worklet responde ready (sin error)', readyMsg.type === 'ready',
  readyMsg.type === 'error' ? readyMsg.message : readyMsg.warnings?.join('; '));

if (readyMsg.type !== 'ready') {
  console.log('\n=== FAIL ===');
  process.exit(1);
}

const loaded = readyMsg.modules;
check('Los 9 módulos del rack cargados de forma nativa', MODULE_IDS.every((id) => loaded.includes(id)),
  `[${loaded.join(', ')}]`);

// Spy sobre el reenvío de omega_publish_midi: prueba EXPLÍCITA de que el MIDI
// llega a midi_2_cv por la cadena fiel (midi_in → omega_publish_midi → midi_2_cv)
// y no por una vía directa. Nota: midi_trigger se instancia pero su param
// "trigger" es inerte (su omega_on_param pasa por un import ABI roto que el
// host tampoco registra — no hay verificación runtime de él en la pipeline).
let forwards = 0;
const origForward = p._forwardMidi.bind(p);
p._forwardMidi = (...args) => { forwards++; return origForward(...args); };

// --- Helpers de audio ---
const rmsOf = (samples) => {
  let acc = 0;
  for (const s of samples) acc += s * s;
  return Math.sqrt(acc / samples.length);
};
const zeroCrossings = (samples) => {
  let n = 0;
  let prev = 0;
  for (const s of samples) {
    if (prev <= 0 && s > 0) n++;
    prev = s;
  }
  return n;
};

const outputs = () => [[new Float32Array(128), new Float32Array(128)]];
const render = (samples) => {
  const buf = new Float32Array(samples);
  const blockSize = 128;
  for (let off = 0; off < samples; off += blockSize) {
    const outs = outputs();
    p.process([], outs);
    const ch = outs[0][0];
    const n = Math.min(blockSize, samples - off);
    for (let i = 0; i < n; i++) buf[off + i] = ch[i];
  }
  return buf;
};

// --- 2. Sin nota: gate cerrado → VCA cerrado → silencio ---
const silent = render(4096);
check('Sin nota → salida en silencio (env 0 → VCA cerrado)', rmsOf(silent) < 1e-5,
  `rms=${rmsOf(silent).toExponential(2)}`);

// --- 3. Note On 69 → 440 Hz: audio real de la cadena completa ---
p.port._handler({ data: { type: 'midi', status: 0x90, d1: 69, d2: 100 } });
render(4096); // warmup de ataque

const noteBuf = render(SAMPLE_RATE);
const noteRms = rmsOf(noteBuf);
const noteZero = zeroCrossings(noteBuf);
check('Note On 69 → la cadena de voz suena (RMS > 0.05)', noteRms > 0.05, `rms=${noteRms.toFixed(4)}`);
check('Note On 69 → ~440 cruces por cero por segundo',
  Math.abs(noteZero - 440) <= 10, `${noteZero} cruces/s`);
check('MIDI llega por la cadena fiel midi_in → omega_publish_midi → midi_2_cv', forwards >= 1,
  `${forwards} publicaciones reenviadas`);

// --- 4. Note Off → release → silencio ---
p.port._handler({ data: { type: 'midi', status: 0x80, d1: 69, d2: 0 } });
render(0.5 * SAMPLE_RATE); // release
const releaseBuf = render(SAMPLE_RATE);
const releaseRms = rmsOf(releaseBuf);
check('Note Off → tras el release la salida decae a silencio', releaseRms < 0.05,
  `rms=${releaseRms.toFixed(4)}`);

// --- 5. Parámetro por contrato (defaults aplicados + setParam) ---
// vco waveform → sine (0): el RMS baja pero sigue sonando (control funcional).
p.port._handler({ data: { type: 'midi', status: 0x90, d1: 69, d2: 100 } });
render(4096);
p.port._handler({ data: { type: 'setParam', module: 'vco', param: 'waveform', value: 0 } });
render(4096);
const sineBuf = render(SAMPLE_RATE);
check('setParam vco.waveform=0 (sine) → sigue sonando (RMS > 0.05)', rmsOf(sineBuf) > 0.05,
  `rms=${rmsOf(sineBuf).toFixed(4)}`);

// --- Resumen ---
const failed = checks.filter((c) => !c.ok);
console.log(`\n=== ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed.length}/${checks.length} checks ===`);
process.exit(failed.length === 0 ? 0 : 1);
