/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * PathResolver Hardenings Tests (Phase 18 - Canonical Contract)
 */
import { resolvePath, parsePath, normalizeModulationTarget } from './pathResolver';

describe('PathResolver', () => {
  describe('resolvePath', () => {
    it('should resolve 3-level hierarchical paths', () => {
      const r = resolvePath('freq', 'voice_1/osc_1');
      expect(r).toBe('voice_1/osc_1/freq');
    });

    it('should resolve 4-level hierarchical paths', () => {
      const r = resolvePath('depth', 'mod/lfo_1/target');
      expect(r).toBe('mod/lfo_1/target/depth');
    });

    it('should preserve absolute paths (genetic authority)', () => {
      const r = resolvePath('global/master_vol', 'voice_1/osc_1');
      expect(r).toBe('global/master_vol');
    });
  });

  describe('parsePath', () => {
    it('should parse deep paths into nodePath and target', () => {
      const p = parsePath('synth/v1/osc1/freq');
      expect(p.nodePath).toBe('synth/v1/osc1');
      expect(p.target).toBe('freq');
    });

    it('should parse root paths without target', () => {
      const p = parsePath('root_node');
      expect(p.nodePath).toBe('root_node');
      expect(p.target).toBeUndefined();
    });
  });

  describe('normalizeModulationTarget', () => {
    it('should normalize relative targets', () => {
      const n = normalizeModulationTarget('cutoff', 'synth/v1/filter');
      expect(n).toBe('synth/v1/filter/cutoff');
    });

    it('should keep absolute targets idempotent', () => {
      const n = normalizeModulationTarget('synth/v1/filter/resonance', 'synth/v1/filter');
      expect(n).toBe('synth/v1/filter/resonance');
    });
  });
});
