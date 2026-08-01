/**
 * @purpose Gestiona los detalles del instrumento ABD OMEGA para su uso en el editor de manifesto OMEGA.
 * @purpose_en Defines the details of the ABD OMEGA instrument for use in the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1svx54r
 * @lastUpdated 2026-06-15T10:52:52.120Z
 */

import type { Instrument } from "./types";

export const omega: Instrument = {
  id: "abd-omega",
  name: "ABD OMEGA",
  tagline: "System Under Construction",
  description: "The next generation of modular synthesis is currently in the laboratory. Omega is undergoing deep structural calibration for the Era 6.2 deployment. Access is currently restricted to core engineers.",
  version: "ERA 6.2_DEV",
  image: "/images/instruments/hero_omega_render.png",
  category: "Modular",
  price: "Free / Alpha-Beta",
  colors: {
    primary: "#00f2ff",
    accent: "#ffaa00"
  },
  specs: [
    {
      group: "Modular Architecture",
      items: [
        { label: "Patchbay", value: "Matrix 2.0 Hub" },
        { label: "Engine", value: "Stateless Aseptic" },
        { label: "Routing", value: "Zero-Latency Virtual" }
      ]
    },
    {
      group: "DSP Foundation",
      items: [
        { label: "Precision", value: "64-bit Double" },
        { label: "Sample Rate", value: "Up to 192kHz" },
        { label: "Platform", value: "Era 6 Standard" }
      ]
    }
  ],
  signalPath: {
    type: "modular",
    nodes: [
      { id: "m1", label: "Matrix In 1", type: "matrix", description: "Input stage alpha." },
      { id: "m2", label: "Matrix In 2", type: "matrix", description: "Input stage beta." },
      { id: "hub", label: "Patchbay Hub", type: "matrix", description: "Dynamic routing matrix." },
      { id: "proc1", label: "Engine A", type: "oscillator", description: "Primary synthesis engine." },
      { id: "proc2", label: "Engine B", type: "oscillator", description: "Secondary synthesis engine." },
      { id: "out", label: "Unified Out", type: "output", description: "Consolidated signal output." }
    ]
  },
  features: [
    "Universal Command Dispatcher",
    "Dynamic AceCatalog Packs",
    "Real-time Telemetry Visualization"
  ]
};
