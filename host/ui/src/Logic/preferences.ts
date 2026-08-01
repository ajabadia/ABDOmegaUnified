/**
 * preferences.ts - OMEGA Premium Preferences Logic (TypeScript Implementation)
 * Era 6 - Managed Dispatch Edition
 */
import { PhysicsEngine } from '../Util/PhysicsEngine.js';

export interface SystemSetting {
    id: string;
    label: string;
    tooltip: string;
    currentValue: number;
    defaultValue: number;
    minValue: number;
    maxValue: number;
    category: string;
    options?: { [key: string]: string };
}

export class OMEGA_Preferences {
    private settings: SystemSetting[] = [];
    private currentCategory: string = 'GENERAL';

    constructor() {
        console.log("[Preferences] Initialized (Aseptic)");
    }

    public async init() {
        await this.refresh();
        this.setupTabs();
        this.render();
    }

    private setupTabs() {
        const tabs = document.querySelectorAll('.pref-tab');
        tabs.forEach(tab => {
            (tab as HTMLElement).onclick = () => {
                const htmlTab = tab as HTMLElement;
                tabs.forEach(t => (t as HTMLElement).classList.remove('active'));
                htmlTab.classList.add('active');
                this.currentCategory = htmlTab.textContent?.trim().toUpperCase() || 'GENERAL';
                this.render();
            };
        });
    }

    public async refresh() {
        try {
            // [Era 6] Request data via hardened RPC
            const rpc = (window as any).omegaRPC;
            if (rpc) {
                const data = await rpc.getSystemSettings();
                this.settings = Array.isArray(data) ? data : [];
                PhysicsEngine.syncFromSettings(this.settings);
            }
        } catch (e) {
            console.error("[Preferences] Refresh failed:", e);
        }
    }

    public render() {
        const container = document.getElementById('preferences-body');
        if (!container) return;
        
        if (this.settings.length === 0) {
            container.innerHTML = `
                <div class="pref-loading">
                    <div class="spinner"></div>
                    <span>Communicating with OMEGA Engine...</span>
                </div>`;
            return;
        }

        // [FIX] Clear previous category content
        container.innerHTML = '';

        const catSettings = this.settings.filter(s => 
            s.category.toUpperCase() === this.currentCategory.toUpperCase()
        );

        if (this.currentCategory === 'PHYSICS') {
            this.renderAtmosphericSimulator(container, catSettings);
            return;
        }

        catSettings.forEach(s => {
            const row = document.createElement('div');
            row.className = 'pref-row';
            
            let controlHtml = '';
            if (s.options) {
                const sortedKeys = Object.keys(s.options).sort((a,b) => parseFloat(a) - parseFloat(b));
                controlHtml = `<select class="pref-select" data-pref-id="${s.id}">
                    ${sortedKeys.map(val => 
                        `<option value="${val}" ${Math.round(s.currentValue) == parseFloat(val) ? 'selected' : ''}>${s.options![val]}</option>`
                    ).join('')}
                </select>`;
            } else {
                controlHtml = `<input type="number" class="pref-input" data-pref-id="${s.id}" value="${s.currentValue}" 
                                min="${s.minValue}" max="${s.maxValue}">`;
            }

            row.innerHTML = `
                <div class="pref-info">
                    <span class="pref-label">${s.label}</span>
                    <span class="pref-tooltip">${s.tooltip}</span>
                </div>
                <div class="pref-control">
                    ${controlHtml}
                    <button class="pref-reset-btn" data-reset-id="${s.id}">RESET</button>
                </div>
            `;
            container.appendChild(row);

            const ctrl = row.querySelector(`[data-pref-id="${s.id}"]`) as HTMLElement;
            ctrl.onchange = (e: Event) => this.update(s.id, (e.target as any).value);
            
            const resetBtn = row.querySelector(`[data-reset-id="${s.id}"]`) as HTMLElement;
            resetBtn.onclick = () => this.reset(s.id);
        });
    }

    private renderAtmosphericSimulator(container: HTMLElement, settings: SystemSetting[]) {
        const getSetting = (id: string) => settings.find(s => s.id === id);
        const angle = getSetting('rackShadowAngle');
        const dist = getSetting('rackShadowDistance');
        const blur = getSetting('rackShadowBlur');

        const currentAngle = angle?.currentValue || 135;
        const angleRad = (currentAngle * Math.PI) / 180;
        
        // Preview Inset Shadow (Fixed distance for visual depth)
        const previewDist = 8;
        const shadowX = Math.cos(angleRad) * previewDist;
        const shadowY = Math.sin(angleRad) * previewDist;

        container.innerHTML = `
            <div class="atmospheric-simulator">
                <div class="simulator-title">ATMOSPHERIC SIMULATOR</div>
                <div class="simulator-preview" style="box-shadow: inset ${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.4);">
                    <div class="simulator-object"></div>
                </div>
                
                <div class="physics-grid">
                    ${this.renderPhysicsSlider(angle, 'deg')}
                    ${this.renderPhysicsSlider(dist, 'px')}
                    ${this.renderPhysicsSlider(blur, 'px')}
                    
                    <div class="pref-slider-group">
                        <div class="pref-slider-header">
                            <label>SHADOW TINGE</label>
                            <span class="val">rgba(0,0,0,0.7)</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <div style="width:24px; height:24px; background:#000; border:1px solid #444; border-radius:2px;"></div>
                            <input type="text" class="pref-input" style="flex:1; background:#111; border:1px solid #444; color:#888; font-family:monospace; font-size:10px; padding:4px 8px;" value="rgba(0,0,0,0.7)" readonly>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind Sliders
        container.querySelectorAll('.pref-slider').forEach(slider => {
            const id = (slider as HTMLElement).dataset.prefId!;
            (slider as HTMLInputElement).oninput = (e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                const valLabel = (e.target as HTMLElement).closest('.pref-slider-group')?.querySelector('.val');
                if (valLabel) valLabel.textContent = `${val}${id.includes('Angle') ? 'deg' : 'px'}`;
                
                // Real-time Preview Update
                if (id === 'rackShadowAngle') {
                    const newRad = (val * Math.PI) / 180;
                    const sx = Math.cos(newRad) * previewDist;
                    const sy = Math.sin(newRad) * previewDist;
                    const preview = container.querySelector('.simulator-preview') as HTMLElement;
                    if (preview) preview.style.boxShadow = `inset ${sx}px ${sy}px 20px rgba(0,0,0,0.4)`;
                }

                this.update(id, val);
            };
        });
    }

    private renderPhysicsSlider(s: SystemSetting | undefined, unit: string) {
        if (!s) return '';
        return `
            <div class="pref-slider-group">
                <div class="pref-slider-header">
                    <label>${s.label.replace('Global ', '')}</label>
                    <span class="val">${s.currentValue}${unit}</span>
                </div>
                <input type="range" class="pref-slider" data-pref-id="${s.id}" 
                       min="${s.minValue}" max="${s.maxValue}" value="${s.currentValue}" step="1">
            </div>
        `;
    }

    public async update(id: string, value: any) {
        const val = parseFloat(value);
        const rpc = (window as any).omegaRPC;
        if (rpc) {
            await rpc.send("setSystemSetting", { id, value: val });
        }
        const s = this.settings.find(x => x.id === id);
        if (s) {
            s.currentValue = val;
            if (id.startsWith('rackShadow')) {
                PhysicsEngine.syncFromSettings(this.settings);
            }
        }
    }

    public reset(id: string) {
        const s = this.settings.find(x => x.id === id);
        if (s) {
            this.update(id, s.defaultValue);
            this.render();
        }
    }
}

export const Preferences = new OMEGA_Preferences();
(window as any).Preferences = Preferences;
