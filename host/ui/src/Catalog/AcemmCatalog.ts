/**
 * OMEGA Era 7.2.3 - ACEMM Catalog & Manifest Resolver
 * Single Source of Truth for offline/fallback module manifests and catalog metadata.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import { resolveRackTarget } from '../Logic/RackRouter.js';

export const ACEMM_CATALOG: Record<string, any> = {
  "midi_in": {
    id: "midi_in",
    name: "Global MIDI Input",
    rack: { slot: "upper", hp: 6 },
    controls: [{ id: "channel", name: "Ch Select", type: "knob" }, { id: "vel", name: "Vel Curve", type: "knob" }],
    jacks: [{ id: "midi_out", name: "MIDI Out", dataType: "midi", direction: "output" }, { id: "gate_out", name: "Gate Out", dataType: "cv", direction: "output" }]
  },
  "midi_trigger": {
    id: "midi_trigger",
    name: "MIDI Trigger & Gate",
    rack: { slot: "upper", hp: 6 },
    controls: [{ id: "mode", name: "Trig Mode", type: "knob" }, { id: "len", name: "Pulse Len", type: "knob" }],
    jacks: [
      { id: "midi_in", name: "MIDI In", dataType: "midi", direction: "input" },
      { id: "trig_out", name: "Trig Out", dataType: "cv", direction: "output" },
      { id: "gate_out", name: "Gate Out", dataType: "cv", direction: "output" },
      { id: "note_out", name: "Note V/Oct", dataType: "cv", direction: "output" }
    ]
  },
  "omega_lab_monitor": {
    id: "omega_lab_monitor",
    name: "Omega Telemetry Monitor",
    rack: { slot: "upper", hp: 8 },
    controls: [{ id: "timebase", name: "Timebase", type: "knob" }, { id: "scale", name: "V/Div Scale", type: "knob" }],
    jacks: [{ id: "sig_in", name: "Signal In", dataType: "audio", direction: "input" }, { id: "cv_in", name: "CV In", dataType: "cv", direction: "input" }]
  },
  "test_parity": {
    id: "test_parity",
    name: "Era 7 Parity Test",
    rack: { slot: "lower", hp: 12 },
    controls: [{ id: "freq", name: "Frequency", type: "knob" }, { id: "resonance", name: "Resonance", type: "knob" }, { id: "drive", name: "Drive", type: "knob" }],
    jacks: [{ id: "audio_in", name: "Audio In", dataType: "audio", direction: "input" }, { id: "audio_out", name: "Audio Out", dataType: "audio", direction: "output" }]
  },
  "oscillator_vA": {
    id: "oscillator_vA",
    name: "Analog Oscillator (VCO)",
    rack: { slot: "lower", hp: 10 },
    controls: [
      { id: "pitch", name: "Coarse Pitch", type: "knob" },
      { id: "fine", name: "Fine Tune", type: "knob" },
      { id: "shape", name: "Wave Shape", type: "knob" },
      { id: "fm_depth", name: "FM Depth", type: "knob" }
    ],
    jacks: [
      { id: "pitch_in", name: "V/OCT In", dataType: "cv", direction: "input" },
      { id: "fm_in", name: "FM CV", dataType: "cv", direction: "input" },
      { id: "sine_out", name: "Sine Out", dataType: "audio", direction: "output" },
      { id: "saw_out", name: "Saw Out", dataType: "audio", direction: "output" }
    ]
  },
  "filter_vA": {
    id: "filter_vA",
    name: "Ladder VCF Filter",
    rack: { slot: "lower", hp: 10 },
    controls: [
      { id: "cutoff", name: "Cutoff Freq", type: "knob" },
      { id: "resonance", name: "Resonance", type: "knob" },
      { id: "drive", name: "Overdrive", type: "knob" },
      { id: "env_amount", name: "Env Modulation", type: "knob" }
    ],
    jacks: [
      { id: "audio_in", name: "Audio In", dataType: "audio", direction: "input" },
      { id: "cutoff_cv", name: "Cutoff CV", dataType: "cv", direction: "input" },
      { id: "audio_out", name: "Audio Out", dataType: "audio", direction: "output" }
    ]
  },
  "envelope_adsr": {
    id: "envelope_adsr",
    name: "ADSR Envelope Generator",
    rack: { slot: "lower", hp: 8 },
    controls: [
      { id: "attack", name: "Attack", type: "knob" },
      { id: "decay", name: "Decay", type: "knob" },
      { id: "sustain", name: "Sustain", type: "knob" },
      { id: "release", name: "Release", type: "knob" }
    ],
    jacks: [
      { id: "gate_in", name: "Gate In", dataType: "cv", direction: "input" },
      { id: "env_out", name: "Env Out", dataType: "cv", direction: "output" }
    ]
  },
  "vca": {
    id: "vca",
    name: "Dual Linear VCA",
    rack: { slot: "lower", hp: 6 },
    controls: [
      { id: "gain", name: "Initial Gain", type: "knob" },
      { id: "cv_amt", name: "CV Amount", type: "knob" }
    ],
    jacks: [
      { id: "in", name: "Signal In", dataType: "audio", direction: "input" },
      { id: "cv", name: "CV In", dataType: "cv", direction: "input" },
      { id: "out", name: "Signal Out", dataType: "audio", direction: "output" }
    ]
  },
  "lfo": {
    id: "lfo",
    name: "Multi-Wave LFO",
    rack: { slot: "lower", hp: 6 },
    controls: [
      { id: "rate", name: "LFO Speed", type: "knob" },
      { id: "depth", name: "Output Depth", type: "knob" }
    ],
    jacks: [
      { id: "reset_in", name: "Sync Reset", dataType: "cv", direction: "input" },
      { id: "lfo_out", name: "LFO Out", dataType: "cv", direction: "output" }
    ]
  }
};

/**
 * Fetches or resolves a module manifest by ID from schemaStore or ACEMM_CATALOG.
 */
export async function getOrFetchManifest(id: string): Promise<any> {
  if (!id) return null;
  const win = window as any;
  let manifest = win.schemaStore?.getSchema(id);
  
  if (!manifest && ACEMM_CATALOG[id]) {
    manifest = ACEMM_CATALOG[id];
    // Register into schemaStore if available so ModuleManager finds it
    if (win.schemaStore && typeof win.schemaStore.registerSchema === 'function') {
      win.schemaStore.registerSchema(id, manifest);
    }
  }

  if (!manifest) {
    manifest = {
      id,
      name: id.toUpperCase(),
      rack: { slot: resolveRackTarget(id, {}, null).isUpper ? "upper" : "lower", hp: 8 },
      controls: [{ id: "param1", name: "Param 1", type: "knob" }],
      jacks: [{ id: "in1", name: "In 1", dataType: "audio", direction: "input" }, { id: "out1", name: "Out 1", dataType: "audio", direction: "output" }]
    };
  }
  return manifest;
}

// Bind to window for global access
if (typeof window !== 'undefined') {
  (window as any).ACEMM_CATALOG = ACEMM_CATALOG;
  (window as any).getOrFetchManifest = getOrFetchManifest;
}
