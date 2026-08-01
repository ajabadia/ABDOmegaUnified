/**
 * OMEGA Era 7.2.3 - Telemetry Sync
 * Subscription setup and LED/display telemetry updates for rendered modules.
 */

/**
 * Subscribes to telemetry pins (LEDs, ports, displays) for a module descriptor.
 */
export function subscribeToTelemetry(descriptor: any): void {
    const pins: string[] = [];
    const allItems = [...(descriptor.ui?.controls || []), ...(descriptor.ui?.jacks || [])];

    allItems.forEach(item => {
        if (item.presentation?.component === 'led' || item.look === 'led' || item.presentation?.component === 'port') {
            const id = item.source || item.bind || item.id;
            if (id) pins.push(`${descriptor.id}.${id}`);
        }
        item.presentation?.attachments?.forEach((att: any) => {
            if (att.type === 'led' || att.type === 'display') {
                const id = att.bind || item.bind || item.id;
                if (id) pins.push(`${descriptor.id}.${id}`);
            }
        });
    });

    if (pins.length > 0) {
        window.rpcCommandDispatcher.dispatch({
            type: 'subscribeTelemetry',
            payload: { pins: [...new Set(pins)] }
        } as any);
    }
}

/**
 * Applies incoming telemetry values to LED / port-led / display elements.
 */
export function updateTelemetryUI(content: HTMLElement, source: string, value: number): void {
    const targets = content.querySelectorAll(`[data-source="${source}"]`);
    targets.forEach((el: Element) => {
        const t = el as HTMLElement;
        if (t.classList.contains('led') || t.classList.contains('port-led')) {
            const d = parseInt(t.style.width) || 8;
            const baseColor = t.style.backgroundColor;
            t.style.opacity = (0.3 + (value * 0.7)).toString();
            if (value > 0.05) {
                t.style.boxShadow = `0 0 ${d}px ${baseColor}99`;
            } else {
                t.style.boxShadow = 'none';
            }
        }
        if (t.classList.contains('display-value')) {
            t.innerText = value.toFixed(2);
        }
    });
}
