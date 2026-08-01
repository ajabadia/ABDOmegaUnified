/**
 * OMEGA Schema Store (Era 6)
 * Authoritative registry of module contracts.
 */

export interface ModuleSchema {
    id: string;
    name: string;
    version: any;
    metadata?: any;
    ui?: any;
    layout?: {
        hp: number;
        columns: number;
        gap?: number;
    };
    items?: any[];
    registry?: any[];
    theme?: string;
    rack?: string;
    tags?: string[];
    ui_class?: string;
}

export class SchemaStore {
    private schemas: Map<string, ModuleSchema> = new Map();
    private isLoaded: boolean = false;

    async ensureLoaded(): Promise<boolean> {
        if (this.isLoaded) return true;
        return this.reload();
    }

    async reload(): Promise<boolean> {
        try {
            const rpc = window.omegaRPC;
            if (!rpc) return false;
            
            const response = await rpc.send("getUiSchemas", {});
            console.log("[SchemaStore] RAW RESPONSE:", response);

            const rawData = response.payload || response;
            const schemas = rawData.schemas || (Array.isArray(rawData) ? rawData : null);

            if (schemas && Array.isArray(schemas)) {
                schemas.forEach((s: any) => {
                    this.schemas.set(s.id, this.normalizeSchema(s));
                });
                this.isLoaded = true;
                console.log(`[SchemaStore] Success. Loaded ${schemas.length} schemas.`);
                return true;
            }
        } catch (e) {
            console.error("[SchemaStore] Load error:", e);
        }
        return false;
    }

    private normalizeSchema(schema: any): ModuleSchema {
        if (!schema) return schema;

        // --- ERA 7 INDUSTRIAL DETECTION ---
        const isEra7 = schema.version >= 7 || schema.ui !== undefined;

        if (isEra7) {
            console.log(`[SchemaStore] Detected Era 7 Module: ${schema.id}. Preserving industrial integrity.`);
            
            // Industrial Integrity Check (Governance)
            this.validateIntegrity(schema);

            // Sync legacy fields for components that still expect them
            if (schema.metadata) {
                schema.name = schema.name || schema.metadata.name;
                schema.hp = schema.hp || schema.metadata.rack?.hp;
                schema.rack = schema.rack || schema.metadata.rack?.slot;
            }
            return schema as ModuleSchema;
        }

        // ... (rest of legacy normalization)
        return schema as ModuleSchema;
    }

    private validateIntegrity(schema: any) {
        if (!schema.compliance) {
            schema.compliance = { status: "ok", issues: [], firmwareHash: "" };
        }

        const ids = new Set<string>();
        const duplicates = new Set<string>();

        // 1. Check Registry Integrity
        if (schema.registry && Array.isArray(schema.registry)) {
            schema.registry.forEach((item: any) => {
                if (ids.has(item.id)) {
                    duplicates.add(item.id);
                }
                ids.add(item.id);
            });
        }

        // 2. Check UI Controls Integrity (should not collide with registry or other controls)
        if (schema.ui && schema.ui.controls) {
            schema.ui.controls.forEach((ctrl: any) => {
                // If a control has an ID that is not its bind, check it? 
                // Usually bind is what matters for identity
            });
        }

        if (duplicates.size > 0) {
            schema.compliance.status = "invalid";
            duplicates.forEach(id => {
                const issue = {
                    severity: "invalid",
                    code: "DoubleIdentity",
                    scope: "registry",
                    message: `ID collision detected: '${id}' is defined multiple times in the registry. Each entity must have a unique canonical ID.`
                };
                schema.compliance.issues.push(issue);
                console.error(`[GOVERNANCE] [${schema.id}] ${issue.message}`);
            });
        }
    }

    getSchema(id: string): ModuleSchema | undefined {
        return this.schemas.get(id);
    }

    getSchemaForComponent(id: string): ModuleSchema | undefined {
        return this.getSchema(id);
    }

    getAllSchemas(): ModuleSchema[] {
        return Array.from(this.schemas.values());
    }
}

// Global instance
window.schemaStore = new SchemaStore();
