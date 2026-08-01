/**
 * OMEGA Era 7.2.3 - Render Templates
 * Pure HTML string builders for module rendering. No DOM access.
 */
import { CellRenderer } from '../../omega-ui-core/renderers/CellRenderer.js';
import { TYPOGRAPHY_CATEGORIES } from '../../omega-ui-core/typography/registry.js';
import { AssetResolver } from '../Util/AssetResolver.js';

export function resolveContainerWidth(w: string | number, rackWidth: number): number {
    if (typeof w === 'number') return w;
    switch (w) {
        case 'full': return rackWidth;
        case '1/2': return rackWidth * 0.5;
        default: return parseFloat(w) || rackWidth;
    }
}

export function shouldRenderInTab(item: any, activeTab: string, descriptor: any): boolean {
    const currentTab = activeTab || 'MAIN';
    const containerId = item.presentation?.container || item.presentation?.group;
    if (containerId) {
        const container = descriptor.ui?.layout?.containers?.find((c: any) => c.id === containerId);
        if (container && container.tab) return container.tab === currentTab;
    }
    return (item.presentation?.tab || 'MAIN') === currentTab;
}

export function renderItemHTML(item: any, descriptor: any, values: Record<string, number>, scale: number): string {
    const id = item.bind || item.paramId || item.source || item.portId;
    const val = values[id] ?? 0;

    const x = (item.pos?.x || 0) * scale;
    const y = (item.pos?.y || 0) * scale;

    const html = CellRenderer.renderCellHTML(item, {
        skin: descriptor.ui?.skin || 'industrial',
        zoom: scale,
        runtimeValue: val,
        steps: item.steps || 100,
        isSelected: false,
        isLiveMode: true,
        manifest: descriptor as any,
        resolveAsset: (ref: string | undefined) => AssetResolver.resolve(descriptor.id, ref)
    });

    const compHeight = item.presentation?.height ?? 1.0;

    return `
        <div class="cell-anchor" style="position: absolute; left: ${x}px; top: ${y}px; --omega-height: ${compHeight}">
            ${html}
        </div>
    `;
}

export function renderContainersHTML(descriptor: any, activeTab: string, scale: number): string {
    const layout = descriptor.ui?.layout;
    if (!layout || !layout.containers) return '';

    const rackWidth = (descriptor.ui?.dimensions?.width || 120);
    const currentTab = activeTab || 'MAIN';
    const skin = descriptor.ui?.skin || 'industrial';

    const activeContainers = layout.containers.filter((c: any) => !c.tab || c.tab === currentTab);
    const sorted = [...activeContainers].sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0));

    return sorted.map((c: any) => {
        const x = c.pos.x * scale;
        const y = c.pos.y * scale;
        const w = resolveContainerWidth(c.size.w, rackWidth) * scale;
        const h = c.size.h * scale;
        const variant = c.variant || 'default';

        const labelConfig = TYPOGRAPHY_CATEGORIES.find(cat => cat.id === 'labels');
        const defaultSize = labelConfig?.defaultSize || 8;
        const labelSize = (c.labelFontSize || defaultSize) * scale;
        const labelFont = labelConfig?.defaultFont || 'Inter';

        const style = `left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; z-index: ${c.zIndex || 0};`;
        const labelStyle = `font-family: '${labelFont}'; font-size: ${labelSize}px;`;

        return `
            <div class="layout-container container-${skin} variant-${variant}" style="${style}" data-container-id="${c.id}">
                ${c.label ? `<div class="container-label-pill" style="${labelStyle}">${c.label}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Builds the complete module panel HTML: screws, tabs, background containers and controls layer.
 */
export function buildPanelHTML(descriptor: any, activeTab: string, values: Record<string, number>, scale: number): string {
    const skin = descriptor.ui?.skin || 'industrial';
    const w = (descriptor.ui?.dimensions?.width || 120) * scale;
    const h = (descriptor.ui?.dimensions?.height || 420) * scale;

    // [Era 7.2.3] Atmospheric Shadow Physics
    const lighting = descriptor.ui?.lighting;
    const lightAngle = lighting?.shadowAngle ?? 135;
    const lightDist = lighting?.distance ?? 4;
    const lightBlur = lighting?.blur ?? 4;
    const lightColor = lighting?.shadowColor || 'rgba(0,0,0,0.5)';

    const angleRad = (lightAngle * Math.PI) / 180;
    const shadowX = Math.cos(angleRad) * lightDist;
    const shadowY = Math.sin(angleRad) * lightDist;

    const shadowVars = `
        --omega-shadow-angle: ${lightAngle}deg;
        --omega-shadow-x: ${shadowX.toFixed(2)}px;
        --omega-shadow-y: ${shadowY.toFixed(2)}px;
        --omega-shadow-blur: ${lightBlur}px;
        --omega-shadow-color: ${lightColor};
    `.trim();

    // [Era 7.2.3] Aesthetic DNA (Baking Override)
    let aestheticVars = '';
    if (descriptor.ui?.colors) {
        Object.entries(descriptor.ui.colors).forEach(([key, val]) => {
            aestheticVars += `--omega-${key}: ${val}; `;
        });
    }
    if (descriptor.ui?.typography) {
        Object.entries(descriptor.ui.typography).forEach(([key, val]) => {
            aestheticVars += `--omega-${key}: ${val}; `;
        });
    }

    // Faceplate Resolution
    const faceplate = descriptor.ui?.faceplate
        ? `background-image: url('${AssetResolver.resolve(descriptor.id, descriptor.ui.faceplate)}'); background-size: cover;`
        : '';

    const allItems = [...(descriptor.ui?.controls || []), ...(descriptor.ui?.jacks || [])];
    const tabs = [...new Set(allItems.map(i => i.presentation?.tab || 'MAIN'))].sort();

    return `
        <div class="module-panel skin-${skin}" style="width: ${w}px; height: ${h}px; ${shadowVars} ${aestheticVars} ${faceplate}">
            <!-- Industrial Screws -->
            <div class="module-screw top-left"></div>
            <div class="module-screw top-right"></div>
            <div class="module-screw bottom-left"></div>
            <div class="module-screw bottom-right"></div>

            ${tabs.length > 1 ? `
            <div class="module-tabs">
                ${tabs.map(t => {
                    const isActive = activeTab === t;
                    return `<button class="tab-btn ${isActive ? 'active' : ''}" data-tab="${t}">${t}</button>`;
                }).join('')}
            </div>
            ` : ''}

            <div class="module-canvas">
                <div class="layer layer-background">${renderContainersHTML(descriptor, activeTab, scale)}</div>
                <div class="layer layer-controls">
                    ${allItems
                        .filter(item => shouldRenderInTab(item, activeTab, descriptor))
                        .map(item => renderItemHTML(item, descriptor, values, scale))
                        .join('')}
                </div>
            </div>
        </div>
    `;
}
