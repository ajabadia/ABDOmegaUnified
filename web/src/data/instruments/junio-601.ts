/**
 * @purpose Proporciona y exporta un instrumento llamado ABD JUNiO 601 con sus especificaciones técnicas y características para su uso en el OMEGA ABDOmegaEditor.
 * @purpose_en Defines and exports an instrument called ABD JUNiO 601 with its technical specifications and characteristics for use in the OMEGA ABDOmegaEditor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:11kkrf2
 * @lastUpdated 2026-06-15T10:52:42.655Z
 */

import type { Instrument } from "./types";

export const junio601: Instrument = {
  id: "abd-junio-601",
  name: "ABD JUNiO 601",
  tagline: "Authentic 80017A VCF/VCA Emulation",
  description: "The definitive restoration of the 1984 legend. Meticulously modeled circuit-by-circuit, featuring the unique 4-step HPF logic and dual-mode BBD chorus with authentic background hiss.",
  version: "V1.2.0 (Stabilized)",
  image: "/images/instruments/hero_junio_601_render.png",
  category: "Analog",
  price: "Free / Alpha-Beta",
  colors: {
    primary: "#cf3838",
    accent: "#60a8d6"
  },
  specs: [
    {
      group: "Synthesis Engine",
      items: [
        { label: "Oscillators", value: "Phase-Synced DCO" },
        { label: "HPF", value: "4-Step Logic" },
        { label: "VCF", value: "80017A Emulation" }
      ]
    },
    {
      group: "Performance",
      items: [
        { label: "Polyphony", value: "6 Voices" },
        { label: "Chorus", value: "Dual BBD Modes" },
        { label: "MIDI", value: "SysEx / CC Mapping" }
      ]
    }
  ],
  signalPath: {
    type: "static",
    nodes: [
      { id: "in", label: "MIDI/Gate", type: "input", description: "Trigger and pitch control." },
      { id: "osc", label: "DCO Engine", type: "oscillator", description: "Pulse/Saw/Sub oscillators." },
      { id: "filter", label: "VCF 80017A", type: "filter", description: "24dB/oct resonant filter." },
      { id: "vca", label: "VCA", type: "vca", description: "Analog level control." },
      { id: "fx", label: "BBD Chorus", type: "fx", description: "Authentic dual-mode chorus." },
      { id: "out", label: "Master Out", type: "output", description: "Final stereo mix." }
    ]
  },
  features: [
    "SysEx Roland Protocol Support",
    "Tape Simulation (FSK Data)",
    "Authentic Test Mode Diagnostic"
  ]
};
