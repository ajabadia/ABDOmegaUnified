'use client';

import {
  Disc, Sliders, CircleDot, ToggleLeft, Lightbulb, Tv, Type,
  Volume2, Zap, Activity, Radio,
} from 'lucide-react';
import type { ManifestEntity } from '@/omega-ui-core/types/manifest';

export interface ControlDefinition {
  type: string;
  label: string;
  size: { width: number; height: number };
  icon: React.ComponentType<{ className?: string }>;
  template?: Partial<ManifestEntity>;
}

export const CONTROL_DEFINITIONS: ControlDefinition[] = [
  { type: 'knob',       label: 'Knob',            size: { width: 36, height: 36 }, icon: Disc },
  { type: 'slider-v',   label: 'Slider (V)',      size: { width: 20, height: 64 }, icon: Sliders },
  { type: 'slider-h',   label: 'Slider (H)',      size: { width: 64, height: 20 }, icon: Sliders },
  { type: 'button',     label: 'Button',           size: { width: 24, height: 24 }, icon: CircleDot },
  { type: 'switch',     label: 'Switch',           size: { width: 24, height: 40 }, icon: ToggleLeft },
  { type: 'led',        label: 'LED Light',        size: { width: 14, height: 14 }, icon: Lightbulb },
  { type: 'display',    label: 'Display',          size: { width: 80, height: 40 }, icon: Tv },
  { type: 'label',      label: 'Label',            size: { width: 60, height: 16 }, icon: Type, template: { label: 'Label' } },
] as const;

export interface PortDefinition {
  family: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hoverColor: string;
  inLabel: string;
  outLabel: string;
}

export const PORT_DEFINITIONS: PortDefinition[] = [
  { family: 'Audio',     icon: Volume2, color: 'text-red-400',    hoverColor: 'hover:bg-red-500/20 hover:text-red-400',    inLabel: 'Audio In',  outLabel: 'Audio Out' },
  { family: 'CV',        icon: Zap,     color: 'text-amber-400',  hoverColor: 'hover:bg-amber-500/20 hover:text-amber-400',  inLabel: 'CV In',     outLabel: 'CV Out' },
  { family: 'Gate/Trig', icon: Activity, color: 'text-emerald-400', hoverColor: 'hover:bg-emerald-500/20 hover:text-emerald-400', inLabel: 'Gate In', outLabel: 'Gate Out' },
  { family: 'MIDI',      icon: Radio,   color: 'text-purple-400', hoverColor: 'hover:bg-purple-500/20 hover:text-purple-400', inLabel: 'MIDI In',  outLabel: 'MIDI Out' },
] as const;
