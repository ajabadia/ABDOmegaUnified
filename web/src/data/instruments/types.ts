/**
 * @purpose Gestiona interfaces para instrumentos en el OMEGA ABDOmegaEditor.
 * @purpose_en Defines interfaces for instruments in the OMEGA ABDOmegaEditor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1494ddo
 * @lastUpdated 2026-06-15T10:52:55.703Z
 */

export interface Instrument {
  id: string;
  name: string;
  tagline: string;
  description: string;
  version: string;
  image: string;
  gallery?: {
    url: string;
    caption?: string;
    description?: string;
  }[];
  category: "Analog" | "Digital" | "Modular" | "Neural";
  price: string;
  colors: {
    primary: string;
    accent: string;
  };
  specs: {
    group: string;
    items: {
      label: string;
      value: string;
    }[];
  }[];
  signalPath: {
    type: "static" | "modular";
    nodes: {
      id: string;
      label: string;
      type: "input" | "oscillator" | "filter" | "vca" | "fx" | "output" | "matrix";
      description?: string;
    }[];
  };
  features: string[];
}
