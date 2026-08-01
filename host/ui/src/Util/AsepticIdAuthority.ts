/**
 * OMEGA Era 7 - Aseptic ID Authority
 * Centralized logic for ID generation and mapping.
 */

export class AsepticIdAuthority {
    /**
     * Generates a canonical parameter key for the RuntimeStore.
     * Format: p.[instanceId].[paramId]
     */
    static mkParamKey(instanceId: number, paramId: number): string {
        return `p.${instanceId}.${paramId}`;
    }

    /**
     * Generates a canonical telemetry pin key.
     * Format: t.[instanceId].[sourceId]
     */
    static mkTelemetryKey(instanceId: number, sourceId: string | number): string {
        return `t.${instanceId}.${sourceId}`;
    }

    /**
     * Generates a stable DOM ID for UI components.
     * Format: omega-ui-[role]-[instanceId]-[entityId]
     */
    static mkDomId(role: 'disp' | 'led' | 'knob', instanceId: number, entityId: string | number): string {
        return `omega-ui-${role}-${instanceId}-${entityId}`;
    }

    /**
     * Normalizes an incoming ID (string or number) to a numeric ParamId.
     */
    static normalizeParamId(id: string | number): number {
        if (typeof id === 'number') return id;
        const n = parseInt(id, 10);
        return isNaN(n) ? 0 : n;
    }
}
