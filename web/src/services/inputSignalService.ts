/**
 * @purpose Gestiona generadores de señal virtual para simulación de entrada en el editor manifest OMEGA.
 * @purpose_en Manages virtual signal generators for input port simulation in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:0,sig:5oonld
 * @lastUpdated 2026-06-15T17:00:16.005Z
 */

/**
 * OMEGA INPUT SIGNAL SERVICE - ERA R2
 * Manages virtual signal generators for input port simulation.
 * Extended with 10 wave types, ADSR envelope, sample-and-hold, sequencer.
 */

export type SignalType = 
  | 'sine' | 'square' | 'saw' | 'triangle' | 'noise' 
  | 'lfo_slow' | 'static' 
  | 'pulse' | 'pwm' 
  | 'adsr' 
  | 'sample_hold' 
  | 'sequencer' 
  | 'random_correlated';

export interface VirtualSignal {
  type: SignalType;
  frequency: number; // Hz
  amplitude: number; // 0.0 to 1.0
  offset: number;
  /** Pulse/PWM duty cycle (0.0–1.0, default 0.5) */
  dutyCycle?: number;
  /** ADSR envelope times in seconds */
  attackTime?: number;
  decayTime?: number;
  sustainLevel?: number;
  releaseTime?: number;
  /** Gate state for ADSR */
  gateOn?: boolean;
  /** Sequencer steps */
  steps?: number[];
  /** Random walk correlation (0–1) */
  correlation?: number;
  /** Modulation source port ID for cross-modulation */
  modSourceId?: string;
  /** Modulation amount (-1 to 1) */
  modAmount?: number;
  /** Slew rate / portamento: max value change per second (0 = disabled) */
  slewRate?: number;
  /** Quantization: number of discrete steps (0 = disabled, 2 = on/off, 12 = semitones, etc.) */
  quantize?: number;
}

interface AdsrState {
  phase: 'idle' | 'attack' | 'decay' | 'sustain' | 'release';
  phaseStartTime: number;
  gateOn: boolean;
}

interface SampleHoldState {
  lastUpdateTime: number;
  heldValue: number;
}

interface SequencerState {
  lastStepIndex: number;
}

interface RandomCorrelatedState {
  lastValue: number;
}

interface SlewState {
  lastOutput: number;
  lastTime: number;
}

class InputSignalService {
  private activeSignals: Record<string, VirtualSignal> = {};
  private startTime: number = Date.now();
  private adsrStates: Record<string, AdsrState> = {};
  private sampleHoldStates: Record<string, SampleHoldState> = {};
  private sequencerStates: Record<string, SequencerState> = {};
  private randomCorrelatedStates: Record<string, RandomCorrelatedState> = {};
  private slewStates: Record<string, SlewState> = {};

  setSignal(portId: string, signal: VirtualSignal | null) {
    if (!signal) {
      delete this.activeSignals[portId];
      delete this.adsrStates[portId];
      delete this.sampleHoldStates[portId];
      delete this.sequencerStates[portId];
      delete this.randomCorrelatedStates[portId];
      delete this.slewStates[portId];
    } else {
      // Initialize with defaults
      this.activeSignals[portId] = {
        dutyCycle: 0.5,
        attackTime: 0.01,
        decayTime: 0.1,
        sustainLevel: 0.7,
        releaseTime: 0.3,
        gateOn: true,
        steps: [0.0, 0.2, 0.5, 0.8, 1.0, 0.7, 0.3, 0.0],
        correlation: 0.5,
        slewRate: 0,
        quantize: 0,
        ...signal
      };
    }
  }

  setGateState(portId: string, gateOn: boolean): void {
    const sig = this.activeSignals[portId];
    if (sig) {
      sig.gateOn = gateOn;
      // Reset ADSR when gate changes
      if (sig.type === 'adsr') {
        const state = this.adsrStates[portId];
        if (state) {
          state.gateOn = gateOn;
          state.phase = gateOn ? 'attack' : 'release';
          state.phaseStartTime = Date.now();
        } else {
          this.adsrStates[portId] = {
            phase: gateOn ? 'attack' : 'idle',
            phaseStartTime: Date.now(),
            gateOn
          };
        }
      }
    }
  }

  /**
   * Get the value of a signal, with depth guard against circular cross-modulation.
   * @param portId - The port to read
   * @param _depth - Internal recursion guard (max 3 levels)
   */
  getSignalValue(portId: string, _depth: number = 0): number {
    if (_depth > 3) return 0; // Circular modulation guard
    const sig = this.activeSignals[portId];
    if (!sig) return 0;

    const now = Date.now();
    const t = (now - this.startTime) / 1000;
    const freq = sig.frequency || 1;
    const amp = sig.amplitude || 0.5;
    const off = sig.offset || 0;

    // Base value before modulation
    let baseVal = 0;

    switch (sig.type) {
      case 'sine':
        baseVal = amp * Math.sin(2 * Math.PI * freq * t);
        break;

      case 'square':
        baseVal = Math.sin(2 * Math.PI * freq * t) >= 0 ? amp : -amp;
        break;

      case 'saw':
        baseVal = amp * (2 * (t * freq - Math.floor(0.5 + t * freq)));
        break;

      case 'triangle': {
        const phase = (t * freq) % 1;
        baseVal = amp * (2 * Math.abs(2 * phase - 1) - 1);
        break;
      }

      case 'pulse': {
        const dutyPulse = sig.dutyCycle ?? 0.5;
        const phasePulse = (t * freq) % 1;
        baseVal = phasePulse < dutyPulse ? amp : -amp;
        break;
      }

      case 'pwm': {
        // Duty cycle modulated by a slow LFO
        const modPhase = (t * 0.1) % 1;
        const dutyPwm = 0.1 + 0.8 * (0.5 + 0.5 * Math.sin(2 * Math.PI * modPhase));
        const phasePwm = (t * freq) % 1;
        baseVal = phasePwm < dutyPwm ? amp : -amp;
        break;
      }

      case 'noise':
        baseVal = (Math.random() * 2 - 1) * amp;
        break;

      case 'lfo_slow':
        baseVal = amp * Math.sin(2 * Math.PI * 0.5 * t); // 0.5Hz LFO
        break;

      case 'static':
        baseVal = amp;
        break;

      case 'adsr': {
        // Initialize state if needed
        if (!this.adsrStates[portId]) {
          this.adsrStates[portId] = {
            phase: sig.gateOn ? 'attack' : 'idle',
            phaseStartTime: now,
            gateOn: sig.gateOn ?? true
          };
        }
        const adsrState = this.adsrStates[portId];
        const elapsed = (now - adsrState.phaseStartTime) / 1000;
        const attackT = sig.attackTime ?? 0.01;
        const decayT = sig.decayTime ?? 0.1;
        const sustainLvl = sig.sustainLevel ?? 0.7;
        const releaseT = sig.releaseTime ?? 0.3;

        if (adsrState.phase === 'idle') {
          baseVal = 0;
        } else if (adsrState.phase === 'attack') {
          const progress = Math.min(elapsed / attackT, 1);
          baseVal = amp * progress;
          if (progress >= 1) {
            adsrState.phase = 'decay';
            adsrState.phaseStartTime = now;
          }
        } else if (adsrState.phase === 'decay') {
          const progress = Math.min(elapsed / decayT, 1);
          baseVal = amp * (sustainLvl + (1 - sustainLvl) * (1 - progress));
          if (progress >= 1) {
            adsrState.phase = 'sustain';
          }
        } else if (adsrState.phase === 'sustain') {
          baseVal = amp * sustainLvl;
          // Check for gate-off
          if (adsrState.gateOn && !sig.gateOn) {
            adsrState.gateOn = false;
            adsrState.phase = 'release';
            adsrState.phaseStartTime = now;
          }
        } else if (adsrState.phase === 'release') {
          const progress = Math.min(elapsed / releaseT, 1);
          baseVal = amp * sustainLvl * (1 - progress);
          if (progress >= 1) {
            adsrState.phase = 'idle';
            baseVal = 0;
          }
        }
        break;
      }

      case 'sample_hold': {
        if (!this.sampleHoldStates[portId]) {
          this.sampleHoldStates[portId] = {
            lastUpdateTime: now,
            heldValue: Math.random() * 2 - 1
          };
        }
        const shState = this.sampleHoldStates[portId];
        const sampleInterval = (1 / freq) * 1000; // ms
        if (now - shState.lastUpdateTime >= sampleInterval) {
          shState.lastUpdateTime = now;
          shState.heldValue = Math.random() * 2 - 1;
        }
        baseVal = amp * shState.heldValue;
        break;
      }

      case 'sequencer': {
        const steps = sig.steps ?? [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25];
        const stepDuration = (1 / freq) * 1000; // ms per step
        if (!this.sequencerStates[portId]) {
          this.sequencerStates[portId] = {
            lastStepIndex: 0
          };
        }
        const seqState = this.sequencerStates[portId];
        const totalStepTime = now - this.startTime;
        const stepIndex = Math.floor(totalStepTime / stepDuration) % steps.length;
        baseVal = amp * (steps[stepIndex] ?? 0);
        seqState.lastStepIndex = stepIndex;
        break;
      }

      case 'random_correlated': {
        if (!this.randomCorrelatedStates[portId]) {
          this.randomCorrelatedStates[portId] = {
            lastValue: Math.random() * 2 - 1
          };
        }
        const rcState = this.randomCorrelatedStates[portId];
        const correlation = sig.correlation ?? 0.5;
        // Update at frequency rate
        const lastUpdate = this.sampleHoldStates[portId]?.lastUpdateTime ?? 0;
        const interval = (1 / freq) * 1000;
        if (now - lastUpdate >= interval) {
          if (!this.sampleHoldStates[portId]) {
            this.sampleHoldStates[portId] = { lastUpdateTime: now, heldValue: 0 };
          }
          this.sampleHoldStates[portId].lastUpdateTime = now;
          const newRand = Math.random() * 2 - 1;
          rcState.lastValue = correlation * rcState.lastValue + (1 - correlation) * newRand;
        }
        baseVal = amp * rcState.lastValue;
        break;
      }

      default:
        baseVal = 0;
    }

    // Apply cross-modulation if configured (with depth guard)
    const modSourceId = sig.modSourceId;
    const modAmount = sig.modAmount ?? 0;
    if (modSourceId && modAmount !== 0) {
      const modValue = this.getSignalValue(modSourceId, _depth + 1);
      // Cross-modulation: modulate the base value by the source signal
      baseVal = baseVal * (1 + modAmount * modValue);
    }

    let output = off + baseVal;

    // Apply slew rate / portamento if enabled
    if (sig.slewRate && sig.slewRate > 0) {
      if (!this.slewStates[portId]) {
        this.slewStates[portId] = { lastOutput: output, lastTime: now };
      }
      const slewState = this.slewStates[portId];
      const dt = (now - slewState.lastTime) / 1000; // seconds since last call
      if (dt > 0 && dt < 0.5) { // Skip if dt is too large (stall recovery)
        const maxChange = sig.slewRate * dt;
        const diff = output - slewState.lastOutput;
        if (Math.abs(diff) > maxChange) {
          output = slewState.lastOutput + Math.sign(diff) * maxChange;
        }
      }
      slewState.lastOutput = output;
      slewState.lastTime = now;
    }

    // Apply quantization if enabled
    if (sig.quantize && sig.quantize > 1) {
      const steps_q = sig.quantize;
      // Quantize to N steps in the [-1, 1] range with offset compensation
      const normalized = (output - off) / (amp || 0.001);
      const stepVal = Math.round(normalized * (steps_q / 2)) / (steps_q / 2);
      output = off + amp * Math.max(-1, Math.min(1, stepVal));
    }

    return output;
  }

  getActiveSignal(portId: string): VirtualSignal | null {
    return this.activeSignals[portId] || null;
  }

  getAllActiveSignals(): Record<string, VirtualSignal> {
    return { ...this.activeSignals };
  }

  /**
   * Serialize simulation state for persistence in project.json
   */
  serializeState(): Record<string, VirtualSignal> {
    return JSON.parse(JSON.stringify(this.activeSignals));
  }

  /**
   * Deserialize and restore simulation state from saved data
   */
  deserializeState(data: Record<string, VirtualSignal>): void {
    this.activeSignals = JSON.parse(JSON.stringify(data));
    // Clear all stateful generators — they'll reinitialize on next getSignalValue call
    this.adsrStates = {};
    this.sampleHoldStates = {};
    this.sequencerStates = {};
    this.randomCorrelatedStates = {};
  }

  /**
   * Reset all active signals
   */
  resetAll(): void {
    this.activeSignals = {};
    this.adsrStates = {};
    this.sampleHoldStates = {};
    this.sequencerStates = {};
    this.randomCorrelatedStates = {};
    this.startTime = Date.now();
  }
}

export const inputSignalService = new InputSignalService();
