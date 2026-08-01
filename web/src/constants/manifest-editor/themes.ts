/**
 * @purpose Gestiona y exporta una lista de definiciones de temas para el editor de manifesto OMEGA, incluyendo propiedades como piel, colores, iluminación y tipografía.
 * @purpose_en Manages and exports a list of theme definitions for the OMEGA manifest editor, including properties like skin, colors, lighting, and typography.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1qdubbv
 * @lastUpdated 2026-06-15T10:52:28.986Z
 */

/**
 * OMEGA ERA 7.2.3 — THEME REGISTRY
 * Centralized aesthetic definitions for the Manifest Editor.
 * These are "Starters" that get baked into the manifest on save.
 */

export interface ThemeDefinition {
  id: string;
  label: string;
  description: string;
  ui: {
    skin: string;
    colors: {
      accent: string;
      weak: string;
      surface: string;
      text: string;
    };
    lighting: {
      shadowAngle: number;
      shadowColor: string;
      distance: number;
      blur: number;
    };
    typography: {
      defaultFont: string;
      headings: { font: string; size: number; color: string };
      labels: { font: string; size: number; color: string };
    };
  };
}

export const OMEGA_THEMES: ThemeDefinition[] = [
  {
    id: 'industrial',
    label: 'Industrial Standard',
    description: 'The classic OMEGA Era 7 look. Gray metals and high-contrast labels.',
    ui: {
      skin: 'industrial',
      colors: {
        accent: '#00f2ff',
        weak: '#333333',
        surface: '#1a1c1e',
        text: '#ffffff'
      },
      lighting: {
        shadowAngle: 135,
        shadowColor: 'rgba(0,0,0,0.5)',
        distance: 4,
        blur: 4
      },
      typography: {
        defaultFont: 'Inter',
        headings: { font: 'Inter', size: 14, color: '#ffffff' },
        labels: { font: 'Inter', size: 9, color: '#aaaaaa' }
      }
    }
  },
  {
    id: 'carbon',
    label: 'Deep Carbon',
    description: 'Tactical dark aesthetics with reinforced borders and extreme depth.',
    ui: {
      skin: 'carbon',
      colors: {
        accent: '#00ff88',
        weak: '#111111',
        surface: '#050505',
        text: '#ffffff'
      },
      lighting: {
        shadowAngle: 145,
        shadowColor: 'rgba(0,0,0,0.8)',
        distance: 6,
        blur: 8
      },
      typography: {
        defaultFont: 'Inter',
        headings: { font: 'Inter', size: 14, color: '#ffffff' },
        labels: { font: 'Inter', size: 9, color: '#888888' }
      }
    }
  },
  {
    id: 'glass',
    label: 'Frosted Glass',
    description: 'Modern translucent material with heavy blur and high saturation.',
    ui: {
      skin: 'glass',
      colors: {
        accent: '#ffffff',
        weak: 'rgba(255,255,255,0.1)',
        surface: 'rgba(15,20,25,0.4)',
        text: '#ffffff'
      },
      lighting: {
        shadowAngle: 90,
        shadowColor: 'rgba(0,0,0,0.3)',
        distance: 2,
        blur: 15
      },
      typography: {
        defaultFont: 'Inter',
        headings: { font: 'Inter', size: 14, color: '#ffffff' },
        labels: { font: 'Inter', size: 9, color: 'rgba(255,255,255,0.6)' }
      }
    }
  },
  {
    id: 'minimal',
    label: 'Lab Minimal',
    description: 'Light gray laboratory style. Clean, precise, and utilitarian.',
    ui: {
      skin: 'minimal',
      colors: {
        accent: '#000000',
        weak: '#cccccc',
        surface: '#e0e0e0',
        text: '#111111'
      },
      lighting: {
        shadowAngle: 135,
        shadowColor: 'rgba(0,0,0,0.1)',
        distance: 2,
        blur: 4
      },
      typography: {
        defaultFont: 'Inter',
        headings: { font: 'Inter', size: 14, color: '#000000' },
        labels: { font: 'Inter', size: 9, color: '#333333' }
      }
    }
  }
];
