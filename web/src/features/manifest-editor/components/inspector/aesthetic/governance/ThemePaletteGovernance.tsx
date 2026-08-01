'use client';

/**
 * @purpose Gestiona una sección colapsable para editar el paleta de temas y configuraciones de color en el editor de manifesto OMEGA.
 * @purpose_en Manages a collapsible section for editing theme palette and color settings in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:19s1yrz
 * @lastUpdated 2026-06-15T11:04:13.672Z
 */

import { Palette } from 'lucide-react';
import type { OMEGA_Manifest } from '@/types/manifest';
import InspectorCollapsible from '../../shared/InspectorCollapsible';
import SmartColorPicker from '../../shared/SmartColorPicker';

interface ThemePaletteGovernanceProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
}

export default function ThemePaletteGovernance({ manifest, onUpdate }: ThemePaletteGovernanceProps) {
  const palette = manifest.ui?.palette || { 
    primary: '#00f2ff', 
    secondary: '#ff8c00', 
    utility: '#a0a0a0', 
    feedback: '#32cd32',
    hardware: '#777777',
    chassis: '#1a1a1a',
    glow: '#00f2ff',
    glass: 'rgba(255,255,255,0.05)',
    warning: '#ff3300',
    highlight: '#ffffff'
  };
  const colors = manifest.ui?.colors || { accent: '#00f2ff', weak: '#555555', surface: '#1a1c1e', text: '#ffffff' };

  const updatePalette = (key: string, value: string) => {
    onUpdate({ 
      ui: { 
        ...manifest.ui, 
        palette: { ...palette, [key]: value } as OMEGA_Manifest['ui']['palette']
      } 
    });
  };

  const updateColor = (key: string, value: string) => {
    onUpdate({ 
      ui: { 
        ...manifest.ui, 
        colors: { ...colors, [key]: value } as OMEGA_Manifest['ui']['colors']
      } 
    });
  };

  return (
    <>
      {/* GLOBAL FUNCTIONAL PALETTE */}
      <InspectorCollapsible title="Functional Design Tokens" icon={Palette}>
        <div className="space-y-3 pt-2">
          <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter italic">
            Define the 4 master colors for your controls and indicators. 
          </p>
          <div className="grid grid-cols-1 gap-3">
            <SmartColorPicker label="Primary Accent" value={palette.primary} onChange={(v) => updatePalette('primary', v)} manifest={manifest} />
            <SmartColorPicker label="Secondary Accent" value={palette.secondary} onChange={(v) => updatePalette('secondary', v)} manifest={manifest} />
            <SmartColorPicker label="Utility / Support" value={palette.utility} onChange={(v) => updatePalette('utility', v)} manifest={manifest} />
            <SmartColorPicker label="Signal / Feedback" value={palette.feedback} onChange={(v) => updatePalette('feedback', v)} manifest={manifest} />
          </div>
        </div>
      </InspectorCollapsible>

      {/* INFRASTRUCTURE COLORS */}
      <InspectorCollapsible title="Module Infrastructure" icon={Palette}>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 gap-3">
            <SmartColorPicker label="Surface / Background" value={colors.surface || '#1a1c1e'} onChange={(v) => updateColor('surface', v)} manifest={manifest} />
            <SmartColorPicker label="Hardware / Rails" value={palette.hardware || '#777777'} onChange={(v) => updatePalette('hardware', v)} manifest={manifest} />
            <SmartColorPicker label="Master Chassis" value={palette.chassis || '#1a1a1a'} onChange={(v) => updatePalette('chassis', v)} manifest={manifest} />
            <SmartColorPicker label="Text / Labeling" value={colors.text || '#ffffff'} onChange={(v) => updateColor('text', v)} manifest={manifest} />
            <SmartColorPicker label="Atmospheric Glow" value={palette.glow || '#00f2ff'} onChange={(v) => updatePalette('glow', v)} manifest={manifest} />
            <SmartColorPicker label="Glass / Display" value={palette.glass || 'rgba(255,255,255,0.05)'} onChange={(v) => updatePalette('glass', v)} manifest={manifest} />
            <SmartColorPicker label="Warning / Peak" value={palette.warning || '#ff3300'} onChange={(v) => updatePalette('warning', v)} manifest={manifest} />
            <SmartColorPicker label="Selection Highlight" value={palette.highlight || '#ffffff'} onChange={(v) => updatePalette('highlight', v)} manifest={manifest} />
            <SmartColorPicker label="Weak Tone / Detail" value={colors.weak || '#555555'} onChange={(v) => updateColor('weak', v)} manifest={manifest} />
          </div>
        </div>
      </InspectorCollapsible>
    </>
  );
}
