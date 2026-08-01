import { OmegaLog } from '../RPC/omega_log.js';

/**
 * OMEGA Era 7.2.3 - Control Binder
 * Specialized logic for mapping DOM interactions to RPC parameters.
 */
export class ControlBinder {
    private renderer: any;
    private values: Record<string, number>;

    constructor(renderer: any, currentValues: Record<string, number>) {
        this.renderer = renderer;
        this.values = currentValues;
    }

    /**
     * Binds all interactive elements within a container.
     */
    public bindContainer(container: HTMLElement, controls: any[]): void {
        controls.forEach(item => {
            const id = item.bind || item.paramId || item.source || item.portId;
            const entity = id ? this.renderer.getRegistryEntity(id) : null;
            if (!entity) return;

            const cell = container.querySelector(`[data-id="${id}"]`) as HTMLElement;
            if (!cell) return;

            // 1. Knob Binding
            const knob = cell.querySelector('.knob-container') as HTMLElement;
            if (knob) this.bindKnob(knob, entity);

            // 2. Slider Binding
            const slider = cell.querySelector('.slider-wrapper') as HTMLElement;
            if (slider) this.bindSlider(slider, entity);

            // 3. Steppers / Display Buttons
            const steppers = cell.querySelectorAll('.stepper-btn, .display-btn');
            steppers.forEach(btn => this.bindStepper(btn as HTMLElement, id, entity));

            // 4. Select / Dropdown logic
            const sel = cell.querySelector('.industrial-select-wrapper');
            if (sel) this.bindSelect(sel as HTMLElement, id, entity);
        });
    }

    private bindKnob(knob: HTMLElement, entity: any): void {
        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        const range = entity.range || { min: 0, max: 1, default: 0 };

        knob.addEventListener('pointerdown', (e: PointerEvent) => {
            isDragging = true;
            startY = e.clientY;
            startVal = this.values[entity.id] ?? range.default ?? 0;
            knob.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        knob.addEventListener('pointermove', (e: PointerEvent) => {
            if (!isDragging) return;
            const delta = (startY - e.clientY) / 150; // Sensitivity constant
            let next = startVal + delta * (range.max - range.min);
            next = Math.max(range.min, Math.min(range.max, next));
            this.renderer.setParam(entity.id, next);
        });

        const onUp = (e: PointerEvent) => { 
            if (isDragging) {
                isDragging = false;
                knob.releasePointerCapture(e.pointerId);
            }
        };
        knob.addEventListener('pointerup', onUp);
        knob.addEventListener('pointercancel', onUp);
    }

    private bindSlider(slider: HTMLElement, entity: any): void {
        let isDragging = false;

        slider.addEventListener('pointerdown', (e: PointerEvent) => {
            isDragging = true;
            slider.setPointerCapture(e.pointerId);
            this.handleSliderMove(e, slider, entity);
            e.preventDefault();
        });

        slider.addEventListener('pointermove', (e: PointerEvent) => {
            if (!isDragging) return;
            this.handleSliderMove(e, slider, entity);
        });

        const onUp = (e: PointerEvent) => { 
            if (isDragging) {
                isDragging = false;
                slider.releasePointerCapture(e.pointerId);
            }
        };
        slider.addEventListener('pointerup', onUp);
        slider.addEventListener('pointercancel', onUp);
    }

    private handleSliderMove(e: PointerEvent, slider: HTMLElement, entity: any): void {
        const rect = slider.getBoundingClientRect();
        const isHoriz = slider.classList.contains('slider-h');
        const range = entity.range || { min: 0, max: 1 };
        
        let norm = isHoriz 
            ? (e.clientX - rect.left) / rect.width 
            : 1 - (e.clientY - rect.top) / rect.height;
        
        norm = Math.max(0, Math.min(1, norm));
        const next = range.min + norm * (range.max - range.min);
        this.renderer.setParam(entity.id, next);
    }

    private bindStepper(btn: HTMLElement, id: string, entity: any): void {
        btn.addEventListener('click', (e: Event) => {
            const targetId = (e.target as HTMLElement).dataset.bind || id;
            const dir = parseInt((e.target as HTMLElement).dataset.dir || "0");
            const targetEntity = this.renderer.getRegistryEntity(targetId as string);
            if (targetEntity) {
                const range = targetEntity.range || { min: 0, max: 1, step: 1 };
                const current = this.values[targetId as string] ?? (range as any).default ?? 0;
                const stepVal = range.step || 0.01;
                let next = current + (dir * stepVal);
                next = Math.max(range.min, Math.min(range.max, next));
                this.renderer.setParam(targetId as string, next);
            }
        });
    }

    private bindSelect(sel: HTMLElement, id: string, entity: any): void {
        sel.addEventListener('click', () => {
            const options = entity.options || [];
            if (options.length === 0) return;
            const currentVal = this.values[id as string] || 0;
            const currentIndex = Math.floor(currentVal * options.length);
            const nextIndex = (currentIndex + 1) % options.length;
            this.renderer.setParam(id as string, nextIndex / options.length);
        });
    }
}
