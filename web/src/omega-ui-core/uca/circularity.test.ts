/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * OMEGA Circularity Audit Tests (Phase 17.2/3)
 */
import { CircularityAuditor } from './utils/circularityAuditor';
import type { OMEGA_Manifest } from '../types/manifest';

describe('CircularityAuditor', () => {
  it('should pass DAG (no cycles)', () => {
    const dagManifest = {
      modulations: [
        { id: 'mod1', source: 'lfo_1', target: 'osc_1/pitch', amount: 0.5 },
        { id: 'mod2', source: 'osc_1', target: 'vcf_1/cutoff', amount: 0.8 },
      ],
    } as Partial<OMEGA_Manifest>;
    const issues = CircularityAuditor.validate(dagManifest as OMEGA_Manifest);
    expect(issues.length).toBe(0);
  });

  it('should detect simple cycle (A → B → A)', () => {
    const simpleCycleManifest = {
      modulations: [
        { id: 'mod1', source: 'osc_1', target: 'osc_2/fm', amount: 0.5 },
        { id: 'mod2', source: 'osc_2', target: 'osc_1/sync', amount: 0.5 },
      ],
    } as Partial<OMEGA_Manifest>;
    const issues = CircularityAuditor.validate(simpleCycleManifest as OMEGA_Manifest);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should detect complex cycle (A → B → C → A)', () => {
    const complexCycleManifest = {
      modulations: [
        { id: 'mod1', source: 'node_a', target: 'node_b/in', amount: 0.1 },
        { id: 'mod2', source: 'node_b', target: 'node_c/in', amount: 0.1 },
        { id: 'mod3', source: 'node_c', target: 'node_a/in', amount: 0.1 },
      ],
    } as Partial<OMEGA_Manifest>;
    const issues = CircularityAuditor.validate(complexCycleManifest as OMEGA_Manifest);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should detect path-based cycle', () => {
    const pathCycleManifest = {
      modulations: [
        { id: 'mod1', source: 'lfo_1/cv_out', target: 'osc_1/fm_in', amount: 0.5 },
        { id: 'mod2', source: 'osc_1/main_out', target: 'lfo_1/sync_in', amount: 0.5 },
      ],
    } as Partial<OMEGA_Manifest>;
    const issues = CircularityAuditor.validate(pathCycleManifest as OMEGA_Manifest);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should detect multi-level hierarchical cycle', () => {
    const multiLevelCycleManifest = {
      modulations: [
        { id: 'mod1', source: 'engine/voice_1/osc_1/out', target: 'engine/fx_1/delay/time', amount: 0.5 },
        { id: 'mod2', source: 'engine/fx_1/delay/feedback', target: 'engine/voice_1/osc_1/fm', amount: 0.5 },
      ],
    } as Partial<OMEGA_Manifest>;
    const issues = CircularityAuditor.validate(multiLevelCycleManifest as OMEGA_Manifest);
    expect(issues.length).toBeGreaterThan(0);
  });
});
