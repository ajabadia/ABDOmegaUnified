/**
 * @purpose Proporciona acceso a materiales predefinidos y skins para el editor de manifesto OMEGA.
 * @purpose_en Manages and provides access to pre-defined materials and skins for the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:6,imports:1,sig:1j238dp
 * @lastUpdated 2026-06-15T15:16:08.413Z
 */

/**
 * OMEGA ERA 7.2.3 - Industrial Aesthetic Registry
 * Canonical source for materials, textures, and global visual tokens.
 */

import type { OmegaStyleNode } from '@/omega-ui-core/types/manifest';

export interface OMEGA_Material {
  id: string;
  name: string;
  styles: Partial<OmegaStyleNode>;
}

export interface OMEGA_Skin {
  id: string;
  name: string;
  chassis: OMEGA_Material;
  panels: OMEGA_Material;
  lighting: {
    ambient: number;
    specular: number;
    shadowAngle: number;
    shadowColor: string;
    globalBlur: number;
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    text: string;
  };
}

export const MATERIALS: Record<string, OMEGA_Material> = {
  brushed_steel: {
    id: 'brushed_steel',
    name: 'Brushed Steel',
    styles: {
      color: '#2a2d2f',
      texture: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.1) 100%)',
      borderWidth: 1,
      shadowInner: 'inset 0 1px 2px rgba(255,255,255,0.1)'
    }
  },
  matte_carbon: {
    id: 'matte_carbon',
    name: 'Matte Carbon',
    styles: {
      color: '#121212',
      texture: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 100%)',
      rounding: 4,
      borderWidth: 1
    }
  },
  industrial_grey: {
    id: 'industrial_grey',
    name: 'Industrial Grey',
    styles: {
      color: '#1a1d1e',
      borderWidth: 2,
      glassColor: 'rgba(255,255,255,0.02)'
    }
  }
};

export const SKINS: Record<string, OMEGA_Skin> = {
  standard_dark: {
    id: 'standard_dark',
    name: 'Standard Dark',
    chassis: MATERIALS.brushed_steel,
    panels: MATERIALS.matte_carbon,
    lighting: {
      ambient: 0.4,
      specular: 0.6,
      shadowAngle: 45,
      shadowColor: 'rgba(0,0,0,0.5)',
      globalBlur: 10
    },
    palette: {
      primary: '#00f2ff',
      secondary: '#7000ff',
      accent: '#ff0055',
      surface: '#0a0a0a',
      text: '#ffffff'
    }
  },
  monolith_black: {
    id: 'monolith_black',
    name: 'Monolith Black',
    chassis: MATERIALS.matte_carbon,
    panels: MATERIALS.matte_carbon,
    lighting: {
      ambient: 0.2,
      specular: 0.8,
      shadowAngle: 90,
      shadowColor: 'rgba(0,0,0,0.8)',
      globalBlur: 20
    },
    palette: {
      primary: '#ff3c00',
      secondary: '#ff0055',
      accent: '#ffffff',
      surface: '#000000',
      text: '#cccccc'
    }
  }
};

export const DEFAULT_SKIN = SKINS.standard_dark;

export class AestheticRegistry {
  static getSkin(id: string): OMEGA_Skin {
    return SKINS[id] || DEFAULT_SKIN;
  }

  static getMaterial(id: string): OMEGA_Material {
    return MATERIALS[id] || MATERIALS.industrial_grey;
  }

  static getAllSkins(): OMEGA_Skin[] {
    return Object.values(SKINS);
  }
}
