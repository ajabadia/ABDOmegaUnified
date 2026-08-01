/**
 * PHASE 20.9 - RUNTIME STATE RECONCILIATION TEST
 * Verifies that divergence is detected and resolved deterministically.
 */
import { reconciliationService } from './reconciliationService';

describe('ReconciliationService', () => {
  const uiState = {
    'osc1/frequency': 440,
    'osc1/gain': 0.8,
    'filter1/cutoff': 1000,
  };

  const engineState = {
    'osc1/frequency': 440, // Match
    'osc1/gain': 0.5,       // Divergence
    'filter1/cutoff': 1200, // Divergence
  };

  it('should detect divergence between UI and engine states', () => {
    const divergences = reconciliationService.detectDivergence(uiState, engineState);

    expect(divergences.length).toBe(2);
    expect(divergences).toContain('osc1/gain');
    expect(divergences).toContain('filter1/cutoff');
  });

  it('should resolve conflict via Engine Authority (LAST_WRITE_WINS)', () => {
    const resolution = reconciliationService.resolveConflict(
      'osc1/gain',
      uiState['osc1/gain'],
      engineState['osc1/gain'],
      'LAST_WRITE_WINS'
    );

    expect(resolution.resolvedValue).toBe(engineState['osc1/gain']);
  });

  it('should resolve conflict via UI Authority (STRICT_BLOCKING)', () => {
    const resolution = reconciliationService.resolveConflict(
      'filter1/cutoff',
      uiState['filter1/cutoff'],
      engineState['filter1/cutoff'],
      'STRICT_BLOCKING'
    );

    expect(resolution.resolvedValue).toBe(uiState['filter1/cutoff']);
  });
});
