import { AssetResolver } from '../Util/AssetResolver.js';
import { ManifestRenderer } from '../Renderers/ManifestRenderer.js';
import { resolveRackTarget } from '../Logic/RackRouter.js';
import { getOrFetchManifest } from '../Catalog/AcemmCatalog.js';

export class ModuleBrowser {
    private el: HTMLElement | null = null;
    private grid: HTMLElement | null = null;
    private categories: HTMLElement | null = null;
    private detail: HTMLElement | null = null;
    private gallery: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;

    private catalog: any[] = [];
    private currentFilter: string = 'ALL';
    private currentSearch: string = '';
    private selectedModule: any = null;

    constructor() {
        this.setupListeners();
    }

    private ensureElements(): boolean {
        if (this.el) return true;
        this.el = document.getElementById('module-browser-modal');
        this.grid = document.getElementById('module-registry-grid');
        this.categories = document.getElementById('module-category-list');
        this.detail = document.getElementById('module-detail-panel');
        this.gallery = document.getElementById('module-gallery-strip');
        this.searchInput = document.getElementById('module-search') as HTMLInputElement;
        return !!(this.el && this.grid && this.categories && this.detail && this.gallery && this.searchInput);
    }

    async open(): Promise<void> {
        if (!this.ensureElements()) return;
        if (this.el) this.el.style.display = 'flex';
        await this.fetchCatalog();
        this.renderCategories();
        this.renderGrid();
        if (this.catalog.length > 0) {
            this.selectModule(this.catalog[0]);
        }
    }

    private async fetchCatalog(): Promise<void> {
        console.log('[ModuleBrowser] fetchCatalog starting...');
        const inv = (window as any).inventoryStore;
        if (inv) {
            await inv.ensureLoaded();
            this.catalog = inv.getAllItems();
            console.log(`[ModuleBrowser] Catalog items in store: ${this.catalog.length}`);
        } else {
            console.warn('[ModuleBrowser] inventoryStore not found on window');
        }
    }

    private renderCategories(): void {
        if (!this.categories) return;
        const cats = ['ALL', 'OSC', 'FLT', 'ENV', 'AMP', 'MOD', 'IO', 'UTILITY'];
        this.categories.innerHTML = cats.map(c => `
            <div class="cat-item ${this.currentFilter === c ? 'active' : ''}" data-cat="${c}">
                ${c}
            </div>
        `).join('');

        this.categories.querySelectorAll('.cat-item').forEach(el => {
            el.addEventListener('click', () => {
                this.currentFilter = (el as HTMLElement).dataset.cat || 'ALL';
                this.renderCategories();
                this.renderGrid();
            });
        });
    }

    private renderGrid(): void {
        if (!this.grid) return;
        console.log(`[ModuleBrowser] renderGrid. Total items: ${this.catalog.length}, Filter: ${this.currentFilter}`);

        const filtered = this.catalog.filter(m => {
            const matchesCategory = this.currentFilter === 'ALL' || (m.category || m.family) === this.currentFilter;
            const matchesSearch = !this.currentSearch ||
                m.name.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
                m.id.toLowerCase().includes(this.currentSearch.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            this.grid.innerHTML = '<div style="color: #64748b; font-family: monospace; font-size: 12px; grid-column: 1/-1; text-align: center; padding: 40px;">No se encontraron módulos</div>';
            return;
        }

        this.grid.innerHTML = filtered.map(m => `
            <div class="reg-card ${this.selectedModule?.id === m.id ? 'selected' : ''}" data-id="${m.id}">
                <div class="card-icon">
                    ${this.getIconForModule(m)}
                </div>
                <div class="card-name">${m.name}</div>
                <div class="card-family">${m.category || m.family || 'DSP'} • ${m.hp || 8} HP</div>
            </div>
        `).join('');

        this.grid.querySelectorAll('.reg-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = (card as HTMLElement).dataset.id;
                const m = this.catalog.find(item => item.id === id);
                if (m) this.selectModule(m);
            });
        });
    }

    private selectModule(m: any): void {
        this.selectedModule = m;
        this.grid?.querySelectorAll('.reg-card').forEach(c => {
            c.classList.toggle('selected', (c as HTMLElement).dataset.id === m.id);
        });
        this.renderDetail(m);
    }

    private renderDetail(m: any): void {
        if (!this.detail) return;
        const hp = m.hp || 8;
        const widthMm = Math.round(hp * 5.08);

        this.detail.innerHTML = `
            <div class="detail-header">
                <h3>${m.name}</h3>
                <div class="detail-meta">
                    <span class="meta-tag family">${m.category || m.family || 'DSP'}</span>
                    <span class="meta-tag version">ERA 7</span>
                    <span class="meta-author">ID: ${m.id}</span>
                </div>
            </div>
            
            <div class="detail-specs">
                <div class="spec-item"><label>ANCHO</label><span>${hp} HP (${widthMm}mm)</span></div>
                <div class="spec-item"><label>ESTÁNDAR</label><span>EURORACK 3U/1U</span></div>
                <div class="spec-item"><label>+12V RAIL</label><span>${m.current12V || 45} mA</span></div>
                <div class="spec-item"><label>-12V RAIL</label><span>${m.currentMinus12V || 15} mA</span></div>
            </div>

            <div class="detail-description">${m.description || 'Módulo sintetizador de alta fidelidad Era 7 con procesamiento DSP acelerado.'}</div>

            <div class="add-action-container">
                <button class="btn-add-to-rack" id="btn-add-module-exec">
                    ＋ AGREGAR AL RACK
                </button>
            </div>
        `;

        if (!this.gallery) return;
        const images = m.images || [];
        if (images.length === 0) {
            this.gallery.innerHTML = `
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('assets/modules/${m.id}/mockup_front.png')"></div>
                    <label>FRONT</label>
                </div>
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('assets/modules/${m.id}/mockup_angle.png')"></div>
                    <label>ANGLE</label>
                </div>
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('assets/modules/${m.id}/mockup_detail.png')"></div>
                    <label>DETAIL</label>
                </div>
            `;
        } else {
            this.gallery.innerHTML = images.map((img: string) => `
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('${img}')"></div>
                </div>
            `).join('');
        }

        const addBtn = document.getElementById('btn-add-module-exec');
        if (addBtn) {
            addBtn.onclick = () => this.addModule(m.id);
        }
    }

    private getIconForModule(m: any): string {
        const id = m.id || m.componentId;
        const logoPath = AssetResolver.resolve(id, 'module_logo.svg');
        const icons: any = {
            'osc-analog': '🔊',
            'midi-util': '🎹',
            'filter-standard': '🌊',
            'env-standard': '📐'
        };
        const emoji = icons[m.icon] || '📦';
        const illustrationPath = AssetResolver.resolve(id, 'illustration.svg');
        
        return `<img src="${logoPath}" class="card-illustration" alt="${m.name}" 
                     onerror="this.src='${illustrationPath}'; this.onerror=function(){ this.style.display='none'; this.nextElementSibling.style.display='block'; };">
                <div class="card-icon-fallback" style="display:none; font-size: 2rem;">${emoji}</div>`;
    }

    private setupListeners(): void {
        setTimeout(() => {
            if (!this.ensureElements()) return;
            this.searchInput?.addEventListener('input', (e: any) => {
                this.currentSearch = e.target.value;
                this.renderGrid();
            });
        }, 500);
    }

    private async addModule(componentId: string): Promise<void> {
        const m = this.selectedModule;
        if (!m) return;

        const btn = document.getElementById('btn-add-module-exec') as HTMLButtonElement;
        const originalHTML = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border:2px solid rgba(255,255,255,0.3); border-top-color:#00f2ff; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span> PROCESANDO...`;
        }

        try {
            const meta = m.metadata || m;
            const hp = meta.hp || meta.rack?.hp || m.hp || 8;
            const cardWidth = Math.max(hp * 15, 60);

            const getFn = (window as any).getOrFetchManifest || getOrFetchManifest;
            const resolveFn = (window as any).resolveRackTarget || resolveRackTarget;
            const renderer = (window as any).ManifestRenderer || ManifestRenderer;

            // 1. Fetch/Resolve manifest using getOrFetchManifest
            let renderedHTML = '';
            let manifest: any = null;
            try {
                if (getFn) manifest = await getFn(componentId);
            } catch (e) {
                console.warn(`[ModuleBrowser] Manifest fetch failed for ${componentId}:`, e);
            }

            const targetRackInfo = resolveFn ? resolveFn(componentId, m, manifest) : { isUpper: false };
            if (manifest && renderer) {
                try {
                    renderedHTML = renderer.renderModulePanel(manifest, targetRackInfo.isUpper);
                    console.log(`[ModuleBrowser] Rendered module "${componentId}" with ManifestRenderer (IsUpper: ${targetRackInfo.isUpper})`);
                } catch (e) {
                    console.warn(`[ModuleBrowser] ManifestRenderer failed for ${componentId}:`, e);
                }
            }

            // 2. Mount to Rack
            const targetContainer = document.getElementById(targetRackInfo.isUpper ? 'upper-rack' : 'lower-rack') || document.getElementById('lower-rack');
            if (targetContainer) {
                const modCard = document.createElement('div');
                modCard.className = 'aseptic-module-panel';
                modCard.dataset.moduleId = componentId;
                modCard.style.cssText = `position: relative; flex-shrink: 0; z-index: 30; margin: 0;`;

                if (renderedHTML) {
                    modCard.innerHTML = `
                        <div style="position:relative;">
                            <button class="btn-remove-module" style="position:absolute; top:4px; right:6px; background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.4); border-radius:3px; font-size:10px; cursor:pointer; width:16px; height:16px; display:flex; align-items:center; justify-content:center; z-index:50; font-weight:bold;" onclick="this.closest('.aseptic-module-panel').remove(); window.modulePatchbayMatrix?.loadMetadata?.();">&times;</button>
                            ${renderedHTML}
                        </div>
                    `;
                } else {
                    modCard.style.cssText = `width: ${cardWidth}px; min-height: 200px; background: #111827; border: 1px solid #1e293b; border-radius: 0; padding: 14px; margin: 0; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 20px rgba(0,0,0,0.6); flex-shrink: 0; position: relative; z-index: 30;`;
                    modCard.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                            <span style="font-family:monospace; font-size:11px; font-weight:900; color:var(--neon-cyan); text-transform:uppercase; letter-spacing:0.5px;">${m.name}</span>
                            <span style="font-size:9px; color:#64748b; font-family:monospace; background:#0f172a; padding:2px 6px; border-radius:4px;">${hp} HP</span>
                        </div>
                        <div style="font-size:11px; color:#94a3b8; margin:10px 0; line-height:1.4; flex-grow:1;">${m.description || 'Módulo Sintetizador OMEGA'}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#0b0f19; padding:8px 10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05); margin-top:8px;">
                            <span style="font-size:10px; color:#22c55e; font-family:monospace; font-weight:bold;">● ONLINE</span>
                            <button style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer; font-weight:bold; transition:all 0.2s;" onclick="this.closest('.aseptic-module-panel').remove(); window.modulePatchbayMatrix?.loadMetadata?.();">QUITAR</button>
                        </div>
                    `;
                }
                targetContainer.appendChild(modCard);

                // Notify Patchbay Matrix to refresh ports for newly added module
                (window as any).modulePatchbayMatrix?.loadMetadata?.();
            }

            // 3. Dispatch RPC for native host if connected
            const slot = targetRackInfo.isUpper ? 'upper' : 'lower';
            if ((window as any).rpcCommandDispatcher) {
                try {
                    await (window as any).rpcCommandDispatcher.dispatch({ 
                        type: 'addModule', 
                        payload: { componentId, slot } 
                    });
                } catch (e) {
                    console.warn("[ModuleBrowser] RPC Dispatch skipped in web standalone mode.");
                }
            }

            // 4. Explicitly Close Modal & Show Sleek Toast
            const modalEl = document.getElementById('module-browser-modal');
            if (modalEl) modalEl.style.display = 'none';
            if (this.el) this.el.style.display = 'none';

            this.showToast(`MÓDULO "${m.name}" AÑADIDO AL RACK (${slot.toUpperCase()})`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.style.pointerEvents = '';
                btn.innerHTML = originalHTML;
            }
        }
    }

    private showToast(message: string): void {
        let toast = document.getElementById('omega-ui-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'omega-ui-toast';
            toast.style.cssText = `position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: var(--neon-cyan); border: 1px solid var(--neon-cyan); padding: 12px 20px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: bold; z-index: 99999; box-shadow: 0 10px 30px rgba(0,242,255,0.2); transition: all 0.3s ease; opacity: 0; transform: translateY(10px);`;
            document.body.appendChild(toast);
        }
        toast.textContent = `✓ ${message}`;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            if (toast) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
            }
        }, 3000);
    }
}

// Bind to window for global access
if (typeof window !== 'undefined') {
    (window as any).ModuleBrowser = ModuleBrowser;
}
