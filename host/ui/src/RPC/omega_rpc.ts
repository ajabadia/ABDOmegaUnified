import { OmegaLog } from './omega_log.js';
import { normalizeIncomingEvent } from '../Types/omega_types.js';

export interface RPCMessage {
    type: string;
    requestId?: number;
    payload?: any;
}

export class OmegaRPC {
    private requestId: number = 1000;
    private pendingRequests: Map<number, { resolve: Function, reject: Function, timer: any }> = new Map();
    
    public isConnected: boolean = false;
    public lastActivity: number = Date.now();
    private healthTimer: any = null;

    constructor() {
        OmegaLog.info("RPC", "Aseptic Bridge Initialized");
        
        // Listener for messages from C++
        (window as any).handleOmegaMessage = (json: any) => {
            this.lastActivity = Date.now();
            this.isConnected = true;
            this.updateHealthUI();

            try {
                const msg: RPCMessage = typeof json === 'string' ? JSON.parse(json) : json;
                const tag = (msg.type === 'telemetryUpdate' || msg.type === 'TELEMETRY') ? 'TELEMETRY' : 'RPC';
                OmegaLog.debug(tag, `RECV [Type: ${msg.type}]`, msg);
                
                if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                    const req = this.pendingRequests.get(msg.requestId)!;
                    clearTimeout(req.timer);
                    this.pendingRequests.delete(msg.requestId);
                    
                    if (msg.type === "rpcError" || msg.type === "error") {
                        req.reject(msg.payload || msg);
                    } else {
                        // Era 6.1: Precision Unwrapping
                        const data = (msg.payload !== undefined && msg.payload !== null) ? msg.payload : msg;
                        
                        // [CRITICAL] Even if it's a request response, if it's a state-like event,
                        // we must dispatch it so the RuntimeStore/EventHub can see it.
                        if (msg.type === 'state' || msg.type === 'onStateUpdate') {
                            const norm = normalizeIncomingEvent(msg);
                            if (norm) {
                                window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: norm }));
                            }
                        }

                        req.resolve(data);
                    }
                } else {
                    // Era 6.1 Normalization Shunt
                    const norm = normalizeIncomingEvent(msg);
                    if (norm) {
                        window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: norm }));
                    }
                }
            } catch (e) {
                OmegaLog.error("RPC", "Message parsing failed", e, json);
            }
        };

        this.startHealthMonitor();
    }

    private handleNativeResponse(id: number, payload: any) {
        if (this.pendingRequests.has(id)) {
            const req = this.pendingRequests.get(id)!;
            clearTimeout(req.timer);
            this.pendingRequests.delete(id);
            
            // Era 6.1: Unwrapping for direct native returns
            if (payload && typeof payload === 'object' && 'payload' in payload && 'type' in payload) {
                req.resolve(payload.payload);
            } else {
                req.resolve(payload);
            }
        }
    }

    private startHealthMonitor() {
        if (this.healthTimer) clearInterval(this.healthTimer);
        this.healthTimer = setInterval(() => {
            const idleTime = Date.now() - this.lastActivity;
            if (idleTime > 5000) {
                if (this.isConnected) {
                    OmegaLog.warn("RPC", "Connection idle or lost (5s)");
                    this.isConnected = false;
                    this.updateHealthUI();
                }
            }
        }, 2000);
    }

    private updateHealthUI() {
        const led = document.getElementById('bridge-health-led');
        if (led) {
            led.classList.toggle('active', this.isConnected);
            led.style.backgroundColor = this.isConnected ? 'var(--neon-green)' : 'var(--neon-dim)';
            led.style.boxShadow = this.isConnected ? '0 0 10px var(--neon-green)' : 'none';
        }
    }

    private async _waitForBackend(timeout: number = 5000): Promise<any> {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const win = window as any;
            
            // Era 7: JUCE 8 Backend is mandatory for Event-Based Bridge
            if (win.__JUCE__?.backend) return win.__JUCE__.backend;
            
            await new Promise(r => setTimeout(r, 100));
        }
        return null;
    }

    /**
     * Centralized Send Method: Uses Event-Based Bridge for Maximum Reliability
     */
    public async send(type: string, payload: any = {}): Promise<any> {
        const id = this.requestId++;
        const message = { type, requestId: id, payload };
        
        const backend = await this._waitForBackend();
        if (!backend || !backend.emitEvent) {
            OmegaLog.error("RPC", `Backend EVENT CHANNEL UNREACHABLE for ${type}`);
            this.isConnected = false;
            this.updateHealthUI();
            return null;
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    OmegaLog.error("RPC", `Request TIMEOUT [${id}] for ${type}`);
                    reject(new Error(`RPC Timeout: ${type}`));
                }
            }, 10000);

            this.pendingRequests.set(id, { resolve, reject, timer });

            try {
                // Era 7 Event-Based Query
                const tag = (type === 'subscribeTelemetry' || type === 'unsubscribeTelemetry') ? 'TELEMETRY' : 'RPC';
                OmegaLog.debug(tag, `EMIT [ID: ${id}] ${type}`, payload);
                backend.emitEvent("omega_rpc_query", message);
            } catch (e) {
                clearTimeout(timer);
                if (this.pendingRequests.has(id)) this.pendingRequests.delete(id);
                OmegaLog.error("RPC", `Event emission CRASHED for ${type}`, e);
                reject(e);
            }
        });
    }

    /**
     * Era 7 Handshake
     */
    public async ensureReady(timeout: number = 5000): Promise<boolean> {
        OmegaLog.info("RPC", "Starting Era 7 Handshake...");
        const backend = await this._waitForBackend(timeout);
        if (!backend) {
            OmegaLog.error("RPC", "Handshake FAILED: Native backend unreachable");
            return false;
        }

        try {
            const state = await this.getState();
            if (state) {
                this.isConnected = true;
                this.updateHealthUI();
                OmegaLog.info("RPC", "Handshake SUCCESS: Backend is alive and state received");
                return true;
            }
        } catch (e) {
            OmegaLog.error("RPC", "Handshake FAILED: Could not retrieve initial state", e);
        }

        return false;
    }

    public call(type: string, payload: any = {}) { return this.send(type, payload); }
    public getState() { return this.send("getState"); }
    public getUiSchemas() { return this.send("getUiSchemas"); }
    public getSystemSettings() { return this.send("getSystemSettings"); }
    public uiReady() { return this.send("uiReady"); }
}

export const rpc = new OmegaRPC();

// Era 6 Aseptic: Direct window.juce access is ILLEGAL. 
// Use window.rpcCommandDispatcher.dispatch instead.
(window as any).omegaRPC = rpc;
