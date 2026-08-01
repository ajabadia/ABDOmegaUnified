/**
 * @purpose Gestiona y exporta una serie de plantillas de módulo industrial para su uso en el editor de manifesto OMEGA.
 * @purpose_en Manages and exports a set of industrial module templates for use in the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:15c5j5w
 * @lastUpdated 2026-06-15T13:10:04.000Z
 */

/**
 * OMEGA ERA 7.2.3 - Industrial Template Registry
 * Canonical blueprints for modular synthesis architecture.
 */

import type { ModuleTemplate } from '@/omega-ui-core/types/manifest';

export const INDUSTRIAL_TEMPLATES: ModuleTemplate[] = [
  {
    id: 'standard_vcf',
    version: '1.0.0',
    label: 'Industrial VCF',
    family: 'Filter',
    category: 'composite',
    description: 'Classic 24dB/oct low-pass filter with resonance control.',
    policy: [
      { path: 'layout.mode', mode: 'locked' },
      { path: 'style.color', mode: 'editable' }
    ],
    slots: [
      { id: 'cutoff_binding', label: 'Cutoff', kind: 'parameter', required: true, path: 'cutoff_cell' }
    ],
    baseNode: {
      id: 'vcf_root',
      kind: 'container',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'stack-v', padding: 10, gap: 10 },
      children: [
        {
          id: 'cutoff_cell',
          kind: 'cell',
          role: 'control',
          bind: 'cutoff_binding',
          cellRef: 'knob',
          layout: { pos: { x: 0, y: 0 }, size: { width: 60, height: 60 } },
          style: { color: '#00f2ff' }
        }
      ]
    }
  },
  {
    id: 'stereo_io',
    version: '1.0.0',
    label: 'Stereo I/O Block',
    family: 'I/O',
    category: 'io',
    description: 'Standard stereo input/output Jack configuration.',
    policy: [],
    slots: [
      { id: 'in_l', label: 'Input L', kind: 'port', required: true, path: 'in_l_cell' },
      { id: 'in_r', label: 'Input R', kind: 'port', required: true, path: 'in_r_cell' }
    ],
    baseNode: {
      id: 'io_root',
      kind: 'container',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'stack-h', gap: 20 },
      children: [
        { id: 'in_l_cell', kind: 'cell', role: 'io', cellRef: 'port', bind: 'in_l', layout: { pos: { x: 0, y: 0 }, size: { width: 30, height: 30 } } },
        { id: 'in_r_cell', kind: 'cell', role: 'io', cellRef: 'port', bind: 'in_r', layout: { pos: { x: 0, y: 0 }, size: { width: 30, height: 30 } } }
      ]
    }
  },
  {
    id: 'osc_macro_block',
    version: '1.1.0',
    label: 'VCO Macro Block',
    family: 'Oscillator',
    category: 'composite',
    description: 'High-precision oscillator with waveform selector and FM input.',
    policy: [],
    slots: [
      { id: 'pitch_bind', label: 'Pitch', kind: 'parameter', required: true, path: 'pitch_knob' },
      { id: 'fm_port', label: 'FM Input', kind: 'port', required: false, path: 'fm_jack' }
    ],
    baseNode: {
      id: 'vco_block',
      kind: 'container',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'stack-v', padding: 15, gap: 15 },
      style: { rounding: 12, borderWidth: 1, color: 'rgba(255,255,255,0.05)' },
      children: [
        {
          id: 'vco_label',
          kind: 'asset-layer',
          role: 'decor',
          layout: { pos: { x: 0, y: 0 } },
          style: { font: 'Inter', fontSize: 10, color: '#aaa', alignment: 'center' },
          overrides: { text: 'VCO-X1' }
        },
        {
          id: 'pitch_knob',
          kind: 'cell',
          role: 'control',
          cellRef: 'knob',
          bind: 'pitch_bind',
          layout: { pos: { x: 0, y: 0 }, size: { width: 80, height: 80 } },
          style: { variant: 'industrial' }
        },
        {
          id: 'fm_jack',
          kind: 'cell',
          role: 'io',
          cellRef: 'port',
          bind: 'fm_port',
          layout: { pos: { x: 0, y: 0 }, size: { width: 32, height: 32 } },
          style: { variant: 'input' }
        }
      ]
    }
  }
];
