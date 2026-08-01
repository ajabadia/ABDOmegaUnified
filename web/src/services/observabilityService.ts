/**
 * @purpose Gestiona observabilidad y métricas para el monitoreo de runtime industrial, proporcionando registro estructurado, seguimiento de latencia y IDs de correlación.
 * @purpose_en Manages observability and metrics for industrial runtime monitoring, providing structured logging, latency tracking, and correlation IDs.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:1,sig:gzbef1
 * @lastUpdated 2026-06-22
 */

import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import { emitEvent } from './globalEventBus';

/**
 * OMEGA ERA 7.2.3 - OBSERVABILITY SERVICE (Phase 20.5)
 * Centralized telemetry for industrial runtime monitoring.
 * Focus: Structured logging, latency metrics, and correlation IDs.
 */

export interface ObservabilityEvent {
  correlationId: string;
  phase: string;
  component: string;
  state: 'START' | 'SUCCESS' | 'FAILURE' | 'REJECT' | 'ROLLBACK';
  code?: string;
  path?: string;
  message?: string;
  durationMs?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RuntimeHealthStatus {
  bridgeStatus: string;
  lastLatencyMs: number;
  failureCount: number;
  rollbackCount: number;
  heartbeatHealthy: boolean;
}

class ObservabilityService {
  private metrics = {
    latencies: [] as number[],
    failureCount: 0,
    rollbackCount: 0,
    lastHeartbeat: Date.now()
  };

  constructor(private eventBus?: IEventBus) {}

  /**
   * generateCorrelationId
   * Creates a stable identifier to trace a lifecycle across components.
   */
  generateCorrelationId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * trackEvent
   * Emits a structured log with industrial context.
   */
  trackEvent(event: ObservabilityEvent) {
    const { correlationId, phase, component, state, code, durationMs, message } = event;
    
    // Industrial format: [OMEGA OBS] [TIMESTAMP] [CORRELATION] [PHASE] [STATE] Message
    const timestamp = new Date().toISOString();
    const durationStr = durationMs !== undefined ? ` (${durationMs}ms)` : '';
    const codeStr = code ? ` [CODE: ${code}]` : '';
    
    const logMsg = `[OMEGA OBS] [${timestamp}] [${correlationId}] [${phase}] [${component}] [${state}]${codeStr} ${message || ''}${durationStr}`;

    if (state === 'FAILURE' || state === 'REJECT') {
      console.error(logMsg, event.metadata || '');
      this.metrics.failureCount++;
    } else if (state === 'ROLLBACK') {
      console.warn(logMsg);
      this.metrics.rollbackCount++;
    } else {
      console.log(logMsg);
    }

    if (durationMs !== undefined) {
      this.metrics.latencies.push(durationMs);
      if (this.metrics.latencies.length > 100) this.metrics.latencies.shift();
    }

    emitEvent(this.eventBus, 'system:log', { level: state, message: logMsg });
  }

  /**
   * getHealthReport
   * Summarizes current pipeline health for UI badges.
   */
  getHealthReport(): RuntimeHealthStatus {
    const avgLatency = this.metrics.latencies.length > 0 
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length 
      : 0;

    return {
      bridgeStatus: 'OPERATIONAL',
      lastLatencyMs: Math.round(avgLatency),
      failureCount: this.metrics.failureCount,
      rollbackCount: this.metrics.rollbackCount,
      heartbeatHealthy: (Date.now() - this.metrics.lastHeartbeat) < 5000
    };
  }

  /**
   * trackHistoryEvent
   * Specialized helper for Phase 21 History Engine events.
   */
  trackHistoryEvent(
    correlationId: string, 
    code: 'HISTORY_CAPTURED' | 'HISTORY_RESTORE_SUCCESS' | 'HISTORY_RESTORE_FAILED' | 'HISTORY_DIFF_CREATED',
    state: ObservabilityEvent['state'],
    message: string,
    durationMs?: number,
    metadata?: Record<string, unknown>
  ) {
    this.trackEvent({
      correlationId,
      phase: 'PHASE_21_HISTORY',
      component: 'HISTORY_ENGINE',
      state,
      code,
      message,
      durationMs,
      metadata
    });
  }

  updateHeartbeat() {
    this.metrics.lastHeartbeat = Date.now();
  }
}

export const observabilityService = new ObservabilityService();
