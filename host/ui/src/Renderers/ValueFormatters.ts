/**
 * OMEGA Era 7.2.3 - Value Formatters
 * Pure formatting helpers for runtime values, labels and signal colors.
 */

/**
 * Resolves a registry entity from the global catalog.
 */
export function getRegistryEntity(id: string): any {
    return (window as any).omegaCatalog?.[id];
}

export function getFormattedValue(att: any, entity: any, val: number): string {
    const precision = att?.ui_precision ?? 2;
    if (!entity) return val.toFixed(precision);
    if (entity.options) {
        const opt = entity.options.find((o: any) => o.value === val);
        if (opt) return opt.label;
    }
    return val.toFixed(precision);
}

export function getEntityValueLabel(entity: any, value: number): string {
    if (!entity || !entity.options) return value.toFixed(2);
    const currentIndex = Math.floor(value * entity.options.length);
    return entity.options[currentIndex]?.label || value.toFixed(2);
}
