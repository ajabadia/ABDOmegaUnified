import { OmegaLog } from '../RPC/omega_log.js';
import { rpc } from '../RPC/omega_rpc.js';

/**
 * OMEGA Era 7 - Runtime Event Hub
 * The single source of window event consumption.
 */
export class RuntimeEventHub {
    private static initialized = false;

    static init() {
        if (this.initialized) return;
        this.initialized = true;

        OmegaLog.info("HUB", "Initializing Unified Event Pipeline...");

        const handle = (e: Event) => {
            const ce = e as CustomEvent;
            if (window.runtimeStore) {
                window.runtimeStore.reduceEvent(ce.detail);
            }
        };

        // Standard Era 7 Native Events
        window.addEventListener('omega:onStateUpdate', handle);
        window.addEventListener('omega:PARAMCHANGE', handle);
        window.addEventListener('omega:telemetryUpdate', handle);
        window.addEventListener('omega:onLCDUpdate', handle);
        window.addEventListener('omega:onVersionUpdate', handle);
        
        // Legacy/Bridge Shunt (if needed)
        window.addEventListener('omega:state', handle);

        OmegaLog.info("HUB", "Pipeline Active. All native events are now routed through RuntimeStore.");
    }
}
