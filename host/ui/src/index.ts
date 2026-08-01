/**
 * OMEGA Synthesizer - Main Entry Point (TypeScript)
 * Era 7.2.3 - Absolute Aseptic Boot
 */

import { OmegaLog } from './RPC/omega_log.js';
import { rpc } from './RPC/omega_rpc.js';
import { ModuleManager } from './Logic/module_manager.js';
import { app } from './Logic/script.js';
import { Preferences } from './Logic/preferences.js';
import { ServiceMode } from './Logic/service.js';
import { PresetBrowser } from './Components/PresetBrowser.js';
import { ModuleRenderer } from './Renderers/ModuleRenderer.js';
import { ManifestRenderer } from './Renderers/ManifestRenderer.js';
import { ModulePatchbayMatrix } from './Components/ModulePatchbayMatrix.js';
import { ModulePatchModal } from './Components/ModulePatchModal.js';
import { ModuleBrowser } from './Components/ModuleBrowser.js';
import { InventoryStore } from './Logic/InventoryStore.js';
import { RpcCommandDispatcher } from './RPC/RpcCommandDispatcher.js';
import { RuntimeStore, GraphStore, SessionStore } from './Logic/runtimeStores.js';
import { SchemaStore } from './Logic/SchemaStore.js';
import { ModuleRegistry } from './Logic/ModuleRegistry.js';
import { RuntimeEventHub } from './Util/RuntimeEventHub.js';
import { PatchCableManager } from './Components/cables/PatchCableManager.js';
import { CableRenderer } from './Components/cables/CableRenderer.js';
import {
    setGlobalTension,
    getGlobalTension,
} from './Components/cables/cableConstants.js';
import { ACEMM_CATALOG, getOrFetchManifest } from './Catalog/AcemmCatalog.js';

// Bridge to window for legacy component compatibility (limited)
const win = window as any;

// Global Singleton Initialization
const runtimeStore = win.runtimeStore || new RuntimeStore();
const schemaStore = win.schemaStore || new SchemaStore();
const graphStore = win.graphStore || new GraphStore();
const sessionStore = win.sessionStore || new SessionStore();
const inventoryStore = win.inventoryStore || new InventoryStore();
const rpcCommandDispatcher = win.rpcCommandDispatcher || new RpcCommandDispatcher();

// 1. Ensure stores are anchored in window BEFORE manager instantiation
win.runtimeStore = runtimeStore;
win.schemaStore = schemaStore;
win.graphStore = graphStore;
win.sessionStore = sessionStore;
win.inventoryStore = inventoryStore;
win.rpcCommandDispatcher = rpcCommandDispatcher;
win.omegaRPC = rpc;
win.OmegaLog = OmegaLog;

// 2. Now instantiate manager (Force new instance for Era 7)
const manager = new ModuleManager();
win.moduleManager = manager;

ModuleRegistry.register("ModuleRenderer", ModuleRenderer);
ModuleRegistry.register("ModulePatchbayMatrix", ModulePatchbayMatrix);
ModuleRegistry.register("ModuleBrowser", ModuleBrowser);

win.Preferences = Preferences;
win.ServiceMode = ServiceMode;
win.ModuleRenderer = ModuleRenderer;
win.ManifestRenderer = ManifestRenderer;
win.getOrFetchManifest = getOrFetchManifest;
win.ACEMM_CATALOG = ACEMM_CATALOG;

// 4. Global Aseptic Hub - Unified Era 7 Pipeline (CRITICAL: MUST BOOT FIRST)

// Initialize System
document.addEventListener('DOMContentLoaded', () => {
    // [Era 7] Idempotency Shield
    if ((window as any).__omegaBooted) {
        OmegaLog.warn('BOOT', "Bootstrap ABORTED: System already booted.");
        return;
    }
    (window as any).__omegaBooted = true;

    // 1. Start listening to the bridge IMMEDIATELY
    RuntimeEventHub.init();

    // [Diagnostic] Dump window keys related to JUCE/OMEGA
    const juceKeys = Object.keys(window).filter(k => k.toLowerCase().includes("juce") || k.toLowerCase().includes("omega"));
    OmegaLog.debug('DIAG', "Window Bridge Keys:", juceKeys);
    if ((window as any).__JUCE__) {
        const j = (window as any).__JUCE__;
        OmegaLog.debug('DIAG', "__JUCE__ keys:", Object.keys(j));
        if (j.backend) OmegaLog.debug('DIAG', "__JUCE__.backend keys:", Object.keys(j.backend));
    }
    if ((window as any).juce) OmegaLog.debug('DIAG', "juce found:", Object.keys((window as any).juce));

    // 2. Immediate Shell Initialization
    const buildId = (window as any).OMEGA_BUILD_ID || "DEV";
    OmegaLog.info('BOOT', `Booting Era 7 Aseptic UI [BUILD #${buildId}]`);
    
    // Setup Components (Non-blocking)
    try {
        Preferences.init();
        PresetBrowser.init();
        
        const matrixHub = new ModulePatchbayMatrix();
        win.patchbayHub = matrixHub;

        const configModal = new ModulePatchModal();
        win.modulePatchModal = configModal;

        // Patch Cable System (overlay decorativo; no-bloqueante).
        // Fase 1: registra jacks + resolutor de señales. Fase 2: CableRenderer.
        const cableManager = new PatchCableManager();
        cableManager.init();
        win.patchCableManager = cableManager;
        win.CableRenderer = CableRenderer;

        // Cable tension (§9): slider global del top-menu → tensión del sag.
        const tensionSlider = document.getElementById('cable-tension') as HTMLInputElement | null;
        if (tensionSlider) {
            tensionSlider.oninput = () => {
                const t = (parseFloat(tensionSlider.value) || 0) / 100;
                win.patchCableManager?.applyGlobalTension(t);
            };
        }
        // Exponer el estado en consola para verificación manual.
        win.setGlobalCableTension = setGlobalTension;
        win.getGlobalCableTension = getGlobalTension;

        const bind = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        const showModal = (id: string) => {
            const m = document.getElementById(id);
            if (m) m.style.display = 'flex';
        };

        // 4. Global Action Dispatcher (Unified Era 7.2.3)
        const handleAction = async (action: string, id?: string | null) => {
            OmegaLog.debug('UI', `Executing Action: ${action} [ID: ${id || 'none'}]`);
            
            switch (action) {
                case 'toggle_matrix':
                    matrixHub.toggleWorkspace(true);
                    break;
                case 'toggle_preferences_modal':
                    await Preferences.init();
                    showModal('preferences-modal');
                    break;
                case 'toggle_presets_modal':
                    if (win.presetBrowser) {
                        await win.presetBrowser.refresh();
                    }
                    showModal('presets-modal');
                    break;
                case 'toggle_module_browser':
                    if (!win.activePresetName) {
                        const createFirst = confirm("Aún no has creado ningún Preset.\n\n¿Deseas crear un nuevo Preset ahora antes de añadir módulos?");
                        if (createFirst) {
                            await handleAction("new_preset");
                        }
                    }
                    if (win.moduleBrowser) {
                        await win.moduleBrowser.open();
                    } else {
                        showModal('module-browser-modal');
                    }
                    break;
                case 'about':
                    showModal('about-modal');
                    break;
                case 'toggle_console':
                    const consoleEl = document.getElementById('debug-console');
                    if (consoleEl) consoleEl.style.display = consoleEl.style.display === 'none' ? 'block' : 'none';
                    break;
                case 'clear_rack':
                    if (confirm("¿Vaciar el rack de módulos e inicializar?")) {
                        const upper = document.getElementById('upper-rack');
                        const lower = document.getElementById('lower-rack');
                        if (upper) upper.querySelectorAll('.module, .aseptic-module-panel').forEach(el => el.remove());
                        if (lower) lower.querySelectorAll('.module, .aseptic-module-panel').forEach(el => el.remove());
                        const lcd = document.getElementById('lcd-text');
                        if (lcd) lcd.textContent = "INIT PATCH";
                    }
                    break;
                case 'new_preset':
                case 'save_preset':
                    const defaultName = win.activePresetName || "NUEVO PARCHE SINTETIZADOR";
                    const presetNameInput = prompt(`Introduce el nombre para el ${action === 'new_preset' ? 'Nuevo Preset' : 'Preset'}:`, defaultName);
                    if (presetNameInput && presetNameInput.trim().length > 0) {
                        const nameClean = presetNameInput.trim();
                        win.activePresetName = nameClean;
                        const lcd = document.getElementById('lcd-text');
                        if (lcd) lcd.textContent = nameClean.toUpperCase();
                        if (action === 'new_preset') {
                            const upper = document.getElementById('upper-rack');
                            const lower = document.getElementById('lower-rack');
                            if (upper) upper.querySelectorAll('.module, .aseptic-module-panel').forEach(el => el.remove());
                            if (lower) lower.querySelectorAll('.module, .aseptic-module-panel').forEach(el => el.remove());
                        }
                        if (win.presetBrowser) {
                            win.presetBrowser.saveUserPreset(nameClean);
                        }
                        OmegaLog.info("PRESET", `Preset '${nameClean}' guardado y activado.`);
                        alert(`¡Preset '${nameClean}' listo!\n\nAhora puedes usar 'Add Module...' en el menú EDIT para agregar módulos al rack.`);
                    }
                    const rpcCmd = action === "new_preset" ? "newPreset" : action === "save_preset" ? "savePreset" : action;
                    try { rpcCommandDispatcher.dispatch({ type: rpcCmd } as any); } catch (e) {}
                    break;
                case 'undo':
                case 'redo':
                case 'exit':
                    rpcCommandDispatcher.dispatch({ type: action } as any);
                    break;
                case 'step-up':
                case 'step-down':
                    if (id && win.moduleManager) {
                        const step = action === 'step-up' ? 1 : -1;
                        win.moduleManager.stepParameter(id, step);
                    }
                    break;
                default:
                    OmegaLog.warn('UI', `Unknown action requested: ${action}`);
            }
        };

        // Bind special IDs (for specific buttons that don't use data-action yet)
        bind('btn-global-matrix', () => handleAction('toggle_matrix'));

        // Centralized Click Delegation
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const action = target.getAttribute('data-action');
            if (action) {
                const id = target.getAttribute('data-id') || target.closest('[data-source]')?.getAttribute('data-source');
                handleAction(action, id);
            }
        });

        const moduleBrowser = new ModuleBrowser();
        win.moduleBrowser = moduleBrowser;

        document.addEventListener('patch-request', ((e: Event) => {
            const detail = (e as CustomEvent).detail;
            const { type, instanceId, componentId } = detail;

            if (type === 'add_module') {
                rpcCommandDispatcher.dispatch({
                    type: 'addModule',
                    payload: { componentId }
                } as any);
                return;
            }

            const schema = schemaStore.getSchema(componentId);
            configModal.open(instanceId, schema);
        }) as EventListener);

    } catch (e) {
        OmegaLog.error('BOOT', "Component shell init failed:", e);
    }

    // Force Rack Visibility & Dismiss Splash Screen (Web Standalone & JUCE) immediately
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(() => { splash.style.display = 'none'; }, 600);
    }

    const rack = document.getElementById('omega-rack');
    if (rack) {
        rack.style.opacity = '1';
        rack.style.pointerEvents = 'auto';
        rack.style.display = 'flex';
        rack.classList.add('visible');
        OmegaLog.info('BOOT', "Rack visibility forced & splash dismissed.");
    }

    // 5. Background Data Loading (Fires without blocking the UI)
    const backgroundLoad = async () => {
        try {
            OmegaLog.info('BOOT', "Background data load started...");
            
            // Wait for Handshake
            const ready = await rpc.ensureReady(3000);
            if (!ready) {
                OmegaLog.warn('BOOT', "Handshake delayed. Continuing background load...");
            }

            // Load static registries
            await Promise.all([
                schemaStore.ensureLoaded(),
                inventoryStore.ensureLoaded()
            ]);
            
            OmegaLog.info('BOOT', "Stores loaded. Bootstrapping Registry...");
            await ModuleRegistry.bootstrap();
            
            OmegaLog.info('BOOT', "Background initialization COMPLETED.");
        } catch (e) {
            OmegaLog.error('BOOT', "Background boot failure:", e);
        }
    };

    backgroundLoad();
});
