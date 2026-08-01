/**
 * OMEGA Inventory Store (Era 6)
 * Flat catalog of all available module types (components).
 */

import { BaseStore } from './runtimeStores.js';

export interface InventoryItem {
    id: string;
    name: string;
    description?: string;
    category: string;
    hp: number;
}

export class InventoryStore extends BaseStore {
    private items: Map<string, InventoryItem> = new Map();
    private isLoaded: boolean = false;
    private loadPromise: Promise<boolean> | null = null;

    async ensureLoaded(): Promise<boolean> {
        console.log("[InventoryStore] ensureLoaded called. isLoaded:", this.isLoaded);
        if (this.isLoaded) return true;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            console.log("[InventoryStore] Starting fetch via RPC...");
            try {
                const rpc = (window as any).omegaRPC;
                if (!rpc) {
                    console.error("[InventoryStore] RPC Bridge NOT FOUND!");
                    return false;
                }

                console.log("[InventoryStore] Sending 'getInventory' command...");
                const response = await rpc.send("getInventory", {});
                console.log("[InventoryStore] RAW RESPONSE:", response);
                
                // Era 6.3 Standard: Data is in 'payload', and inventory wraps it in 'components'
                const rawData = response.payload || response;
                const components = rawData.components || rawData.items || (Array.isArray(rawData) ? rawData : null);
                
                if (components && Array.isArray(components) && components.length > 0) {
                    console.log(`[InventoryStore] Success. Loaded ${components.length} components.`);
                    this.items.clear();
                    components.forEach((item: InventoryItem) => {
                        this.items.set(item.id, item);
                    });
                    this.isLoaded = true;
                    this.notify();
                    return true;
                } else {
                    console.warn("[InventoryStore] RPC returned no components. Falling back to Web Standalone Module Registry.");
                    this.populateWebFallbackCatalog();
                    this.isLoaded = true;
                    this.notify();
                    return true;
                }
            } catch (e) {
                console.error("[InventoryStore] Load error, using Web Standalone Catalog:", e);
                this.populateWebFallbackCatalog();
                this.isLoaded = true;
                this.notify();
                return true;
            } finally {
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    private populateWebFallbackCatalog() {
        const fallbackItems: (InventoryItem & { family?: string })[] = [
            { id: 'midi_in', name: 'GLOBAL MIDI INPUT', category: 'IO', family: 'IO', hp: 4, description: 'Entrada global de eventos MIDI y telemetría LED.' },
            { id: 'midi_trigger', name: 'MIDI TRIGGER & GATE CONVERTER', category: 'IO', family: 'IO', hp: 6, description: 'Conversor de notas MIDI a impulsos Trigger y señales Gate de 10V.' },
            { id: 'omega_lab_monitor', name: 'OMEGA LAB TELEMETRY MONITOR', category: 'UTILITY', family: 'UTILITY', hp: 8, description: 'Osciloscopio y monitor de telemetría de señales CV/Audio en tiempo real.' },
            { id: 'test_parity', name: '00-TEST-PARITY', category: 'UTILITY', family: 'UTILITY', hp: 24, description: 'Manifiesto de referencia para pruebas de paridad visual Era 7.' },
            { id: 'oscillator_vA', name: 'VIRTUAL ANALOG OSCILLATOR', category: 'OSC', family: 'OSC', hp: 8, description: 'Oscilador analógico virtual multi-onda (Sine, Saw, Pulse, Triangle).' },
            { id: 'filter_vA', name: 'VIRTUAL ANALOG LADDER FILTER', category: 'FLT', family: 'FLT', hp: 6, description: 'Filtro resonante de escalera transistorizada de 24dB/octava.' },
            { id: 'envelope_adsr', name: 'ADSR ENVELOPE GENERATOR', category: 'ENV', family: 'ENV', hp: 4, description: 'Generador de envolvente cuádruple Attack, Decay, Sustain, Release.' },
            { id: 'vca', name: 'DUAL LINEAR VCA', category: 'AMP', family: 'AMP', hp: 6, description: 'Amplificador controlado por voltaje lineal duplo para audio y CV.' },
            { id: 'lfo', name: 'MULTI-WAVE LFO', category: 'MOD', family: 'MOD', hp: 6, description: 'Oscilador de baja frecuencia multifunción con reset de fase.' }
        ];

        this.items.clear();
        fallbackItems.forEach(item => {
            this.items.set(item.id, item as InventoryItem);
        });
    }

    getItem(id: string): InventoryItem | undefined {
        return this.items.get(id);
    }

    getAllItems(): InventoryItem[] {
        return Array.from(this.items.values());
    }
}

// Global instance
(window as any).inventoryStore = new InventoryStore();
