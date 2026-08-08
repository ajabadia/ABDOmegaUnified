/**
 * OMEGA Inventory Store (Era 6)
 * Flat catalog of all available module types (components).
 */

import { BaseStore } from './runtimeStores.js';
import { ACEMM_CATALOG } from '../Catalog/AcemmCatalog.js';

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

    /**
     * Mapea el `family` crudo (canónico en modules/) a una de las categorías
     * que filtra el ModuleBrowser (OSC/FLT/ENV/AMP/MOD/IO/UTILITY).
     */
    private categoryForFamily(family?: string): string {
        const known: Record<string, string> = {
            'osc': 'OSC', 'oscillator': 'OSC', 'vco': 'OSC',
            'flt': 'FLT', 'filter': 'FLT', 'vcf': 'FLT',
            'env': 'ENV', 'envelope': 'ENV', 'adsr': 'ENV',
            'amp': 'AMP', 'vca': 'AMP',
            'mod': 'MOD', 'lfo': 'MOD',
            'io': 'IO', 'midi': 'IO', 'control': 'IO',
            'utility': 'UTILITY',
        };
        const f = (family || '').toLowerCase();
        return known[f] || 'UTILITY';
    }

    /**
     * Catálogo web standalone derivado de ACEMM_CATALOG (fuente única):
     * canónicos desde modules/ (generado en build) + legacy planos. NO es una
     * lista hardcodeada: cualquier módulo nuevo en modules/ aparece aquí solo
     * con regenerar el catálogo.
     */
    private populateWebFallbackCatalog() {
        const items: (InventoryItem & { family?: string })[] = Object.values(ACEMM_CATALOG).map((entry: any) => {
            const family = entry.metadata?.family || entry.family || 'utility';
            return {
                id: entry.id,
                name: entry.metadata?.name || entry.name || entry.id.toUpperCase(),
                description: entry.metadata?.description || entry.description,
                category: this.categoryForFamily(family),
                family: String(family).toUpperCase(),
                hp: Number(entry.metadata?.rack?.hp ?? entry.rack?.hp) || 8,
            };
        });

        this.items.clear();
        items.forEach(item => {
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
