/**
 * OMEGA RpcCommandDispatcher
 * Central authority for all UI-triggered mutations.
 * Era 6 - Absolute Aseptic Encapsulation
 */

import { OmegaLog } from './omega_log.js';
import { type UiCommand } from '../Types/omega_types.js';

export class RpcCommandDispatcher {
    private rpc: any;

    constructor() {
        // @ts-ignore
        this.rpc = window.omegaRPC;
        OmegaLog.info("DISPATCH", "RpcCommandDispatcher Initialized");
    }

    private static readonly CORE_COMMANDS = new Set([
        'setParameter', 'loadPreset', 'savePreset', 'newPreset',
        'updatePatchbayMatrixSlot', 'subscribeTelemetry',
        'getUiSchemas', 'getSystemSettings', 'serviceAction',
        'setSystemSetting', 'uiReady', 'exit', 'clearRack', 'undo', 'redo',
        'listAce', 'listPresets', 'getBrowserData', 'getHistory',
        'addModule', 'removeModule', 'moveModule',
        'getModulationMetadata',
        'getTelemetry', 'getTelemetrySources', 'getModConnections',
        'getScopeState', 'setScopeState',
        'getState',
        'triggerNote',
        'systemAction',
        'getAceSchema',
        'getMetadata', 'getSampleRate', 'getTempo', 'getInventory',
    ]);

    public async dispatch(cmd: UiCommand): Promise<any> {
        OmegaLog.debug("DISPATCH", `${cmd.type}`, cmd.payload || '');

        if (!this.rpc) {
            OmegaLog.error("DISPATCH", "RPC Bridge missing! Command aborted.");
            return;
        }

        try {
            // 1. Core System Path (Strict Validation)
            if (RpcCommandDispatcher.CORE_COMMANDS.has(cmd.type)) {
                return await this.handleCoreCommand(cmd);
            }

            // 2. Dynamic/Legacy Bridge (Noisy Fallback)
            return await this.handleDynamicCommand(cmd);

        } catch (e) {
            OmegaLog.error("DISPATCH", `Failed to execute ${cmd.type}`, e);
        }
    }

    private async handleCoreCommand(cmd: UiCommand): Promise<any> {
        switch (cmd.type) {
            case 'setParameter':
                const p = cmd.payload as any;
                if (!p.target && (p.instanceId === undefined || p.paramId === undefined)) {
                     throw new Error("setParameter missing target or numeric IDs");
                }
                break;
            // Additional core validations can go here
        }
        return await this.rpc.send(cmd.type, cmd.payload);
    }

    private async handleDynamicCommand(cmd: any): Promise<any> {
        const method = cmd.target || cmd.method || cmd.type;
        const params = cmd.payload || cmd.value || cmd.data || {};
        
        if (method && method !== 'systemAction') {
            OmegaLog.warn("DISPATCH", `DYNAMIC ROUTE: Using unverified RPC method: ${method}. This is deprecated in Era 7.`, params);
            return await this.rpc.send(method, params);
        }
        
        const errorMsg = `CONTRACT VIOLATION: Unknown command structure for type '${cmd.type}'`;
        OmegaLog.error("DISPATCH", errorMsg);
        throw new Error(errorMsg);
    }
}

// Global instance
// @ts-ignore
window.rpcCommandDispatcher = new RpcCommandDispatcher();
