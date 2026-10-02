/**
 * rack.worklet.js — AudioWorkletProcessor del rack modular completo.
 *
 * Ejecuta los binarios REALES del rack (midi_2_cv, lfo, vco, vcf, adsr, vca y
 * los auxiliares midi_in, midi_trigger, omega_lab_monitor) dentro del
 * AudioWorkletGlobalScope con el motor WASM nativo del navegador (sin WAMR):
 *   - cada módulo se instancia con SU PROPIA memoria WebAssembly.Memory y los
 *     imports env que el ABI OMEGA espera (mismo patrón probado por
 *     tone440.worklet.js y scripts/verify_voice_chain_runtime.mjs)
 *   - los bytes llegan del hilo principal por postMessage (el scope del worklet
 *     NO tiene fetch)
 *   - el puente de buses replica WasmModuleService::process: un array host de
 *     16 buses (VoiceState) se copia a la memoria de cada módulo antes de
 *     omega_process y se lee de vuelta, manteniendo el estado entre módulos
 *   - orden topológico de la voz: midi_2_cv → lfo → vco → vcf → adsr → vca
 *   - el MIDI del navegador se inyecta a midi_in.omega_on_midi y la cadena fiel
 *     al host lo propaga: midi_in → omega_publish_midi → midi_2_cv.omega_on_midi
 *     (que convierte note on/off en voice.freq/gate/vel vía omega_set_voice_*)
 *
 * El comportamiento DSP está verificado en scripts/verify_rack_worklet_runtime.mjs
 * (este mismo archivo evaluado en node) contra los mismos binarios.
 *
 * Mensajes al hilo principal (node.port):
 *   { type: 'ready', modules: string[] }  — rack cargado y corriendo
 *   { type: 'error', message }            — fallo de carga/instanciación
 *   ← { type: 'loadRack', modules: {id: ArrayBuffer}, sampleRate }  (transferidos)
 *   ← { type: 'midi', status, d1, d2 }    — evento MIDI (Web MIDI / teclado)
 *   ← { type: 'setParam', module, param, value }  — control de parámetros
 */

const BUSES_PTR = 4 * 65536; // byte offset del buffer de buses en CADA módulo
const BUS_FLOATS = 16;       // VoiceState.buses[16] — layout idéntico al host
const BUS_IDX = BUSES_PTR >> 2;
const MAX_BLOCK = 128;       // render quantum estándar

// Índices de layout de buses (espejo del host):
//   0/1 audio L/R · 2 sub L · 3 aux R · 4 ENV · 5 LFO
//   6-9 CV VCO (v_oct/fm/pwm/sync) · 10-11 CV VCF · 12/13 gate CV ADSR/VCA

// Módulos de la cadena de voz (orden topológico de render).
const VOICE_CHAIN = ['midi_2_cv', 'lfo', 'vco', 'vcf', 'adsr', 'vca'];

// Módulos auxiliares que se instancian (ABI real) pero no participan en el audio.
// midi_trigger se instancia pero su param "trigger" es inerte: su omega_on_param
// pasa por el import ABI roto _ZN11MidiTrigger7onParamEif (el host tampoco lo
// registra en sus 14 natives — no hay verificación runtime de él en la pipeline).
const AUX_MODULES = ['midi_in', 'midi_trigger', 'omega_lab_monitor'];

// Parámetros de bypass probados por verify_voice_chain_runtime.mjs.
const DEFAULT_PARAMS = {
  vco: { waveform: 2, coarse: 0, drift: 0 },
  vcf: { cutoff: 20000, resonance: 0, mode: 0, keytrack: 0, cutoff_cv: 0, res_cv: 0 },
  adsr: { attack: 1.0, decay: 1.0, sustain: 0.8, release: 1.0 },
  vca: { level: 1.0, env_depth: 1.0, curve: 0.0 },
  lfo: {},
  midi_2_cv: {},
};

class RackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ready = false;
    this.error = null;
    this.modules = {};   // id -> { wasm, memory, view }
    this.voice = { freq: 440.0, gate: 0.0, vel: 1.0 };
    this.hostBuses = new Float32Array(BUS_FLOATS);
    this.readback = new Float32Array(BUS_FLOATS);

    this.port.onmessage = (e) => {
      if (!e.data) return;
      switch (e.data.type) {
        case 'loadRack':
          this._initRack(e.data);
          break;
        case 'midi':
          this._onMidi(e.data.status, e.data.d1, e.data.d2);
          break;
        case 'setParam':
          this._onParam(e.data.module, e.data.param, e.data.value);
          break;
      }
    };
  }

  // Crea el import object env con los natives OMEGA que el ABI requiere.
  // Proporcionar TODOS los natives a cada módulo es inofensivo: los imports no
  // usados simplemente no se invocan.
  _makeImports(memory) {
    const voice = this.voice;
    return {
      env: {
        memory,
        __memory_base: 0,
        omega_publish_telemetry: () => {},
        omega_get_voice_frequency: () => voice.freq,
        omega_get_voice_gate: () => voice.gate,
        omega_get_voice_velocity: () => voice.vel,
        omega_set_voice_freq: (v) => { voice.freq = v; },
        omega_set_voice_gate: (v) => { voice.gate = v; },
        omega_set_voice_vel: (v) => { voice.vel = v; },
        omega_set_voice_at: () => {},
        omega_get_sample_rate: () => sampleRate,
        omega_get_block_size: () => MAX_BLOCK,
        omega_get_midi_protocol: () => 1,
        omega_publish_midi: (port, status, d1, d2) => { this._forwardMidi(status, d1, d2); },
        omega_log_terminal: () => {},
        _ZN11MidiTrigger7onParamEif: () => {},
      },
    };
  }

  _makeMonitorImports(memory) {
    const imports = this._makeImports(memory);
    imports['GOT.mem'] = {};
    for (const sym of [
      'g_scope_buffer', 'g_timebase', 'g_write_ptr', 'g_gain',
      'g_offset', 'g_mode', 'g_signalPeak', 'g_telemetryCounter',
    ]) {
      imports['GOT.mem'][sym] = new WebAssembly.Global({ value: 'i32', mutable: true }, 0);
    }
    imports.env.__stack_pointer = new WebAssembly.Global(
      { value: 'i32', mutable: true }, memory.buffer.byteLength,
    );
    return imports;
  }

  _readCString(memory, ptr) {
    const bytes = new Uint8Array(memory.buffer);
    let end = ptr;
    while (end < bytes.length && bytes[end] !== 0) end++;
    return new TextDecoder().decode(bytes.subarray(ptr, end));
  }

  _paramIndex(id, param) {
    const mod = this.modules[id];
    if (!mod || !mod.contract) return -1;
    const params = mod.contract.parameters ?? [];
    const found = params.findIndex((p) => (p.id ?? p.name) === param);
    return found;
  }

  async _loadModule(id, bytes) {
    const memory = new WebAssembly.Memory({ initial: 8 });
    const imports =
      id === 'omega_lab_monitor'
        ? this._makeMonitorImports(memory)
        : this._makeImports(memory);

    const { instance } = await WebAssembly.instantiate(bytes, imports);
    const wasm = instance.exports;

    // Side module PIC: aplicar relocs de datos si el binario las exporta.
    if (typeof wasm.__wasm_apply_data_relocs === 'function') wasm.__wasm_apply_data_relocs();
    if (typeof wasm.__wasm_call_ctors === 'function') wasm.__wasm_call_ctors();
    if (typeof wasm.omega_init === 'function') wasm.omega_init(sampleRate);

    const contract = {};
    if (typeof wasm.omega_get_contract === 'function') {
      try {
        contract.parameters = JSON.parse(this._readCString(memory, wasm.omega_get_contract())).parameters ?? [];
      } catch { /* contrato no parseable: se ignoran los defaults */ }
    }

    this.modules[id] = {
      wasm,
      memory,
      view: new Float32Array(memory.buffer),
      contract,
    };
    return id;
  }

  async _initRack({ modules, sampleRate: sr }) {
    try {
      const all = [...VOICE_CHAIN, ...AUX_MODULES];
      const failures = [];
      for (const id of all) {
        const bytes = modules[id];
        if (!bytes) {
          failures.push(`${id}: sin bytes`);
          continue;
        }
        try {
          await this._loadModule(id, bytes);
        } catch (e) {
          failures.push(`${id}: ${(e && e.message) || e}`);
        }
      }

      const missing = VOICE_CHAIN.filter((id) => !this.modules[id]);
      if (missing.length > 0) {
        throw new Error(`cadena de voz incompleta: ${missing.join(', ')}`);
      }

      this._applyDefaults();
      this.ready = true;

      // Expone los contratos embebidos (parámetros) y los defaults aplicados en
      // el arranque, para que la UI construya los controles con los MISMOS
      // valores que el motor usa realmente.
      const contracts = {};
      for (const id of VOICE_CHAIN) {
        const params = this.modules[id]?.contract?.parameters;
        if (params) contracts[id] = params;
      }

      this.port.postMessage({
        type: 'ready',
        modules: Object.keys(this.modules),
        warnings: failures,
        contracts,
        defaults: DEFAULT_PARAMS,
      });
    } catch (e) {
      this.error = String((e && e.message) || e);
      this.port.postMessage({ type: 'error', message: this.error });
    }
  }

  _applyDefaults() {
    for (const [id, params] of Object.entries(DEFAULT_PARAMS)) {
      const mod = this.modules[id];
      if (!mod) continue;
      for (const [param, value] of Object.entries(params)) {
        const idx = this._paramIndex(id, param);
        if (idx >= 0) mod.wasm.omega_on_param(idx, value);
      }
    }
  }

  // Reenvía MIDI publicado por un módulo (omega_publish_midi) a la cadena de
  // voz, como hace el host (el bus modularMidi se despacha a los midiTargets).
  _forwardMidi(status, d1, d2) {
    const cv = this.modules['midi_2_cv'];
    if (cv && typeof cv.wasm.omega_on_midi === 'function') {
      cv.wasm.omega_on_midi(status, d1, d2);
    }
  }

  _onMidi(status, d1, d2) {
    if (!this.ready) return;
    // Cadena fiel al host: sistema → midi_in.omega_on_midi → omega_publish_midi
    // → midi_2_cv.omega_on_midi. Fallback directo si midi_in no está cargado.
    const input = this.modules['midi_in'];
    if (input && typeof input.wasm.omega_on_midi === 'function') {
      input.wasm.omega_on_midi(status, d1, d2);
    } else {
      this._forwardMidi(status, d1, d2);
    }
  }

  _onParam(module, param, value) {
    if (!this.ready) return;
    const mod = this.modules[module];
    if (!mod) return;
    const idx = this._paramIndex(module, param);
    if (idx >= 0) mod.wasm.omega_on_param(idx, value);
  }

  // Puente zero-copy por llamada (1 muestra): copia los buses host a la
  // memoria del módulo, ejecuta omega_process y lee los buses de vuelta.
  _processModule(id) {
    const mod = this.modules[id];
    if (!mod) return;
    const view = mod.view;
    view.set(this.hostBuses, BUS_IDX);
    mod.wasm.omega_process(BUSES_PTR, 1);
    for (let j = 0; j < BUS_FLOATS; j++) this.readback[j] = view[BUS_IDX + j];
    this.hostBuses.set(this.readback);
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;

    if (!this.ready) {
      for (let ch = 0; ch < out.length; ch++) out[ch].fill(0);
      return true;
    }

    const block = Math.min(out[0].length, MAX_BLOCK);
    for (let i = 0; i < block; i++) {
      for (const id of VOICE_CHAIN) this._processModule(id);
      for (let ch = 0; ch < out.length; ch++) {
        out[ch][i] = ch < 2 ? this.hostBuses[ch] : 0;
      }
    }
    for (let ch = 0; ch < out.length; ch++) {
      if (block < out[ch].length) out[ch].fill(0, block);
    }
    return true;
  }
}

registerProcessor('rack-processor', RackProcessor);
