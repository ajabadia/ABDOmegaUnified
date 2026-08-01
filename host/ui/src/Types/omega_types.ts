/**
 * OMEGA Era 6.1 - Hardened Authoritative Contract Types
 * Aseptic Contractual Paradigm.
 */

export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Canonical Module Identifier (e.g., 'midi_2_cv') */
export type ModuleId = Brand<string, "ModuleId">;

/** Unique instance identifier in the rack (e.g., 'midi_2_cv_1') */
export type InstanceId = Brand<string, "InstanceId">;

export type RequestId = string | number | null;
export type SchemaVersion = string;

// --- RPC Envelope ---

export interface RpcEnvelope<TPayload = unknown> {
  type: string;
  requestId?: RequestId;
  error?: string | null;
  payload?: TPayload;
  [extra: string]: unknown;
}

export interface RpcErrorEnvelope extends RpcEnvelope<undefined> {
  type: 'error';
  error: string;
  originalType?: string;
}

// --- State ---

// --- Era 7: Patch Document (Absolute SOT) ---

export interface PatchModuleV7 {
  instanceId: number;
  typeId: number;
  componentId?: string; // Resolved by backend for UI convenience
  rack?: string;         // 'upper' | 'lower'
  label?: string;        // Custom user label
  theme?: string;        // Theme override (e.g., 'industrial', 'minimal')
  parameters: Record<string, number>; // Industrial Era 7 (String keys from bridge)
  params: Record<string, number>;     // Compatibility Layer
}

export interface PatchbayMatrixSlotV7 {
  source: string;    // "instanceId.portId"
  target: string;    // "instanceId.portId"
  amount: number;
  via: string;       // "instanceId.portId"
  viaAmount: number;
  active: boolean;
  color?: string;    // Color de cable personalizado (hex "#rrggbb"); ausente = por tipo de señal
}

export interface PatchDocumentV7 {
  name: string;
  author: string;
  masterGainDb: number;
  modules: PatchModuleV7[];
  patchbayMatrix: PatchbayMatrixSlotV7[];
}

export interface StatePayloadV1 {
  schemaVersion: '1.0' | string;
  preset: any;
  params?: Record<string, number>;
  auxiliary?: any[];
  mainChain?: any[];
}

export interface StatePayloadV7 {
  schemaVersion: '7.0';
  patch: PatchDocumentV7;
}

export interface StateResponse extends RpcEnvelope<StatePayloadV7 | StatePayloadV1> {
  type: 'state';
}

// --- Parameter Ack ---

export interface ParamAckPayload {
  target?: string;
  instanceId?: number;
  paramId?: number;
  value: number;
}

export interface ParamAckResponse extends RpcEnvelope<ParamAckPayload> {
  type: 'PARAMACK';
}

// --- Telemetry ---

export interface TelemetrySample {
  pk?: number; // peak
  v?: number; // instant value
  h?: number[]; // history buffer
}

export interface TelemetryFramePayloadV1 {
  schemaVersion: SchemaVersion;
  [pinId: string]: SchemaVersion | TelemetrySample;
}

export interface TelemetryDataResponse extends RpcEnvelope<TelemetryFramePayloadV1> {
  type: 'TELEMETRYDATA';
}

export interface TelemetryUpdateEvent {
  type: 'telemetryUpdate';
  tier: 'discrete' | 'streaming';
  payload: TelemetryFramePayloadV1;
}

// --- Modulation / Patchbay ---

export type ModPortSignalType = 'CV' | 'Audio' | 'MIDI' | 'Gate' | 'Bool';

export interface ModPortDescriptor {
  id: string;
  name?: string;
  label: string;
  type: ModPortSignalType;
  instance?: string;
  category?: string;
  telemetryIndex?: number;
  isInput: boolean;
}

export interface ModInventoryPort {
  id: string;
  label: string;
  type: ModPortSignalType;
  isInput: boolean;
  defaultValue?: number;
  options?: string[];
}

export interface ModInventoryItem {
  instanceId: string;
  category: string;
  status: 'active' | 'inactive' | 'bypassed' | string;
  ports: ModInventoryPort[];
}

export interface ModMetadataPayloadV1 {
  schemaVersion: SchemaVersion;
  sources: ModPortDescriptor[];
  targets: ModPortDescriptor[];
  inventory: ModInventoryItem[];
}

export interface ModMetadataResponse extends RpcEnvelope<ModMetadataPayloadV1> {
  type: 'MODMETADATAACK';
}

export type PatchbaySlotKey = 'source' | 'target' | 'amount' | 'via' | 'viaAmount' | 'active' | 'color';

export interface PatchbayUpdateRequestPayload {
  slot: number;
  key: PatchbaySlotKey;
  value: string | number | boolean | null;
}

export interface PatchbayUpdateAckResponse extends RpcEnvelope<boolean> {
  type: 'PATCHBAYUPDATEACK';
}

// --- Events ---

export interface ParamChangeEvent {
  type: 'PARAMCHANGE';
  id: string;
  value: number;
}

export interface StateUpdateEvent {
  type: 'onStateUpdate';
  payload: StatePayloadV1;
}

export type UiEvent = ParamChangeEvent | StateUpdateEvent | TelemetryUpdateEvent;

// --- Telemetry Discovery ---

export interface SubscribeTelemetryRequest {
  type: 'subscribeTelemetry';
  requestId?: RequestId;
  payload: { pins: string[] };
}

export interface GetTelemetryRequest {
  type: 'getTelemetry';
  requestId?: RequestId;
  payload: { pins: string[]; streaming?: boolean };
}

export interface GetTelemetrySourcesRequest {
  type: 'getTelemetrySources';
  requestId?: RequestId;
  payload: {};
}

export interface TelemetrySourceDescriptor {
  id: string;
  label: string;
  type: number;
}

export interface TelemetrySourcesPayload {
  sources: TelemetrySourceDescriptor[];
}

export interface TelemetrySourcesResponse extends RpcEnvelope<TelemetrySourcesPayload> {
  type: 'TELEMETRYSOURCES';
}

// --- Logic Commands ---

export interface UiGetStateCommand {
  type: 'getState';
  requestId?: RequestId;
  payload: {};
}

export interface UiSetParameterCommand {
  type: 'setParameter';
  requestId?: RequestId;
  payload: { 
    target?: string; 
    instanceId?: number; 
    paramId?: number; 
    value: number;
  };
}

export interface UiLoadPresetCommand {
  type: 'loadPreset' | 'loadLibraryPreset';
  requestId?: RequestId;
  payload: { target: string };
}

export interface UiSavePresetCommand {
  type: 'savePreset';
  requestId?: RequestId;
  payload: { name: string };
}

export interface UiUiReadyCommand {
  type: 'uiReady';
  requestId?: RequestId;
  payload: {};
}

export interface UiSubscribeTelemetryCommand extends SubscribeTelemetryRequest {}
export interface UiGetTelemetryCommand extends GetTelemetryRequest {}
export interface UiGetTelemetrySourcesCommand extends GetTelemetrySourcesRequest {}

export interface UiGetModMetadataCommand {
  type: 'getModulationMetadata';
  requestId?: RequestId;
  payload: {};
}

export interface UiPatchbayUpdateCommand {
  type: 'updatePatchbayMatrixSlot';
  requestId?: RequestId;
  payload: PatchbayUpdateRequestPayload;
}

export interface UiGetScopeStateCommand {
  type: 'getScopeState';
  requestId?: RequestId;
  payload: {};
}

export interface UiSetScopeStateCommand {
  type: 'setScopeState';
  requestId?: RequestId;
  payload: Record<string, unknown>;
}

export interface UiExitCommand {
  type: 'exit';
  requestId?: RequestId;
  payload: {};
}

export interface UiNewPresetCommand {
  type: 'newPreset';
  requestId?: RequestId;
  payload: {};
}

export interface UiSetSystemSettingCommand {
  type: 'setSystemSetting';
  requestId?: RequestId;
  payload: { id: string; value: number };
}

export interface UiServiceActionCommand {
  type: 'serviceAction';
  requestId?: RequestId;
  payload: { action: string; [key: string]: unknown };
}

export type UiCommand =
  | UiGetStateCommand
  | UiSetParameterCommand
  | UiLoadPresetCommand
  | UiSavePresetCommand
  | UiUiReadyCommand
  | UiSubscribeTelemetryCommand
  | UiGetTelemetryCommand
  | UiGetTelemetrySourcesCommand
  | UiGetModMetadataCommand
  | UiPatchbayUpdateCommand
  | UiGetScopeStateCommand
  | UiSetScopeStateCommand
  | UiExitCommand
  | UiNewPresetCommand
  | UiSetSystemSettingCommand
  | UiServiceActionCommand
  | { type: 'getMetadata'; payload: {} };

export type RpcResponse =
  | StateResponse
  | ParamAckResponse
  | TelemetryDataResponse
  | TelemetrySourcesResponse
  | ModMetadataResponse
  | PatchbayUpdateAckResponse
  | RpcEnvelope<boolean> // UI_READY_ACK, SCOPEACK
  | RpcEnvelope<Record<string, unknown>> // SCOPESTATE
  | RpcEnvelope<unknown[]> // MODCONNECTIONS
  | RpcErrorEnvelope
  | RpcEnvelope;

export type BridgeMessage = UiCommand | RpcResponse | UiEvent;

// --- Type Guards ---

export function isRpcEnvelope(value: unknown): value is RpcEnvelope {
  return !!value && typeof value === 'object' && 'type' in (value as Record<string, unknown>);
}

export function isUiEvent(value: unknown): value is UiEvent {
  if (!isRpcEnvelope(value)) return false;
  return value.type === 'PARAMCHANGE' || value.type === 'onStateUpdate' || value.type === 'telemetryUpdate';
}

export function isParamChangeEvent(value: unknown): value is ParamChangeEvent {
  return isRpcEnvelope(value) && value.type === 'PARAMCHANGE';
}

export function isStateUpdateEvent(value: unknown): value is StateUpdateEvent {
  return isRpcEnvelope(value) && value.type === 'onStateUpdate';
}

export function isTelemetryUpdateEvent(value: unknown): value is TelemetryUpdateEvent {
  return isRpcEnvelope(value) && value.type === 'telemetryUpdate';
}

// --- Normalization Shunt ---

export function normalizeIncomingEvent(value: unknown): UiEvent | RpcResponse | null {
  if (!isRpcEnvelope(value)) return null;

  // Normalización Era 6.1: PARAM_CHANGE legacy -> PARAMCHANGE nominal
  if (value.type === 'PARAM_CHANGE') {
    const raw = value as Record<string, unknown>;
    return {
      type: 'PARAMCHANGE',
      id: String(raw.target ?? raw.id ?? ''),
      value: Number(raw.value ?? 0),
    } as ParamChangeEvent;
  }

  // Asegurar que si el tipo ya es el nominal, lo devolvemos tal cual para que el rpc.ts lo despache
  return value as UiEvent | RpcResponse;
}

// --- Global Bridge Interface ---

export interface OmegaRPC {
    send(type: string, payload?: any): Promise<any>;
    call(type: string, payload?: any): Promise<any>;
    getState(): Promise<any>;
    getUiSchemas(): Promise<any>;
    getSystemSettings(): Promise<any>;
    uiReady(): Promise<any>;
}

declare global {
    interface Window {
        omegaRPC: any;
        runtimeStore: any;
        schemaStore: any;
        graphStore: any;
        sessionStore: any;
        inventoryStore: any;
        rpcCommandDispatcher: any;
        moduleManager: any;
        patchbayHub: any;
        moduleBrowser: any;
        modulePatchModal: any;
        Preferences: any;
        ServiceMode: any;
        ModuleRenderer: any;
        ModuleOscilloscope: any;
        ModuleMidiTrigger: any;
        ModuleMidiViewer: any;
        ModulePatchbayMatrix: any;
        ModuleMidiToCv: any;
        ModuleBrowser: any;
        lastFullState: any;
    }

    interface WindowEventMap {
        'omega:onStateUpdate': CustomEvent<StatePayloadV1>;
        'omega:PARAMCHANGE': CustomEvent<ParamChangeEvent>;
        'omega:telemetryUpdate': CustomEvent<TelemetryFramePayloadV1>;
        'patch-request': CustomEvent;
        'omega:moduleAdded': CustomEvent;
    }
}
