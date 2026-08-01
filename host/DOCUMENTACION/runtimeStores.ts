import type {
  ModMetadataPayloadV1,
  ParamChangeEvent,
  StatePayloadV1,
  StateUpdateEvent,
  TelemetryFramePayloadV1,
  TelemetrySample,
  TelemetryUpdateEvent,
  UiCommand,
} from './rpcTypes';

export interface RuntimeStoreState {
  preset: StatePayloadV1['preset'] | null;
  params: Record<string, number>;
  telemetry: Record<string, TelemetrySample>;
  modulation: ModMetadataPayloadV1 | null;
  schemaVersion: string | null;
}

export class RuntimeStore {
  private state: RuntimeStoreState = {
    preset: null,
    params: {},
    telemetry: {},
    modulation: null,
    schemaVersion: null,
  };

  getSnapshot(): RuntimeStoreState {
    return this.state;
  }

  applyState(payload: StatePayloadV1): void {
    this.state = {
      ...this.state,
      schemaVersion: payload.schemaVersion,
      preset: payload.preset,
      params: { ...payload.params },
    };
  }

  applyParamChange(event: ParamChangeEvent): void {
    this.state = {
      ...this.state,
      params: {
        ...this.state.params,
        [event.target]: event.value,
      },
    };
  }

  applyTelemetryFrame(payload: TelemetryFramePayloadV1): void {
    const nextTelemetry = { ...this.state.telemetry };

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'schemaVersion') continue;
      if (value && typeof value === 'object') {
        nextTelemetry[key] = value as TelemetrySample;
      }
    }

    this.state = {
      ...this.state,
      schemaVersion: payload.schemaVersion,
      telemetry: nextTelemetry,
    };
  }

  applyModulation(payload: ModMetadataPayloadV1): void {
    this.state = {
      ...this.state,
      modulation: payload,
    };
  }

  reduceEvent(event: ParamChangeEvent | StateUpdateEvent | TelemetryUpdateEvent): void {
    switch (event.type) {
      case 'PARAM_CHANGE':
        this.applyParamChange(event);
        return;
      case 'onStateUpdate':
        this.applyState(event.payload);
        return;
      case 'telemetryUpdate':
        this.applyTelemetryFrame(event.payload);
        return;
    }
  }
}

export interface SchemaStoreState {
  schemaVersion: string | null;
  uiSchema: unknown | null;
}

export class SchemaStore {
  private state: SchemaStoreState = {
    schemaVersion: null,
    uiSchema: null,
  };

  getSnapshot(): SchemaStoreState {
    return this.state;
  }

  setSchema(uiSchema: unknown, schemaVersion?: string): void {
    this.state = {
      schemaVersion: schemaVersion ?? this.state.schemaVersion,
      uiSchema,
    };
  }
}

export interface GraphStoreState {
  schemaVersion: string | null;
  graph: unknown | null;
}

export class GraphStore {
  private state: GraphStoreState = {
    schemaVersion: null,
    graph: null,
  };

  getSnapshot(): GraphStoreState {
    return this.state;
  }

  setGraph(graph: unknown, schemaVersion?: string): void {
    this.state = {
      schemaVersion: schemaVersion ?? this.state.schemaVersion,
      graph,
    };
  }
}

export interface SessionStoreState {
  selectedModuleId: string | null;
  focusedBinding: string | null;
  activeWorkspace: string | null;
  openPanels: string[];
}

export class SessionStore {
  private state: SessionStoreState = {
    selectedModuleId: null,
    focusedBinding: null,
    activeWorkspace: null,
    openPanels: [],
  };

  getSnapshot(): SessionStoreState {
    return this.state;
  }

  setSelectedModule(moduleId: string | null): void {
    this.state = { ...this.state, selectedModuleId: moduleId };
  }

  setFocusedBinding(binding: string | null): void {
    this.state = { ...this.state, focusedBinding: binding };
  }

  setActiveWorkspace(workspace: string | null): void {
    this.state = { ...this.state, activeWorkspace: workspace };
  }

  openPanel(panelId: string): void {
    if (this.state.openPanels.includes(panelId)) return;
    this.state = { ...this.state, openPanels: [...this.state.openPanels, panelId] };
  }

  closePanel(panelId: string): void {
    this.state = { ...this.state, openPanels: this.state.openPanels.filter(id => id !== panelId) };
  }
}

export interface CommandBus {
  dispatch(command: UiCommand): void | Promise<void>;
}
