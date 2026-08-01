/**
 * OMEGA Era 7.2.3 - Control UI Updater
 * Applies runtime values to rendered control DOM (knobs, sliders, displays, selects).
 */
import { getRegistryEntity, getFormattedValue, getEntityValueLabel } from './ValueFormatters.js';

export function updateControlUI(content: HTMLElement, descriptor: any, id: string, value: number): void {
    const cell = content.querySelector(`[data-id="${id}"]`) as HTMLElement;
    if (!cell) return;

    const knobMarker = cell.querySelector('.knob-marker') as HTMLElement;
    if (knobMarker) {
        const angle = -135 + (value * 270);
        knobMarker.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    }

    const slider = cell.querySelector('.slider-wrapper') as HTMLElement;
    if (slider) {
        const isHoriz = slider.classList.contains('slider-h');
        const rail = slider.querySelector('.slider-rail-active') as HTMLElement;
        const cap = slider.querySelector('.slider-cap') as HTMLElement;
        if (rail) {
            if (isHoriz) rail.style.width = `calc(${value * 100}% - 4px)`;
            else rail.style.height = `calc(${value * 100}% - 4px)`;
        }
        if (cap) {
            if (isHoriz) cap.style.left = `calc(${value * 90}%)`;
            else cap.style.bottom = `calc(${value * 90}%)`;
        }
    }

    const display = cell.querySelector('.display-value') as HTMLElement;
    if (display) {
        const entity = getRegistryEntity(id);
        display.innerText = getFormattedValue(null, entity, value);
    }

    const selValue = cell.querySelector('.select-value');
    if (selValue) {
        const entity = getRegistryEntity(id);
        selValue.textContent = getEntityValueLabel(entity, value);
    }

    triggerContainerActivity(content, descriptor, id);
}

function triggerContainerActivity(content: HTMLElement, descriptor: any, id: string): void {
    const item = [...(descriptor.ui?.controls || []), ...(descriptor.ui?.jacks || [])]
        .find(i => (i.bind || i.id) === id);
    const containerId = item?.presentation?.container || item?.presentation?.group;
    if (!containerId) return;

    const containerEl = content.querySelector(`[data-container-id="${containerId}"]`) as HTMLElement;
    if (!containerEl) return;

    containerEl.classList.remove('active-pulse');
    void containerEl.offsetWidth;
    containerEl.classList.add('active-pulse');
}
