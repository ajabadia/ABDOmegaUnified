/**
 * verify_midi_2_cv_runtime.mjs — Verificación runtime del módulo midi_2_cv
 *
 * Instancia el binario REAL `modules/midi_2_cv/midi_2_cv.wasm` (el mismo que el
 * host standalone carga vía junction `host/Resources/modules/midi_2_cv/`) con
 * stubs de host (WAMR: `omega_publish_telemetry` + `omega_set_voice_*`), y
 * verifica:
 *
 *   1. Contrato embebido (`omega_get_contract`) == `midi_2_cv.contract.json`.
 *   2. Omnicanal por defecto (channel 0 responde a cualquier canal MIDI).
 *   3. Note On → gate=1.0, velocity = data2/127, freq = midiToHz(note)
 *      (69 → 440 Hz = CONCERT_A; 60 → C4 ≈ 261.63 Hz).
 *   4. Note Off → gate=0.0 (y Note On con velocity 0 también cierra gate).
 *   5. Pitch Bend → la freq sube con bend hacia arriba (bend_range>0).
 *   6. `midi_channel` filtra canales (solo responde a su canal).
 *   7. Glide: con `glide_time` > 0 la freq alcanza el target en N muestras
 *      (rampa por bloque, no salto), y el target se alcanza exactamente.
 *
 * Los valores esperados se derivan de `OmegaConstants.h` (MIDI_NORM_FACTOR,
 * MIDI_BEND_CENTER, TELEMETRY_FULL_SIGNAL) — no hay magic numbers aquí.
 *
 * Uso:  node scripts/verify_midi_2_cv_runtime.mjs   (exit 0 = PASS)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_DIR = resolve(ROOT, 'modules/midi_2_cv');
const WASM_PATH = resolve(MODULE_DIR, 'midi_2_cv.wasm');
const CONTRACT_PATH = resolve(MODULE_DIR, 'midi_2_cv.contract.json');

const SAMPLE_RATE = 48000;

// Espejos de Omega::Constants (fuente canónica: engine/include/Core/Ace/OmegaConstants.h)
const MIDI_NOTE_OFF = 0x80;
const MIDI_NOTE_ON = 0x90;
const MIDI_PITCH_BEND = 0xE0;
const MIDI_CHANNEL_MASK = 0x0F;
const MIDI_STATUS_MASK = 0xF0;
const MIDI_NORM_FACTOR = 1.0 / 127.0;
const MIDI_BEND_CENTER = 8192;
const MIDI_BEND_NORM_FACTOR = 1.0 / 8192.0;
const TELEMETRY_FULL_SIGNAL = 1.0;
const SEMITONES_PER_OCTAVE = 12;
const CONCERT_A_FREQ_HZ = 440;

// MIDI → Hz, espejo de la tabla del cpp.
const SEMITONE_TABLE = [
  8.1757989156, 8.6619572180, 9.1770239974, 9.7227182413,
  10.3008611535, 10.9133822323, 11.5623257097, 12.2498573744,
  12.9782717994, 13.7500000000, 14.5676175474, 15.4338531643,
];
const midiToHz = (note) => {
  const oct = Math.floor(note / SEMITONES_PER_OCTAVE);
  let f = SEMITONE_TABLE[note % SEMITONES_PER_OCTAVE];
  for (let i = 0; i < oct; i++) f *= 2;
  return f;
};

// --- Stubs de host (vía voz) ---
const calls = { freq: [], gate: [], vel: [], at: [] };
function omega_publish_telemetry() {}
function omega_set_voice_freq(v) { calls.freq.push(v); }
function omega_set_voice_gate(v) { calls.gate.push(v); }
function omega_set_voice_vel(v) { calls.vel.push(v); }
function omega_set_voice_at(v) { calls.at.push(v); }

// --- Carga del wasm ---
const wasmBytes = readFileSync(WASM_PATH);
const memory = new WebAssembly.Memory({ initial: 8 });
const imports = {
  env: {
    memory,
    __memory_base: 0,
    omega_publish_telemetry,
    omega_set_voice_freq,
    omega_set_voice_gate,
    omega_set_voice_vel,
    omega_set_voice_at,
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

const last = (arr) => (arr.length ? arr[arr.length - 1] : undefined);
const lastFreq = () => last(calls.freq);
const lastGate = () => last(calls.gate);
const lastVel = () => last(calls.vel);

console.log('=== verify_midi_2_cv_runtime.mjs ===');
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

// Índices de parámetros (mismo orden que el contrato).
const paramIndex = Object.fromEntries(contractFile.parameters.map((p, i) => [p.id, i]));

const resetCalls = () => { for (const k of Object.keys(calls)) calls[k] = []; };

// --- 2. Omnicanal: Note On en canal 4 (0x94) sin configurar midi_channel ---
resetCalls();
wasm.omega_on_midi(MIDI_NOTE_ON | 3, 69, 100); // 0x93 = canal 4
check(
  'Omnicanal por defecto (channel=0) responde a canal 4',
  lastGate() === TELEMETRY_FULL_SIGNAL && lastFreq() === CONCERT_A_FREQ_HZ,
  `freq=${lastFreq()} gate=${lastGate()}`,
);

// --- 3. Note On → gate/vel/freq ---
resetCalls();
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 60, 100); // canal 1, C4, vel 100
const expectFreqC4 = midiToHz(60);
check(
  'Note On C4 → freq ≈ 261.63 Hz (midiToHz)',
  Math.abs(lastFreq() - expectFreqC4) < 0.01,
  `freq=${lastFreq().toFixed(3)} esperado≈${expectFreqC4.toFixed(3)}`,
);
check('Note On → gate=1.0', lastGate() === TELEMETRY_FULL_SIGNAL, `gate=${lastGate()}`);
check(
  'Note On → velocity = data2/127',
  Math.abs(lastVel() - 100 * MIDI_NORM_FACTOR) < 1e-4,
  `vel=${lastVel().toFixed(4)} esperado=${(100 * MIDI_NORM_FACTOR).toFixed(4)}`,
);

// --- 4. Note Off → gate=0.0 ; Note On vel 0 también cierra gate ---
resetCalls();
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 60, 100);
const freqCallsAfterNoteOn = calls.freq.length;
wasm.omega_on_midi(MIDI_NOTE_OFF | 0, 60, 0);
check('Note Off → gate=0.0', lastGate() === 0, `gate=${lastGate()}`);
check(
  'Note Off → NO toca freq',
  calls.freq.length === freqCallsAfterNoteOn,
  `freqCalls=${calls.freq.length}`,
);

resetCalls();
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 60, 100);
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 60, 0); // vel 0 = Note Off
check('Note On vel 0 → gate=0.0', lastGate() === 0, `gate=${lastGate()}`);

// --- 5. Pitch Bend sube la freq (bend_range default = 2) ---
resetCalls();
wasm.omega_init(SAMPLE_RATE); // estado limpio: currentFreq = CONCERT_A
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 69, 100); // base 440
const base440 = lastFreq();
wasm.omega_on_midi(MIDI_PITCH_BEND | 0, 0x7F, 0x7F); // bend full up
check('Pitch Bend ↑ → freq > base', lastFreq() > base440, `base=${base440.toFixed(2)} bend=${lastFreq().toFixed(2)}`);
wasm.omega_on_midi(MIDI_PITCH_BEND | 0, 0, 0x00); // bend full down (0)
check('Pitch Bend ↓ → freq < base', lastFreq() < base440, `bend=${lastFreq().toFixed(2)}`);
wasm.omega_on_midi(MIDI_PITCH_BEND | 0, 0x00, 0x40); // bend center (8192) → 1.0
check('Pitch Bend center → freq == base', Math.abs(lastFreq() - base440) < 1e-3, `freq=${lastFreq().toFixed(3)}`);

// --- 6. midi_channel filtra canales ---
resetCalls();
wasm.omega_on_param(paramIndex.midi_channel, 1); // canal 1
wasm.omega_on_midi(MIDI_NOTE_ON | 4, 60, 100); // canal 5 → ignorado
check('midi_channel=1 ignora canal 5', calls.gate.length === 0 && calls.freq.length === 0, `gateCalls=${calls.gate.length}`);
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 60, 100); // canal 1 → aceptado
check('midi_channel=1 acepta canal 1', lastGate() === TELEMETRY_FULL_SIGNAL, `gate=${lastGate()}`);
wasm.omega_on_param(paramIndex.midi_channel, 0); // reset omni

// --- 7. Glide: rampa por bloque hasta el target ---
resetCalls();
wasm.omega_init(SAMPLE_RATE); // estado limpio: currentFreq = CONCERT_A
wasm.omega_on_param(paramIndex.glide_time, 100); // 100 ms glide
wasm.omega_on_param(paramIndex.glide_mode, 1);
wasm.omega_on_midi(MIDI_NOTE_ON | 0, 60, 100); // desde 440 → 261.63

const target = midiToHz(60);
const start = CONCERT_A_FREQ_HZ;
const glideSamples = Math.round((100 / 1000) * SAMPLE_RATE); // 4800
const halfSamples = Math.floor(glideSamples / 2);

const run = (n) => {
  const scratch = new Float32Array(memory.buffer, 0, 4); // buffer sin usar por el módulo
  for (let i = 0; i < n; i++) wasm.omega_process(scratch.byteOffset, 1);
  void scratch;
};

check('Glide: no salta directo a target (aún no publicado al Note On)', lastFreq() === undefined, `freqCalls=${calls.freq.length}`);

run(halfSamples);
const midFreq = lastFreq();
check(
  'Glide: a mitad de rampa la freq está entre origen y target',
  midFreq > target && midFreq < start && Math.abs(midFreq - ((start + target) / 2)) < 2,
  `freq=${midFreq.toFixed(2)} rango=[${target.toFixed(1)}, ${start.toFixed(1)}]`,
);

run(halfSamples);
const endFreq = lastFreq();
check(
  'Glide: al final de la rampa freq == target',
  Math.abs(endFreq - target) < 0.01,
  `freq=${endFreq.toFixed(3)} esperado=${target.toFixed(3)}`,
);

// --- Resumen ---
const failed = checks.filter((c) => !c.ok);
console.log(`\n=== ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed.length}/${checks.length} checks ===`);
process.exit(failed.length === 0 ? 0 : 1);
