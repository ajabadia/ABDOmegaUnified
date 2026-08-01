import { OmegaLog } from '../RPC/omega_log.js';
import type {
  ModMetadataPayloadV1,
  ParamChangeEvent,
  StatePayloadV1,
  StatePayloadV7,
  PatchDocumentV7,
  TelemetryFramePayloadV1,
  TelemetrySample,
  UiCommand,
} from '../Types/omega_types.js';

export interface RuntimeStoreState {
  patch: PatchDocumentV7 | null;
  preset: StatePayloadV1['preset'] | null; // Legacy
  params: Record<string, number>; // Legacy
  telemetry: Record<string, TelemetrySample>;
  modulation: ModMetadataPayloadV1 | null;
  schemaVersion: string | null;
  systemInfo: {
      version: string;
      build: string;
      lcdText: string;
  };
}

export enum ChangeType {
    Structure = 1,
    Parameters = 2,
    Telemetry = 4,
    System = 8,
    All = 15
}

export type StoreListener = (changeType: ChangeType) => void;

export abstract class BaseStore {
  protected listeners: Set<StoreListener> = new Set();
  
  subscribe(callback: StoreListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  protected notify(type: ChangeType = ChangeType.All): void {
    this.listeners.forEach(cb => cb(type));
  }
}

export class RuntimeStore extends BaseStore {
  private state: RuntimeStoreState = {
    patch: null,
    preset: null,
    params: {},
    telemetry: {},
    modulation: null,
    schemaVersion: null,
    systemInfo: {
        version: "0.0.0",
        build: "0",
        lcdText: "INITIALIZING..."
    }
  };

  getSnapshot(): RuntimeStoreState {
    return this.state;
  }

  getValue(paramKey: string, defaultValue: number = 0): number {
    return this.state.params[paramKey] ?? defaultValue;
  }

  getTelemetry(paramKey: string): number {
    const sample = this.state.telemetry[paramKey];
    return sample ? (sample.v ?? 0) : 0;
  }

  applyState(payload: StatePayloadV7 | StatePayloadV1): void {
    if (!payload) return;
    
    const isV7 = payload.schemaVersion === '7.0';
    
    if (isV7) {
        const v7 = payload as StatePayloadV7;
        OmegaLog.info('STORE', `Applying Era 7 Patch: ${v7.patch.name || 'Untitled'}`);
        this.state = {
            ...this.state,
            schemaVersion: '7.0',
            patch: v7.patch,
            params: this.syncLegacyParams(v7.patch)
        };
        this.notify(ChangeType.Structure | ChangeType.Parameters);
    } else {
        OmegaLog.warn('STORE', `REJECTED: Non-Era 7 payload received (Version: ${payload.schemaVersion}). Pure Era 7 environment enforced.`);
    }
  }

  private syncLegacyParams(patch: PatchDocumentV7): Record<string, number> {
      const legacy: Record<string, number> = {};
      const modules = patch.modules || [];
      for (const mod of modules) {
          const params = (mod.parameters || mod.params || {}) as Record<string, number>;
          for (const [id, val] of Object.entries(params)) {
              legacy[`${mod.instanceId}.${id}`] = val;
          }
      }
      return legacy;
  }

  applyParamChange(event: ParamChangeEvent): void {
    this.state = {
      ...this.state,
      params: {
        ...this.state.params,
        [event.id]: event.value,
      },
    };
    this.notify(ChangeType.Parameters);
  }

  applyTelemetryFrame(payload: TelemetryFramePayloadV1): void {
    if (!payload) return;
    const nextTelemetry = { ...this.state.telemetry };

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'schemaVersion') continue;
      if (value && typeof value === 'object') {
        nextTelemetry[key] = value as TelemetrySample;
      }
    }

    this.state = {
      ...this.state,
      schemaVersion: payload.schemaVersion || this.state.schemaVersion,
      telemetry: nextTelemetry,
    };
    this.notify(ChangeType.Telemetry);
  }

  applyModulation(payload: ModMetadataPayloadV1): void {
    this.state = {
      ...this.state,
      modulation: payload,
    };
    this.notify(ChangeType.Structure);
  }

  reduceEvent(event: any): void {
    if (!event) return;
    switch (event.type) {
      case 'PARAMCHANGE':
        this.applyParamChange(event as ParamChangeEvent);
        return;
      case 'onStateUpdate':
      case 'state':
        this.applyState(event.payload || event);
        return;
      case 'telemetryUpdate':
        this.applyTelemetryFrame(event.payload || event);
        return;
      case 'onLCDUpdate':
        this.state = {
            ...this.state,
            systemInfo: { ...this.state.systemInfo, lcdText: event.detail || event.payload || event }
        };
        this.notify(ChangeType.System);
        return;
      case 'onVersionUpdate':
        const vData = event.detail || event.payload || event;
        this.state = {
            ...this.state,
            systemInfo: { 
                ...this.state.systemInfo, 
                version: vData.version || this.state.systemInfo.version,
                build: vData.build || this.state.systemInfo.build
            }
        };
        this.notify(ChangeType.System);
        return;
    }
  }
}

export interface SchemaStoreState {
  schemaVersion: string | null;
  uiSchema: any | null;
}

export interface GraphStoreState {
  schemaVersion: string | null;
  graph: any | null;
}

export class GraphStore extends BaseStore {
  private state: GraphStoreState = {
    schemaVersion: null,
    graph: null,
  };

  getSnapshot(): GraphStoreState {
    return this.state;
  }

  setGraph(graph: any, schemaVersion?: string): void {
    this.state = {
      schemaVersion: schemaVersion ?? this.state.schemaVersion,
      graph,
    };
    this.notify();
  }
}

export interface SessionStoreState {
  selectedModuleId: string | null;
  focusedBinding: string | null;
  activeWorkspace: string | null;
  openPanels: string[];
}

export class SessionStore extends BaseStore {
  private state: SessionStoreState = {
    selectedModuleId: null,
    focusedBinding: null,
    activeWorkspace: null,
    openPanels: [],
  };

  constructor() {
    super();
    this.loadFromStorage();
  }

  private loadFromStorage() {
     const saved = localStorage.getItem('omega_session');
     if (saved) {
        try {
           this.state = { ...this.state, ...JSON.parse(saved) };
        } catch(e) {}
     }
  }

  private persist() {
     localStorage.setItem('omega_session', JSON.stringify(this.state));
     this.notify();
  }

  getSnapshot(): SessionStoreState {
    return this.state;
  }

  setSelectedModule(moduleId: string | null): void {
    this.state = { ...this.state, selectedModuleId: moduleId };
    this.persist();
  }

  setFocusedBinding(binding: string | null): void {
    this.state = { ...this.state, focusedBinding: binding };
    this.persist();
  }

  setActiveWorkspace(workspace: string | null): void {
    this.state = { ...this.state, activeWorkspace: workspace };
    this.persist();
  }

  openPanel(panelId: string): void {
    if (this.state.openPanels.includes(panelId)) return;
    this.state = { ...this.state, openPanels: [...this.state.openPanels, panelId] };
    this.persist();
  }

  closePanel(panelId: string): void {
    this.state = { ...this.state, openPanels: this.state.openPanels.filter(id => id !== panelId) };
    this.persist();
  }
}

export interface CommandBus {
  dispatch(command: UiCommand): void | Promise<void>;
}
