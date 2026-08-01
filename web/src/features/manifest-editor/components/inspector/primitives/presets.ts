/**
 * @purpose Gestiona presets para canales MIDI, tasas de muestreo, formas de onda y estados booleanos en el editor de manifesto OMEGA.
 * @purpose_en Manages presets for MIDI channels, sample rates, waveforms, and boolean states in the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:ldesk4
 * @lastUpdated 2026-06-15T11:31:55.567Z
 */

import { Globe, Activity, Zap, List } from 'lucide-react';

export interface OptionPreset {
  label: string;
  icon: React.ElementType;
  options: { label: string; value: number }[];
}

export const INDUSTRIAL_PRESETS: Record<string, OptionPreset> = {
  midi_ch: {
    label: 'MIDI Channels',
    icon: Globe,
    options: [
      { label: 'OMNI (ALL)', value: 0 },
      ...Array.from({ length: 16 }, (_, i) => ({ label: `CHANNEL ${i + 1}`, value: i + 1 }))
    ]
  },
  sample_rate: {
    label: 'Sample Rates',
    icon: Activity,
    options: [
      { label: '44.1 kHz', value: 44100 },
      { label: '48.0 kHz', value: 48000 },
      { label: '88.2 kHz', value: 88200 },
      { label: '96.0 kHz', value: 96000 },
      { label: '192 kHz', value: 192000 },
    ]
  },
  waveforms: {
    label: 'Standard Waves',
    icon: Zap,
    options: [
      { label: 'SINE', value: 0 },
      { label: 'SAW', value: 1 },
      { label: 'SQUARE', value: 2 },
      { label: 'TRIANGLE', value: 3 },
      { label: 'NOISE', value: 4 },
    ]
  },
  boolean: {
    label: 'Binary State',
    icon: List,
    options: [
      { label: 'OFF / BYPASS', value: 0 },
      { label: 'ON / ACTIVE', value: 1 },
    ]
  }
};
