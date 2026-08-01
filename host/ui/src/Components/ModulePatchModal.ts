/**
 * OMEGA Unified Module Patch Modal
 * Standardized for Era 6 Aseptic Contract Runtime.
 */
export class ModulePatchModal {
    private el: HTMLElement | null = null;
    private tabsContainer: HTMLElement | null = null;
    private viewport: HTMLElement | null = null;
    private currentInstanceId: string = "";
    private activeTab: string = "";
    private currentSchema: any = null;
    private patchbayMatrix: any[] = [];
    private maxSlots: number = 32;

    constructor() {
        console.log("[ModulePatchModal] Initializing Unified Era 7 UI...");
        this.init();
    }

    private init(): void {
        this.el = document.getElementById('module-patch-modal');
        this.tabsContainer = document.getElementById('patch-tabs-container');
        this.viewport = document.getElementById('patch-tab-viewport');

        // Close logic (delegated to background click)
        this.el?.addEventListener('click', (e: any) => {
            if (e.target === this.el) this.close();
        });

        // Tab Switching Listener (Delegated)
        this.tabsContainer?.addEventListener('click', (e: any) => {
            const btn = e.target.closest('.aseptic-tab-btn');
            if (btn) {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) this.switchTab(tabId);
            }
        });

        // Era 7: Reactive Subscription
        if ((window as any).runtimeStore) {
            (window as any).runtimeStore.subscribe((type: any) => {
                // Modal needs real-time updates for params and telemetry
                if (type & 2 /* Parameters */ || type & 4 /* Telemetry */) {
                    this.updateRealtimeUI();
                }
            });
        }
    }

    public async open(instanceId: string, schema: any): Promise<void> {
        if (!this.el) return;
        this.currentInstanceId = instanceId;
        
        // --- ERA 7 Normalization Shunt ---
        const normalized = this.normalizeSchema(schema);
        this.currentSchema = normalized;
        
        this.el.style.display = 'flex';

        if (!normalized || !normalized.items || normalized.items.length === 0) {
            // Check if we have at least a RACK tab
            this.renderTabs(normalized || { items: [] });
            this.switchTab("RACK");
            return;
        }

        this.renderTabs(normalized);
        
        // Default to first tab (prefer MAIN)
        const tabs = this.getTabsFromSchema(normalized);
        const defaultTab = tabs.includes("MAIN") ? "MAIN" : (tabs[0] || "RACK");
        this.switchTab(defaultTab);
    }

    private normalizeSchema(schema: any): any {
        if (!schema) return null;
        
        // If already in Era 6 format, return as is
        if (schema.items) return schema;

        // Map Era 7 (Manifest Editor format) to Modal format
        const items: any[] = [];

        if (schema.ui && schema.ui.controls) {
            schema.ui.controls.forEach((ctrl: any) => {
                const param = schema.parameters?.find((p: any) => p.id === ctrl.bind);
                items.push({
                    id: ctrl.bind,
                    paramId: ctrl.bind,
                    label: ctrl.label || param?.label || ctrl.bind,
                    tab: ctrl.presentation?.tab || "MAIN",
                    group: ctrl.presentation?.container || ctrl.presentation?.group || "PARAMETERS",
                    look: ctrl.type === 'selector' ? 'list' : 'knob',
                    options: param?.options || null,
                    default: param?.default || 0,
                    roles: param?.modulable ? ['stream'] : []
                });
            });
        }

        return { ...schema, items };
    }

    public close(): void {
        if (this.el) this.el.style.display = 'none';
    }

    private renderTabs(schema: any): void {
        if (!this.tabsContainer) return;
        this.tabsContainer.innerHTML = '';

        const tabs = this.getTabsFromSchema(schema);

        tabs.forEach(tabTitle => {
            const btn = document.createElement('button');
            btn.className = 'aseptic-tab-btn';
            btn.innerText = tabTitle.toUpperCase();
            btn.setAttribute('data-tab', tabTitle);
            this.tabsContainer!.appendChild(btn);
        });
    }

    private getTabsFromSchema(schema: any): string[] {
        if (!schema || !schema.items) return [];
        const tabs = new Set<string>();
        schema.items.forEach((item: any) => {
            if (item.tab) tabs.add(item.tab);
        });
        
        // Era 6.3: Always inject RACK management tab
        tabs.add("RACK");
        
        return Array.from(tabs);
    }

    private switchTab(tabId: string): void {
        this.activeTab = tabId;
        
        // Update UI states
        this.tabsContainer?.querySelectorAll('.aseptic-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        if (tabId === "RACK") {
            this.renderRackTab();
        } else {
            this.renderTabContent(tabId);
        }
    }

    private renderRackTab(): void {
        if (!this.viewport) return;
        this.viewport.innerHTML = `
            <div class="aseptic-params-container">
                <div class="aseptic-group-title">RACK REORDERING</div>
                <div class="rack-reorder-actions">
                    <button class="btn-rack-action" id="btn-move-left">◀ MOVE LEFT</button>
                    <button class="btn-rack-action" id="btn-move-right">MOVE RIGHT ▶</button>
                </div>
                <div class="aseptic-group-title">VISUAL THEME</div>
                <div class="theme-selector-container">
                    <select class="selector-control" id="theme-selector">
                        <option value="industrial">INDUSTRIAL (DEFAULT)</option>
                        <option value="carbon">CARBON (TECH)</option>
                        <option value="glass">GLASS (FUTURISTIC)</option>
                        <option value="minimal">MINIMAL (CLEAN)</option>
                    </select>
                </div>
                <div class="rack-reorder-info">
                    Instance: <span>${this.currentInstanceId}</span>
                </div>
            </div>
        `;

        const themeSel = document.getElementById('theme-selector') as HTMLSelectElement;
        if (themeSel) {
            // @ts-ignore
            const currentTheme = window.runtimeStore.getSnapshot().preset?.auxiliary?.find((m: any) => m.instanceId === this.currentInstanceId)?.theme || "";
            themeSel.value = currentTheme;
            themeSel.addEventListener('change', (e: any) => {
                this.setModuleTheme(e.target.value);
            });
        }

        document.getElementById('btn-move-left')?.addEventListener('click', () => {
            this.moveModule(-1);
        });
        document.getElementById('btn-move-right')?.addEventListener('click', () => {
            this.moveModule(1);
        });
    }

    private async setModuleTheme(theme: string): Promise<void> {
        console.log(`[ModulePatchModal] Setting theme for ${this.currentInstanceId} to ${theme}`);
        // @ts-ignore
        await window.rpcCommandDispatcher.dispatch({
            type: 'setModuleTheme',
            payload: { 
                instanceId: this.currentInstanceId,
                theme: theme 
            }
        });
    }

    private async moveModule(direction: number): Promise<void> {
        console.log(`[ModulePatchModal] Moving module ${this.currentInstanceId} in direction ${direction}`);
        // @ts-ignore
        await window.rpcCommandDispatcher.dispatch({
            type: 'moveModule',
            payload: { 
                instanceId: this.currentInstanceId,
                direction: direction 
            }
        });
    }

    private renderTabContent(tabId: string): void {
        if (!this.viewport || !this.currentSchema) return;
        this.viewport.innerHTML = '';

        const items = this.currentSchema.items.filter((i: any) => i.tab === tabId);
        
        const form = document.createElement('div');
        form.id = 'patch-params-form';
        form.className = 'aseptic-params-container';
        this.viewport.appendChild(form);

        // Group items by 'group' field
        const groups = new Map<string, any[]>();
        items.forEach((item: any) => {
            const g = item.group || "PARAMETERS";
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g)!.push(item);
        });

        groups.forEach((groupItems, groupName) => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'aseptic-group-title';
            groupHeader.innerText = groupName.toUpperCase();
            form.appendChild(groupHeader);

            groupItems.forEach(item => {
                this.renderParameterRow(form, [item]);
            });
        });

        this.setupListeners();
    }

    private setupListeners(): void {
        if (!this.viewport) return;

        // 1. Selector listeners
        this.viewport.querySelectorAll('select.selector-control').forEach(select => {
            select.addEventListener('change', (e: any) => {
                const id = select.getAttribute('data-param')!;
                const val = parseFloat(e.target.value);
                const paramId = `${this.currentInstanceId}.${id}`;
                // @ts-ignore
                window.rpcCommandDispatcher.dispatch({ type: 'setParameter', target: paramId, value: val });
            });
        });

        // 2. Knob listeners (Aseptic drag)
        this.viewport.querySelectorAll('.knob-ring').forEach(ring => {
            const id = ring.getAttribute('data-param')!;
            
            const move = (e: PointerEvent) => {
                const rect = ring.getBoundingClientRect();
                let val = 1.0 - (e.clientY - rect.top) / rect.height;
                val = Math.max(0, Math.min(1, val));

                const paramId = `${this.currentInstanceId}.${id}`;
                // @ts-ignore
                window.rpcCommandDispatcher.dispatch({ type: 'setParameter', target: paramId, value: val });
                
                // Real-time UI update (Feedback)
                const knob = ring.querySelector('.knob') as HTMLElement;
                if (knob) knob.style.transform = `translateX(-50%) rotate(${(val * 270) - 135}deg)`;
            };

            ring.addEventListener('pointerdown', (e: any) => {
                e.preventDefault();
                ring.setPointerCapture(e.pointerId);
                move(e);
                
                const onMove = (ev: PointerEvent) => move(ev);
                const onUp = () => {
                    ring.removeEventListener('pointermove', onMove as EventListener);
                    ring.removeEventListener('pointerup', onUp as EventListener);
                };
                ring.addEventListener('pointermove', onMove as EventListener);
                ring.addEventListener('pointerup', onUp as EventListener);
            });
        });
    }


    private renderParameterRow(container: HTMLElement, items: any[]): void {
        const row = document.createElement('div');
        row.className = 'aseptic-params-row';
        
        items.forEach(item => {
            const cell = this.buildControlCell(item);
            row.appendChild(cell);
        });

        container.appendChild(row);
    }

    /**
     * ERA 6 STANDARD: Unified Control Cell Generator
     */
    private buildControlCell(item: any): HTMLElement {
        const cell = document.createElement('div');
        const id = item.paramId || item.id;
        cell.className = 'control-cell';
        cell.id = `cell-${this.currentInstanceId}-${id}`;
        cell.setAttribute('data-bind', id);

        // 1. Attachment Superior (LED/Telemetry)
        const top = document.createElement('div');
        top.className = 'cell-attachment-top';
        if (item.roles?.includes('stream')) {
            const led = document.createElement('div');
            led.className = 'led led-orange';
            led.setAttribute('data-source', id);
            top.appendChild(led);
        }
        cell.appendChild(top);

        // 2. Primary Component
        const main = document.createElement('div');
        main.className = 'cell-main';
        
        if (item.look === 'list' && item.options) {
            const select = document.createElement('select');
            select.className = 'selector-control';
            select.setAttribute('data-param', id);
            item.options.forEach((opt: any) => {
                const o = document.createElement('option');
                o.value = opt.value.toString();
                o.innerText = opt.label;
                select.appendChild(o);
            });
            main.appendChild(select);
        } else {
            // Default to Knob for aseptic look
            main.innerHTML = `
                <div class="knob-ring" data-param="${id}">
                    <div class="knob"><div class="knob-marker white"></div></div>
                </div>
            `;
        }
        cell.appendChild(main);

        // 3. Info Layer (Label & Display)
        const info = document.createElement('div');
        info.className = 'cell-info';
        
        const label = document.createElement('label');
        label.className = 'cell-label';
        label.innerText = (item.label || id).toUpperCase();
        info.appendChild(label);

        const display = document.createElement('div');
        display.className = 'cell-display';
        display.setAttribute('data-precision', (item.ui_precision ?? 2).toString());
        // @ts-ignore
        const currentVal = window.runtimeStore?.getValue(`${this.currentInstanceId}.${id}`, item.default || 0);
        display.innerText = currentVal.toString();
        info.appendChild(display);

        cell.appendChild(info);

        return cell;
    }

    /**
     * ERA 6: Real-time UI refresh from Aseptic Store
     */
    private updateRealtimeUI(): void {
        if (!this.el || this.el.style.display !== 'flex' || !this.viewport) return;

        // 1. Update Knobs and Displays
        this.viewport.querySelectorAll('.control-cell').forEach(cell => {
            const id = cell.getAttribute('data-bind');
            if (!id) return;

            // @ts-ignore
            const val = window.runtimeStore.getValue(`${this.currentInstanceId}.${id}`);
            
            // Knob
            const knob = cell.querySelector('.knob') as HTMLElement;
            if (knob) knob.style.transform = `translateX(-50%) rotate(${(val * 270) - 135}deg)`;

            // Display
            const display = cell.querySelector('.cell-display') as HTMLElement;
            if (display) {
                const precision = parseInt(display.getAttribute('data-precision') || '2');
                display.innerText = val.toFixed(precision);
            }

            // Selector
            const select = cell.querySelector('select') as HTMLSelectElement;
            if (select) select.value = val.toString();

            // LED (Telemetry)
            const led = cell.querySelector('.led') as HTMLElement;
            if (led) {
                // @ts-ignore
                const tVal = window.runtimeStore.getTelemetry(`${this.currentInstanceId}.${id}`);
                led.classList.toggle('active', tVal > 0.05);
            }
        });
    }

    private renderError(reason: string): void {
        if (!this.viewport) return;
        this.viewport.innerHTML = `
            <div class="contract-error-full">
                <div class="error-msg">CONTRACT VIOLATION</div>
                <div class="error-detail">${reason}</div>
            </div>
        `;
    }
}
