import { OmegaLog } from '../RPC/omega_log.js';

export interface ModuleDescriptor {
    id: string;
    name: string;
    family: string;
    isInstantiable: boolean;
    hasInventory: boolean;
    hasSchema: boolean;
    manifest?: any;
    schema?: any;
}

export class ModuleRegistry {
    private static catalog: Map<string, ModuleDescriptor> = new Map();
    private static constructors: Map<string, any> = new Map();

    static register(id: string, constructor: any) {
        this.constructors.set(id, constructor);
        OmegaLog.info("REGISTRY", `Registered Constructor: ${id}`);
    }

    static getConstructor(id: string): any {
        return this.constructors.get(id);
    }

    static async bootstrap() {
        OmegaLog.info("REGISTRY", "Building Unified Era 7 Catalog...");
        
        const win = window as any;
        const inventoryStore = win.inventoryStore;
        const schemaStore = win.schemaStore;

        if (!inventoryStore) {
            OmegaLog.error("REGISTRY", "InventoryStore NOT FOUND during bootstrap");
            return;
        }
        
        const inventory = inventoryStore.getAllItems?.() || [];
        OmegaLog.info("REGISTRY", `Probing ${inventory.length} inventory items...`);

        this.catalog.clear();

        // 1. Map all inventory items
        inventory.forEach((item: any) => {
            if (!item || !item.id) return;
            this.catalog.set(item.id, {
                id: item.id,
                name: item.name || item.id,
                family: item.family || 'utility',
                hasInventory: true,
                hasSchema: false,
                isInstantiable: false
            });
        });

        // 2. Overlay schemas
        if (schemaStore) {
            this.catalog.forEach((entry, id) => {
                const schema = schemaStore.getSchema?.(id);
                if (schema) {
                    entry.hasSchema = true;
                    entry.schema = schema;
                    entry.isInstantiable = entry.hasInventory && entry.hasSchema;
                }
            });
        }

        OmegaLog.info("REGISTRY", `Catalog Ready. ${this.catalog.size} modules found, ${Array.from(this.catalog.values()).filter(m => m.isInstantiable).length} instantiable.`);
    }

    static getModuleDescriptor(id: string): ModuleDescriptor | undefined {
        return this.catalog.get(id);
    }

    static getInstantiableModules(): ModuleDescriptor[] {
        return Array.from(this.catalog.values()).filter(m => m.isInstantiable);
    }
}
