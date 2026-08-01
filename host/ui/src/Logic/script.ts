import { OmegaLog } from '../RPC/omega_log.js';
import { type UiCommand } from '../Types/omega_types.js';
import { UIManager } from './UIManager.js';

class OmegaApp {
    private ui: UIManager;
    private initialized: boolean = false;

    constructor() {
        OmegaLog.info("APP", "OmegaApp Constructor (Aseptic)");
        this.ui = new UIManager();
    }

    public async init() {
        OmegaLog.info("APP", "Initializing Aseptic App...");
        
        this.setupEventListeners();
        this.ui.setupInteractions();
        
        setTimeout(() => this.ui.hideSplash(), 3500);

        // [Era 7] Unified Dispatch for system readiness
        if (window.rpcCommandDispatcher) {
            await window.rpcCommandDispatcher.dispatch({ type: 'uiReady', payload: {} });
        }

        this.initialized = true;
        OmegaLog.info("APP", "App Readiness Achieved.");
    }

    private setupEventListeners() {
        if ((window as any).runtimeStore) {
            (window as any).runtimeStore.subscribe((type: any) => {
                const snapshot = (window as any).runtimeStore.getSnapshot();
                
                if (type & 8 /* System */) {
                    this.ui.updateLCD(snapshot.systemInfo.lcdText, false);
                    this.ui.updateVersion(snapshot.systemInfo.version, snapshot.systemInfo.build);
                }

                if (type & 4 /* Telemetry */) {
                    const payload = snapshot.telemetry;
                    if (payload['activity']) {
                        const active = payload['activity'].v > 0.01;
                        document.querySelectorAll('.led[data-source="activity"]').forEach(led => {
                            led.classList.toggle('active', active);
                        });
                    }
                }
            });
        }
    }

    public handleMenuAction(action: string) {
        switch (action) {
            case 'clear_rack':
                if (window.confirm("WARNING: This will clear the entire modular rack. Are you sure?")) {
                    window.rpcCommandDispatcher.dispatch({ type: 'newPreset', payload: {} });
                }
                break;
            case 'exit':
                window.rpcCommandDispatcher.dispatch({ type: 'exit', payload: {} });
                break;
            case 'toggle_preferences_modal':
                this.ui.showModal('preferences-modal');
                if ((window as any).Preferences) (window as any).Preferences.init();
                break;
            case 'toggle_presets_modal':
                this.ui.showModal('presets-modal');
                break;
            case 'toggle_console':
                const c = document.getElementById('debug-console');
                if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
                break;
            case 'toggle_matrix':
                if ((window as any).patchbayHub) {
                    (window as any).patchbayHub.toggleWorkspace(true);
                } else {
                    this.ui.showModal('modulation-modal');
                }
                break;
            case 'toggle_module_browser':
                if ((window as any).moduleBrowser) {
                    (window as any).moduleBrowser.open();
                } else {
                    this.ui.showModal('module-browser-modal');
                }
                break;
            case 'about':
                if (window.rpcCommandDispatcher) {
                    window.rpcCommandDispatcher.dispatch({ type: 'getMetadata', payload: {} }).then((res: any) => {
                        if (res) this.ui.updateVersion(res.version, res.build);
                    });
                }
                this.ui.showModal('about-modal');
                break;
            case 'save_preset':
                window.rpcCommandDispatcher.dispatch({ type: 'savePreset', payload: {} });
                break;
            default:
                window.rpcCommandDispatcher.dispatch({ type: 'systemAction', payload: { target: action } });
                break;
        }
    }
}

export const app = new OmegaApp();
