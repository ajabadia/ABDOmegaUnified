/**
 * PHASE 20.8 - DELTA BATCHING TEST (Jest)
 *
 * Verifies that multiple updates to the same ID are coalesced
 * and that multiple IDs are sent in a single batch.
 *
 * NOTE: Do NOT call wasmRuntime.enableMockMode() in these tests.
 * Mock mode causes setParameter to bypass the deltaBuffer entirely
 * (stores values in mockValues instead). The buffer tests must run
 * against the real deltaBuffer path.
 *
 * The WasmRuntime constructor starts a setInterval timer (16ms).
 * We clear it in beforeEach to prevent background flushes from
 * interfering with test assertions or causing RPC errors.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { wasmRuntime } from './wasmRuntime';

describe('WasmRuntime - Delta Batching', () => {
  beforeEach(() => {
    // Clear buffer before each test
    // @ts-expect-error - access private for testing
    wasmRuntime.deltaBuffer.clear();
    // Stop the batch timer to prevent background flushes during tests
    // @ts-expect-error - access private for testing
    if (wasmRuntime.batchTimer != null) {
      // @ts-expect-error - access private for testing
      clearInterval(wasmRuntime.batchTimer);
      // @ts-expect-error - access private for testing
      wasmRuntime.batchTimer = null;
    }
  });

  afterEach(() => {
    // @ts-expect-error - access private for testing
    wasmRuntime.deltaBuffer.clear();
  });

  it('should buffer a single parameter update', () => {
    wasmRuntime.setParameter('osc1/frequency', 440);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.size).toBe(1);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.get('osc1/frequency')).toBe(440);
  });

  it('should coalesce multiple updates to the same ID (keep latest value)', () => {
    wasmRuntime.setParameter('osc1/frequency', 440);
    wasmRuntime.setParameter('osc1/frequency', 880);
    wasmRuntime.setParameter('osc1/frequency', 220);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.size).toBe(1);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.get('osc1/frequency')).toBe(220);
  });

  it('should aggregate multiple distinct IDs in the buffer', () => {
    wasmRuntime.setParameter('osc1/frequency', 440);
    wasmRuntime.setParameter('osc1/gain', 0.5);
    wasmRuntime.setParameter('osc1/resonance', 0.3);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.size).toBe(3);
  });

  it('should handle mixed coalescing and aggregation', () => {
    wasmRuntime.setParameter('osc1/frequency', 440);
    wasmRuntime.setParameter('osc1/frequency', 880);
    wasmRuntime.setParameter('osc1/gain', 0.5);
    wasmRuntime.setParameter('osc2/level', 0.7);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.size).toBe(3);
    // @ts-expect-error - access private for testing
    expect(wasmRuntime.deltaBuffer.get('osc1/frequency')).toBe(880);
  });
});
