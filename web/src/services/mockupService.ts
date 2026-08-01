/**
 * @purpose Gestiona descripciones visuales de alta fidelidad para renderizaciones fotorealistas basadas en datos manifestados de OMEGA.
 * @purpose_en Generates high-fidelity visual descriptions for photorealistic renders based on OMEGA manifest data.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1gkivbc
 * @lastUpdated 2026-06-15T17:00:29.975Z
 */

/**
 * OMEGA Studio Mockup Service (v7.2.3)
 * Prepares high-fidelity visual descriptions for photorealistic renders.
 */
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

export class MockupService {
  static generateRenderPrompt(manifest: OMEGA_Manifest): string {
    const skin = manifest.ui?.skin || 'industrial';
    const hp = manifest.metadata?.rack?.hp || 12;
    const name = manifest.metadata?.name || 'Unnamed Module';

    const controls = manifest.ui?.controls || [];
    const jacks = manifest.ui?.jacks || [];

    let skinDesc = "";
    switch(skin) {
      case 'carbon': skinDesc = "a sleek carbon fiber textured front panel with orange and white technical markings"; break;
      case 'glass': skinDesc = "a futuristic translucent frosted glass panel with glowing internal circuits and neon cyan highlights"; break;
      case 'minimal': skinDesc = "a clean clinical white metal panel with subtle grey hairline typography and black controls"; break;
      default: skinDesc = "a brushed dark industrial metal panel with cyan indicators and rugged aluminum screws"; break;
    }

    return `Professional studio product photograph of a Eurorack synthesizer module named "${name}". 
    The module is ${hp} HP wide. 
    It features ${skinDesc}. 
    The layout includes ${controls.length} high-quality industrial knobs and ${jacks.length} silver 3.5mm audio jacks. 
    Cinematic studio lighting, shallow depth of field, 8k resolution, photorealistic, mounted in a dark wooden studio rack, metallic textures, professional audio engineering equipment aesthetic.`;
  }
}
