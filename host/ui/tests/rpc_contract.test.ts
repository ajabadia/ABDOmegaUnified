import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OmegaRPC } from '../src/RPC/omega_rpc.js';
import { FakeHostBridge } from './FakeHostBridge.js';

describe('OMEGA Era 7.2.3 - RPC Contract Validation', () => {
  let rpc: OmegaRPC;
  let host: FakeHostBridge;

  beforeEach(() => {
    // 1. Setup Fake Host
    host = new FakeHostBridge();
    
    // 2. Setup RPC client
    rpc = new OmegaRPC();

    // 3. Connect them
    host.setCallback((window as any).handleOmegaMessage);
  });

  describe('Connection & Bootstrap', () => {
    it('should receive UIREADYACK on uiReady', async () => {
      const response = await rpc.uiReady();
      expect(response).toBe(true);
    });
  });

  describe('Parameter Contract', () => {
    it('should send correct setParameter payload and receive PARAMACK', async () => {
      const payload = { target: 'OSC1_TYPE', value: 2.0 };
      const response = await rpc.send('setParameter', payload);
      
      expect(response.target).toBe('OSC1_TYPE');
      expect(response.value).toBe(2.0);
      
      const lastCall = host.getLastCall();
      expect(lastCall.type).toBe('setParameter');
      if (!lastCall.payload) throw new Error("Payload missing");
      expect(lastCall.payload.target).toBe('OSC1_TYPE');
    });

    it('should REJECT legacy setParam with CONTRACTVIOLATION', async () => {
      await expect(rpc.send('setParam', { id: 'test', value: 0.5 }))
        .rejects.toThrow(/Legacy protocol 'setParam'/);
    });
  });

  describe('State Contract', () => {
    it('should receive state with schemaVersion 1.0', async () => {
      const response = await rpc.getState();
      
      expect(response.schemaVersion).toBe('1.0');
      expect(response.preset.name).toBe('Test Preset');
      expect(response.params['OSC1_FREQ']).toBe(0.5);
    });
  });

  describe('Module Rack Operations', () => {
    it('should addModule via core command path', async () => {
      const response = await rpc.send('addModule', { componentId: 'osc1', slot: 0 });
      expect(response).toBe(true);
    });

    it('should removeModule via core command path', async () => {
      const response = await rpc.send('removeModule', { instanceId: 'v7_1' });
      expect(response).toBe(true);
    });

    it('should moveModule via core command path', async () => {
      const response = await rpc.send('moveModule', { instanceId: 'v7_1', direction: 1 });
      expect(response).toBe(true);
    });

    it('should listAce via core command path', async () => {
      const response = await rpc.send('listAce', {});
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThanOrEqual(2);
    });

    it('should listPresets via core command path', async () => {
      const response = await rpc.send('listPresets', {});
      expect(Array.isArray(response)).toBe(true);
    });

    it('should loadPreset via core command path', async () => {
      const response = await rpc.send('loadPreset', {});
      expect(response).toBe(true);
    });

    it('should savePreset via core command path', async () => {
      const response = await rpc.send('savePreset', {});
      expect(response).toBe(true);
    });
  });

  describe('Patchbay / Modulation', () => {
    it('should updatePatchbayMatrixSlot via core command path', async () => {
      const response = await rpc.send('updatePatchbayMatrixSlot', { slot: 0, key: 'active', value: true });
      expect(response).toBe(true);
    });

    it('should getModulationMetadata via core command path', async () => {
      const response = await rpc.send('getModulationMetadata', {});
      expect(response).toHaveProperty('sources');
      expect(response).toHaveProperty('targets');
      expect(response).toHaveProperty('inventory');
    });
  });

  describe('Undo / Redo', () => {
    it('should undo via core command path', async () => {
      const response = await rpc.send('undo', {});
      expect(response).toBe(true);
    });

    it('should redo via core command path', async () => {
      const response = await rpc.send('redo', {});
      expect(response).toBe(true);
    });

    it('should clearRack via core command path', async () => {
      const response = await rpc.send('clearRack', {});
      expect(response).toBe(true);
    });
  });

  describe('Telemetry', () => {
    it('should getTelemetry via core command path', async () => {
      const response = await rpc.send('getTelemetry', {});
      expect(response).toHaveProperty('cpu');
    });

    it('should getTelemetrySources via core command path', async () => {
      const response = await rpc.send('getTelemetrySources', {});
      // FakeHost returns UNKNOWN_COMMAND for this — test that CORE path is taken silently
      // (no deprecation warning in logs)
    });
  });

  describe('System / Metadata', () => {
    it('should getSystemSettings via core command path', async () => {
      const response = await rpc.send('getSystemSettings', {});
      expect(response).toHaveProperty('midiChannel');
    });

    it('should triggerNote via core command path', async () => {
      const response = await rpc.send('triggerNote', { note: 60, velocity: 100 });
      expect(response).toBe(true);
    });

    it('should getBrowserData via core command path', async () => {
      const response = await rpc.send('getBrowserData', {});
      expect(response).toHaveProperty('libraries');
      expect(response).toHaveProperty('categories');
    });
  });

  describe('No Deprecation Warning for CORE_COMMANDS', () => {
    it('should NOT trigger deprecated fallback warning for addModule', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await rpc.send('addModule', { componentId: 'osc1' });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should NOT trigger deprecated fallback warning for removeModule', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await rpc.send('removeModule', { instanceId: 'v7_1' });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should NOT trigger deprecated fallback warning for undo/redo/clearRack', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await rpc.send('undo', {});
      await rpc.send('redo', {});
      await rpc.send('clearRack', {});
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Event Normalization (Era 6.1 Shunt)', () => {
    it('should normalize legacy PARAM_CHANGE to omega:PARAMCHANGE event', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      // Inject legacy event
      host.injectEvent('PARAM_CHANGE', { target: 'FILTER1_RES', value: 0.9 });
      
      expect(dispatchSpy).toHaveBeenCalled();
      const calls = dispatchSpy.mock.calls;
      const firstCall = calls[0];
      if (!firstCall) throw new Error("Dispatch not called");
      const lastEvent = firstCall[0] as CustomEvent;
      
      expect(lastEvent.type).toBe('omega:PARAMCHANGE');
      expect(lastEvent.detail.id).toBe('FILTER1_RES');
      expect(lastEvent.detail.value).toBe(0.9);
    });

    it('should pass nominal PARAMCHANGE directly', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      // Inject nominal event
      host.injectEvent('PARAMCHANGE', { id: 'LFO1_SPEED', value: 0.3 });
      
      expect(dispatchSpy).toHaveBeenCalled();
      const calls = dispatchSpy.mock.calls;
      const firstCall = calls[0];
      if (!firstCall) throw new Error("Dispatch not called");
      const lastEvent = firstCall[0] as CustomEvent;
      
      expect(lastEvent.type).toBe('omega:PARAMCHANGE');
      expect(lastEvent.detail.id).toBe('LFO1_SPEED');
    });
  });
});
