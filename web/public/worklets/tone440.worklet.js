/**
 * tone440.worklet.js — AudioWorkletProcessor para el módulo 440demo.
 *
 * Ejecuta el binario REAL `440demo.wasm` (el mismo que el host standalone usa,
 * vía junction) dentro del AudioWorkletGlobalScope:
 *   - los BYTES los recibe del hilo principal por postMessage con transferencia
 *     (el scope del worklet NO tiene `fetch` — el main thread lo hace por él)
 *   - instancia con imports env: memory / __memory_base / omega_publish_telemetry
 *   - omega_init(sampleRate) — el módulo arranca con el switch ON por defecto
 *   - por bloque: omega_process(scratch, block) escribe el tono 440 Hz en el
 *     bus scratch, que se copia a todos los canales de salida.
 *
 * El comportamiento DSP (440 Hz, amplitud 0.5, switch ON, LED 8 Hz) está
 * verificado en scripts/verify_440demo_runtime.mjs (11/11 checks) contra este
 * mismo binario.
 *
 * Mensajes al hilo principal (node.port):
 *   { type: 'ready', sampleRate, wasmBytes }   — wasm cargado y corriendo
 *   { type: 'error', message }                 — fallo de carga/instanciación
 *   ← { type: 'loadWasm', bytes }              — binario 440demo (transferido)
 *   ← { type: 'setEnabled', value }            — control futuro del switch
 */

const SCRATCH_PTR = 65536; // fuera del bss del módulo (memoria 2 páginas = 128 KiB)
const MAX_BLOCK = 512;     // render quantum (128) con margen de sobra

class Tone440Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.initialized = false;
    this.error = null;
    this.wasm = null;
    this.bus = null;
    this.enabled = true;

    this.port.onmessage = (e) => {
      if (!e.data) return;
      if (e.data.type === 'loadWasm') {
        this._initWithBytes(e.data.bytes);
      } else if (e.data.type === 'setEnabled') {
        this.enabled = Boolean(e.data.value);
        if (this.initialized && this.wasm) {
          this.wasm.omega_on_param(0, this.enabled ? 1.0 : 0.0);
        }
      }
    };
  }

  async _initWithBytes(bytes) {
    try {
      const memory = new WebAssembly.Memory({ initial: 2 }); // 2 páginas = 128 KiB
      const imports = {
        env: {
          memory,
          __memory_base: 0,
          // La telemetría del LED (8 Hz) se descarta en el worklet por ahora.
          omega_publish_telemetry: () => {},
        },
      };

      const { instance } = await WebAssembly.instantiate(bytes, imports);
      this.wasm = instance.exports;
      if (typeof this.wasm.__wasm_call_ctors === 'function') this.wasm.__wasm_call_ctors();
      this.wasm.omega_init(sampleRate);

      this.bus = new Float32Array(memory.buffer, SCRATCH_PTR, MAX_BLOCK);
      this.initialized = true;
      this.port.postMessage({ type: 'ready', sampleRate, wasmBytes: bytes.byteLength });
    } catch (e) {
      this.error = String((e && e.message) || e);
      this.port.postMessage({ type: 'error', message: this.error });
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;

    // Silencio hasta que el wasm esté listo (o si el switch está OFF).
    if (!this.initialized || !this.wasm || !this.bus) {
      for (let ch = 0; ch < out.length; ch++) out[ch].fill(0);
      return true;
    }

    const block = Math.min(out[0].length, this.bus.length);
    this.wasm.omega_process(SCRATCH_PTR, block);

    for (let ch = 0; ch < out.length; ch++) {
      const chan = out[ch];
      for (let i = 0; i < block; i++) chan[i] = this.bus[i];
      if (block < chan.length) chan.fill(0, block);
    }
    return true;
  }
}

registerProcessor('tone440-processor', Tone440Processor);
