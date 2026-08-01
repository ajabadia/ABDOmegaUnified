/**
 * OMEGA Era 7.2.3 - Fake Host Bridge
 * Simulates C++ OmegaUiBridge behavior for contract validation.
 */
export class FakeHostBridge {
  private lastReceivedType: string | null = null;
  private lastReceivedPayload: any = null;
  private messageCallback: ((json: string) => void) | null = null;

  constructor() {
    // ERA 7.2.3: Simulate JUCE 8 Backend Architecture
    (window as any).__JUCE__ = {
      backend: {
        emitEvent: (name: string, message: any) => {
          if (name === 'omega_rpc_query') {
            this.handleNativeCall(message.type, message.requestId, message.payload);
          }
        }
      }
    };
  }

  public setCallback(callback: (json: string) => void) {
    this.messageCallback = callback;
    (window as any).handleOmegaMessage = callback;
  }

  private handleNativeCall(type: string, requestId: any, payload: any) {
    this.lastReceivedType = type;
    this.lastReceivedPayload = payload;

    // --- CONTRACT ENFORCEMENT SIMULATION ---

    // 1. Fail-Fast for Legacy
    if (type === 'setParam' || type === 'menuAction') {
      this.sendToUi({
        type: 'rpcError',
        requestId,
        errorCode: 'CONTRACTVIOLATION',
        message: `Legacy protocol '${type}' is deprecated.`,
      });
      return;
    }

    // 2. Nominal Era 6.1 Responses
    switch (type) {
      case 'setParameter':
        this.sendToUi({
          type: 'PARAMACK',
          requestId,
          payload,
        });
        return;

      case 'getState':
        this.sendToUi({
          type: 'state',
          requestId,
          payload: {
            schemaVersion: '1.0',
            preset: { id: 'test-preset', name: 'Test Preset', author: 'Vitest' },
            params: { 'OSC1_FREQ': 0.5, 'FILTER1_CUTOFF': 0.8 }
          }
        });
        return;

      case 'uiReady':
        this.sendToUi({
          type: 'UIREADYACK',
          requestId,
          payload: true
        });
        return;

      case 'addModule':
        this.sendToUi({
          type: 'ADD_MODULE_ACK',
          requestId,
          payload: true
        });
        return;

      case 'removeModule':
        this.sendToUi({
          type: 'REMOVE_MODULE_ACK',
          requestId,
          payload: true
        });
        return;

      case 'moveModule':
        this.sendToUi({
          type: 'MOVE_MODULE_ACK',
          requestId,
          payload: true
        });
        return;

      case 'listAce':
        this.sendToUi({
          type: 'ACE_LIST',
          requestId,
          payload: [
            { id: 'osc1', name: 'Oscillator 1', family: 'osc' },
            { id: 'vcf1', name: 'VCF 1', family: 'filter' },
          ]
        });
        return;

      case 'loadPreset':
        this.sendToUi({
          type: 'LOAD_ACK',
          requestId,
          payload: true
        });
        return;

      case 'savePreset':
        this.sendToUi({
          type: 'SAVE_ACK',
          requestId,
          payload: true
        });
        return;

      case 'listPresets':
        this.sendToUi({
          type: 'PRESET_LIST',
          requestId,
          payload: ['Test Preset 1', 'Test Preset 2']
        });
        return;

      case 'getBrowserData':
        this.sendToUi({
          type: 'BROWSER_DATA',
          requestId,
          payload: { libraries: [{ name: 'Factory', category: 'Factory', patches: [] }], categories: ['Factory'] }
        });
        return;

      case 'getModulationMetadata':
        this.sendToUi({
          type: 'MOD_METADATA_ACK',
          requestId,
          payload: { sources: [], targets: [], inventory: [] }
        });
        return;

      case 'updatePatchbayMatrixSlot':
        this.sendToUi({
          type: 'PATCHBAY_UPDATE_ACK',
          requestId,
          payload: true
        });
        return;

      case 'newPreset':
      case 'clearRack':
        this.sendToUi({
          type: 'NEW_ACK',
          requestId,
          payload: true
        });
        return;

      case 'undo':
        this.sendToUi({
          type: 'UNDO_ACK',
          requestId,
          payload: true
        });
        return;

      case 'redo':
        this.sendToUi({
          type: 'REDO_ACK',
          requestId,
          payload: true
        });
        return;

      case 'triggerNote':
        this.sendToUi({
          type: 'NOTE_ACK',
          requestId,
          payload: true
        });
        return;

      case 'getTelemetry':
        this.sendToUi({
          type: 'TELEMETRY_DATA',
          requestId,
          payload: { cpu: 0.05, memory: 128 }
        });
        return;

      case 'getTelemetrySources':
        this.sendToUi({
          type: 'TELEMETRY_SOURCES',
          requestId,
          payload: ['cpu', 'memory', 'disk', 'network']
        });
        return;

      case 'subscribeTelemetry':
        this.sendToUi({
          type: 'TELEMETRY_SUBSCRIBED',
          requestId,
          payload: true
        });
        return;

      case 'getSystemSettings':
        this.sendToUi({
          type: 'SYSTEM_SETTINGS',
          requestId,
          payload: { midiChannel: 1, sampleRate: 48000 }
        });
        return;

      case 'setSystemSetting':
        this.sendToUi({
          type: 'SYSTEM_SETTING_ACK',
          requestId,
          payload: true
        });
        return;

      case 'systemAction':
      case 'uiReady':
        this.sendToUi({
          type: 'UIREADYACK',
          requestId,
          payload: true
        });
        return;

      case 'exit':
        this.sendToUi({
          type: 'EXIT_ACK',
          requestId,
          payload: true
        });
        return;

      case 'getHistory':
        this.sendToUi({
          type: 'HISTORY',
          requestId,
          errorCode: 'HISTORY',
          message: 'Version control deferred'
        });
        return;

      case 'getUiSchemas':
        this.sendToUi({
          type: 'UI_SCHEMAS',
          requestId,
          payload: { modules: [], connections: [] }
        });
        return;

      case 'serviceAction':
        this.sendToUi({
          type: 'SERVICE_ACK',
          requestId,
          payload: true
        });
        return;

      default:
        this.sendToUi({
          type: 'rpcError',
          requestId,
          errorCode: 'UNKNOWN_COMMAND',
          message: `Command '${type}' not implemented in FakeHost.`
        });
    }
  }

  private sendToUi(msg: any) {
    if (this.messageCallback) {
      this.messageCallback(JSON.stringify(msg));
    }
  }

  /**
   * Inject a push event from "C++"
   */
  public injectEvent(type: string, payload: any) {
    this.sendToUi({ type, ...payload });
  }

  public getLastCall() {
    return { type: this.lastReceivedType, payload: this.lastReceivedPayload };
  }
}
