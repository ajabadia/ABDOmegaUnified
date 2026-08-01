export type RequestId = string | number | null;
export type SchemaVersion = string;

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

export interface RuntimePresetInfo {
  id: string;
  name: string;
  author?: string;
}

export interface StatePayloadV1 {
  schemaVersion: SchemaVersion;
  preset: RuntimePresetInfo;
  params: Record<string, number>;
}

export interface StateResponse extends RpcEnvelope<StatePayloadV1> {
  type: 'state';
}

export interface ParamAckPayload {
  target: string;
  value: number;
}

export interface ParamAckResponse extends RpcEnvelope<ParamAckPayload> {
  type: 'PARAMACK';
}

export interface TelemetrySample {
  pk?: number;
  v?: number;
  h?: number[];
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

export type PatchbaySlotKey = 'source' | 'target' | 'amount' | 'via' | 'viaAmount' | 'active';

export interface PatchbayUpdateRequestPayload {
  slot: number;
  key: PatchbaySlotKey;
  value: string | number | boolean | null;
}

export interface PatchbayUpdateAckResponse extends RpcEnvelope<boolean> {
  type: 'PATCHBAYUPDATEACK';
}

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

export interface ParamChangeEvent {
  type: 'PARAMCHANGE';
  id: string;
  value: number;
}

export interface StateUpdateEvent {
  type: 'onStateUpdate';
  payload: StatePayloadV1;
}

export interface UiReadyAckResponse extends RpcEnvelope<boolean> {
  type: 'UIREADYACK';
}

export interface ScopeStatePayload {
  [key: string]: unknown;
}

export interface ScopeStateResponse extends RpcEnvelope<ScopeStatePayload> {
  type: 'SCOPESTATE';
}

export interface ScopeAckResponse extends RpcEnvelope<boolean> {
  type: 'SCOPEACK';
}

export interface ModConnectionsResponse extends RpcEnvelope<unknown[]> {
  type: 'MODCONNECTIONS';
}

export interface UiGetStateCommand {
  type: 'getState';
  requestId?: RequestId;
  payload: {};
}

export interface UiSetParameterCommand {
  type: 'setParameter';
  requestId?: RequestId;
  payload: { target: string; value: number };
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
  | UiServiceActionCommand;

export type RpcResponse =
  | StateResponse
  | ParamAckResponse
  | TelemetryDataResponse
  | TelemetrySourcesResponse
  | ModMetadataResponse
  | PatchbayUpdateAckResponse
  | UiReadyAckResponse
  | ScopeStateResponse
  | ScopeAckResponse
  | ModConnectionsResponse
  | RpcErrorEnvelope
  | RpcEnvelope;

export type UiEvent = ParamChangeEvent | StateUpdateEvent | TelemetryUpdateEvent;

export type BridgeMessage = UiCommand | RpcResponse | UiEvent;

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

export function normalizeIncomingEvent(value: unknown): UiEvent | RpcResponse | null {
  if (!isRpcEnvelope(value)) return null;

  if (value.type === 'PARAMCHANGE') {
    return {
      type: 'PARAMCHANGE',
      id: String((value as Record<string, unknown>).id ?? ''),
      value: Number((value as Record<string, unknown>).value ?? 0),
    };
  }

  return value as UiEvent | RpcResponse;
}
