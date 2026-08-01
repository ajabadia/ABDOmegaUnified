/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona estados visuales para activos según sus comportamientos y valores actuales.
 * @purpose_en Manages visual states for assets based on their behaviors and current values.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:dzbz84
 * @lastUpdated 2026-06-15T16:10:46.698Z
 */

import type { AssetBehavior, BehaviorMapping } from '../types/assetBehavior';

/**
 * OMEGA Behavior Resolver - Phase 12
 * Industrial logic for mapping input values to visual frames/states.
 */

export interface ResolvedBehavior {
  frame: number;
  rotation?: number;
  offset?: { x: number; y: number };
  opacity?: number;
}

export const BehaviorResolver = {
  /**
   * Resolves the visual state of an asset based on its behavior preset and current value.
   */
  resolve: (value: number, behavior?: AssetBehavior): ResolvedBehavior => {
    // Default fallback
    const fallback: ResolvedBehavior = { frame: 0 };
    if (!behavior) return fallback;

    const { preset, mapping, frameCount = 1 } = behavior;

    switch (preset) {
      case 'rotary':
        return resolveRotary(value, frameCount, mapping);
      case 'slider':
        return resolveSlider(value, frameCount, mapping);
      case 'switch':
        return resolveSwitch(value, frameCount, mapping);
      case 'button':
        return resolveButton(value, frameCount);
      case 'meter':
        return resolveMeter(value, frameCount, mapping);
      case 'led':
        return resolveLED(value, frameCount, mapping);
      case 'static':
      case 'plate':
      default:
        return fallback;
    }
  }
};

/**
 * Normalizes a 0-1 value based on polarity and zero anchor.
 *
 * For bipolar mappings with a zeroAnchor, the output is remapped so that
 * the anchor point maps to 0.5 (center of the frame range), allowing
 * symmetrical fill/rotation in both directions from the midpoint.
 *
 * Example: zeroAnchor=0.5, value=0.75 → output 0.75 (0.25 above center)
 *          zeroAnchor=0.5, value=0.25 → output 0.25 (0.25 below center)
 */
function normalizeValue(value: number, mapping?: BehaviorMapping): number {
  let v = value;
  if (mapping?.polarity === 'inverted') {
    v = 1 - v;
  }
  if (mapping?.zeroAnchor !== undefined && mapping?.mode === 'bipolar') {
    const anchor = Math.max(0, Math.min(1, mapping.zeroAnchor));
    if (v < anchor) {
      v = 0.5 * (v / anchor);
    } else if (v > anchor) {
      v = 0.5 + 0.5 * ((v - anchor) / (1 - anchor));
    } else {
      v = 0.5;
    }
  }
  return v;
}

function resolveRotary(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  
  // If no filmstrip but rotationMode is CSS
  // Rotation typically maps 0-1 to -150 to 150 degrees or similar
  return { frame };
}

function resolveSlider(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveSwitch(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  // Switches are typically binary (0 or 1) or stepped
  if (mapping?.mode === 'stepped' && mapping.frameRange) {
    const steps = mapping.frameRange.end - mapping.frameRange.start + 1;
    const v = normalizeValue(value, mapping);
    const frame = mapping.frameRange.start + Math.floor(v * (steps - 1));
    return { frame };
  }
  
  const frame = value > 0.5 ? (frameCount - 1) : 0;
  return { frame };
}

function resolveButton(value: number, frameCount: number): ResolvedBehavior {
  // 0 = up, 1 = down
  const frame = value > 0.5 ? (frameCount - 1) : 0;
  return { frame };
}

function resolveMeter(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveLED(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  // LEDs can be multi-state or binary brightness
  if (frameCount > 2) {
    const v = normalizeValue(value, mapping);
    const frame = Math.floor(v * (frameCount - 1));
    return { frame };
  }
  const frame = value > 0.1 ? 1 : 0;
  return { frame };
}
