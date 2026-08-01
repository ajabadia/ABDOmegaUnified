/**
 * PHASE 20.5 - OBSERVABILITY TEST
 * Verifies that structured logs and correlation IDs work as expected.
 */
import { observabilityService } from './observabilityService';

describe('ObservabilityService', () => {
  it('should generate a correlation ID', () => {
    const correlationId = observabilityService.generateCorrelationId();
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe('string');
    expect(correlationId.length).toBeGreaterThan(0);
  });

  it('should track events and report accurate health metrics', () => {
    const correlationId = observabilityService.generateCorrelationId();

    observabilityService.trackEvent({
      correlationId,
      phase: 'TEST_PHASE',
      component: 'TEST_COMPONENT',
      state: 'START',
      message: 'Test start',
    });

    observabilityService.trackEvent({
      correlationId,
      phase: 'TEST_PHASE',
      component: 'TEST_COMPONENT',
      state: 'SUCCESS',
      durationMs: 42,
      message: 'Test success',
    });

    const failId = observabilityService.generateCorrelationId();
    observabilityService.trackEvent({
      correlationId: failId,
      phase: 'TEST_PHASE',
      component: 'TEST_COMPONENT',
      state: 'FAILURE',
      code: 'ERR_TIMEOUT',
      message: 'Simulated timeout failure',
    });

    observabilityService.trackEvent({
      correlationId: failId,
      phase: 'TEST_PHASE',
      component: 'TEST_COMPONENT',
      state: 'ROLLBACK',
      message: 'Cleanup performed',
    });

    const health = observabilityService.getHealthReport();

    expect(health.failureCount).toBe(1);
    expect(health.rollbackCount).toBe(1);
  });
});
