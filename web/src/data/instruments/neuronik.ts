/**
 * @purpose Gestiona un objeto que representa el instrumento NEURONiK con sus propiedades y especificaciones para su uso en el editor de manifesto OMEGA.
 * @purpose_en Defines an object representing the NEURONiK instrument with its properties and specifications for use in the OMEGA manifest editor.
 * @refactorable true (contains detailed instrument data and could be split into smaller components for better maintainability)
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:3qp8pj
 * @lastUpdated 2026-06-15T10:52:47.848Z
 */

import type { Instrument } from "./types";

export const neuronik: Instrument = {
  id: "abd-neuronik",
  name: "NEURONiK",
  tagline: "64-Partial Additive Hybrid Engine",
  description: "Sonic matter sculpting through neural-inspired synthesis. NEURONiK uses a 64-partial additive resonator to blend harmonic models and manipulate timbre through inharmonicity and entropy.",
  version: "V1.0.4 (Experimental)",
  image: "/images/instruments/hero_neuronik_render.png",
  gallery: [
    { url: "/images/instruments/neuro001.png", caption: "Additive Engine", description: "64-Partial harmonic resonator control panel." },
    { url: "/images/instruments/neuro002.png", caption: "Spectral Morphing", description: "Real-time blending between Model A and Model B." },
    { url: "/images/instruments/neuro003.png", caption: "Matter Sculpting", description: "Advanced controls for Inharmonicity and Entropy." },
    { url: "/images/instruments/neuro004.png", caption: "Modulation Matrix", description: "Neural-inspired routing for complex movement." },
    { url: "/images/instruments/neuro005.png", caption: "Filter Section", description: "Surgical precision filtering and tone shaping." },
    { url: "/images/instruments/neuro006.png", caption: "Master Output", description: "Final stage processing and level management." }
  ],
  category: "Neural",
  price: "Free / Alpha-Beta",
  colors: {
    primary: "#ca00ff",
    accent: "#39ff14"
  },
  specs: [
    {
      group: "Neural Synthesis",
      items: [
        { label: "Additive Engine", value: "64-Partial" },
        { label: "Morphing", value: "Model A/B Spectral" },
        { label: "Resonator", value: "Physical Matter Mode" }
      ]
    },
    {
      group: "Control System",
      items: [
        { label: "MPE", value: "Full Support" },
        { label: "DSP", value: "Zero-Alloc C++20" },
        { label: "Mapping", value: "Neural MIDI CC Hub" }
      ]
    }
  ],
  signalPath: {
    type: "static",
    nodes: [
      { id: "midi", label: "Neural Input", type: "input", description: "MPE and CC mapping hub." },
      { id: "res", label: "Resonator", type: "oscillator", description: "64-Partial additive engine." },
      { id: "morph", label: "Morpher", type: "fx", description: "Spectral model blending." },
      { id: "matter", label: "Matter Sculpt", type: "filter", description: "Inharmonicity sculpting." },
      { id: "filter", label: "Precision Filter", type: "filter", description: "Dynamic spectral filtering." },
      { id: "out", label: "Neural Out", type: "output", description: "Master signal distribution." }
    ]
  },
  features: [
    "Inharmonicity Matter Sculpting",
    "Entropy & Roughness Controls",
    "Flexible MIDI CC Mapping Hub"
  ]
};
