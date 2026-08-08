/**
 * PresetBrowser.ts - OMEGA Advanced Preset Management
 * Handles the 3-column browser (Category > Library > Patch)
 * Era 6 - Managed Dispatch Edition
 */

export interface Patch {
    name: string;
    author?: string;
    category?: string;
    tags?: string;
    notes?: string;
    favorite?: boolean;
    date?: string;
    originGroup?: number;
    originBank?: number;
    originPatch?: number;
}

export interface Library {
    name: string;
    category: string;
    patches: Patch[];
}

export interface BrowserData {
    libraries: Library[];
    categories?: string[];
}

export class OMEGA_PresetBrowser {
    private data: BrowserData = { libraries: [] };
    private selectedLibIdx: number = 0;
    private selectedPresetIdx: number = -1;
    private currentCategory: string = 'All';
    private searchQuery: string = '';

    constructor() {
        console.log("[PresetBrowser] Initialized (Aseptic)");
    }

    public async init() {
        this.setupListeners();
        await this.refresh();
    }

    private setupListeners() {
        const search = document.getElementById('browser-search') as HTMLInputElement;
        if (search) {
            search.oninput = (e) => {
                this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
                this.renderPresets();
            };
        }

        const attach = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        attach('preset-saveas-btn', () => this.showSaveAsModal());
    }

    private loadUserPresetsFromStorage(): Patch[] {
        try {
            const raw = localStorage.getItem('omega_user_presets');
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn("[PresetBrowser] Could not load user presets:", e);
        }
        return [
            { name: "MY FIRST USER PATCH", category: "User", author: "User", date: new Date().toISOString().split('T')[0] }
        ];
    }

    public saveUserPreset(name: string) {
        try {
            const userPatches = this.loadUserPresetsFromStorage();
            userPatches.push({
                name: name.toUpperCase(),
                category: "User",
                author: "User",
                date: new Date().toISOString().split('T')[0]
            });
            localStorage.setItem('omega_user_presets', JSON.stringify(userPatches));
            
            const lcd = document.getElementById('lcd-text');
            if (lcd) lcd.textContent = name.toUpperCase();

            this.refresh();
            alert(`Preset "${name.toUpperCase()}" saved successfully!`);
        } catch (e) {
            console.error("[PresetBrowser] Save preset failed:", e);
        }
    }

    public async refresh() {
        try {
            const rpc = (window as any).omegaRPC;
            let response = null;
            if (rpc && rpc.isConnected) {
                response = await rpc.send("getBrowserData");
            }
            
            if (response && response.libraries && response.libraries.length > 0) {
                this.data = response;
            } else {
                // Web Standalone Fallback Data
                this.data = {
                    categories: ["All", "Factory", "User", "Bass", "Lead", "Pad", "FX"],
                    libraries: [
                        {
                            name: "FACTORY",
                            category: "Factory",
                            patches: [
                                { name: "INIT PATCH", category: "Factory", author: "OMEGA", date: "2026-07-30" },
                                { name: "SUB BASS 808", category: "Bass", author: "OMEGA", date: "2026-07-30" },
                                { name: "CYBERPUNK LEAD", category: "Lead", author: "OMEGA", date: "2026-07-30" },
                                { name: "CELESTIAL PAD", category: "Pad", author: "OMEGA", date: "2026-07-30" },
                                { name: "INDUSTRIAL ACID", category: "FX", author: "OMEGA", date: "2026-07-30" }
                            ]
                        },
                        {
                            name: "USER PRESETS",
                            category: "User",
                            patches: this.loadUserPresetsFromStorage()
                        }
                    ]
                };
            }
            this.render();
        } catch (e) {
            console.error("[PresetBrowser] Refresh failed:", e);
        }
    }

    public render() {
        this.renderCategories();
        this.renderLibraries();
        this.renderPresets();
    }

    private renderCategories() {
        const list = document.getElementById('cat-list');
        if (!list) return;

        const system = ["All", "Factory", "User", "Favorites"];
        const custom = this.data.categories || [];
        const seen = new Set();

        list.innerHTML = '';
        [...system, ...custom].forEach(cat => {
            if (seen.has(cat)) return;
            seen.add(cat);
            const li = document.createElement('li');
            li.textContent = cat;
            if (this.currentCategory === cat) li.classList.add('active');
            li.onclick = () => this.selectCategory(cat);
            list.appendChild(li);
        });
    }

    private selectCategory(cat: string) {
        this.currentCategory = cat;
        this.selectedLibIdx = 0;
        this.selectedPresetIdx = -1;
        this.render();
    }

    private renderLibraries() {
        const list = document.getElementById('lib-list');
        if (!list) return;
        list.innerHTML = '';

        this.data.libraries.forEach((lib, idx) => {
            let shouldShow = true;
            if (this.currentCategory === 'Factory') shouldShow = lib.name.toUpperCase() === 'FACTORY';
            else if (this.currentCategory === 'User') shouldShow = lib.name.toUpperCase() === 'USER' || lib.category === 'User';
            else if (this.currentCategory === 'Favorites') shouldShow = lib.patches.some(p => p.favorite);
            else if (this.currentCategory !== 'All') shouldShow = lib.category === this.currentCategory;

            if (!shouldShow) return;

            const li = document.createElement('li');
            li.innerHTML = `<span>${lib.name}</span>`;
            if (this.selectedLibIdx === idx) li.classList.add('active');
            li.onclick = () => this.selectLib(idx);
            list.appendChild(li);
        });
    }

    private async selectLib(idx: number) {
        this.selectedLibIdx = idx;
        this.selectedPresetIdx = -1;
        
        // [Era 6] Unified Dispatch
        const dispatcher = (window as any).rpcCommandDispatcher;
        if (dispatcher) {
            await dispatcher.dispatch({ type: 'selectLibrary', value: idx });
        }
        this.render();
    }

    private renderPresets() {
        const list = document.getElementById('preset-list');
        if (!list) return;
        list.innerHTML = '';

        const lib = this.data.libraries[this.selectedLibIdx];
        if (!lib) return;

        lib.patches.forEach((p, idx) => {
            const matchesSearch = !this.searchQuery || p.name.toLowerCase().includes(this.searchQuery);
            if (!matchesSearch) return;

            const li = document.createElement('li');
            li.className = 'preset-item';
            if (this.selectedPresetIdx === idx) li.classList.add('active');
            
            li.innerHTML = `<span class="preset-name">${p.name}</span>`;
            if (p.favorite) li.innerHTML += `<span class="preset-fav active">★</span>`;

            // [P2-4] Botón borrar SOLO para presets de usuario (los de fábrica
            // son programáticos, no borrables). Dispara deletePreset y refresca.
            const isFactory = (lib.name.toUpperCase() === 'FACTORY' || p.category === 'Factory');
            if (!isFactory) {
                const delBtn = document.createElement('button');
                delBtn.className = 'preset-delete';
                delBtn.title = 'Delete preset';
                delBtn.textContent = '🗑';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // No seleccionar el preset al borrar
                    this.deletePreset(p.name);
                });
                li.appendChild(delBtn);
            }

            li.onclick = () => this.selectPreset(idx);
            list.appendChild(li);
        });
    }

    /**
     * [P2-4] Elimina un preset de usuario del disco (RPC deletePreset →
     * PatchRepository::remove). Los patches de fábrica no tienen botón.
     */
    public async deletePreset(name: string) {
        if (!confirm(`¿Eliminar el preset "${name}"?`)) return;

        const dispatcher = (window as any).rpcCommandDispatcher;
        if (dispatcher) {
            await dispatcher.dispatch({ type: 'deletePreset', payload: { target: name } });
        }
        this.selectedPresetIdx = -1;
        await this.refresh();
    }

    private async selectPreset(idx: number) {
        this.selectedPresetIdx = idx;

        const lib = this.data.libraries[this.selectedLibIdx];
        const patch = lib?.patches[idx];
        if (!patch) return;

        // [P0-3] Unified Dispatch: el host carga el preset por nombre desde el
        // repositorio a disco (los patches de fábrica que no están a disco
        // cargan el patch inicial).
        const dispatcher = (window as any).rpcCommandDispatcher;
        if (dispatcher) {
            await dispatcher.dispatch({ 
                type: 'loadPreset', 
                payload: { target: patch.name } 
            });
        }
        
        this.renderPresets();
        this.updateInfoPane();
    }

    private updateInfoPane() {
        const lib = this.data.libraries[this.selectedLibIdx];
        const p = lib?.patches[this.selectedPresetIdx];
        if (!p) return;

        const setVal = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el) el.value = val;
        };

        setVal('meta-name', p.name);
        setVal('meta-author', p.author || '');
        setVal('meta-tags', p.tags || '');
        setVal('meta-notes', p.notes || '');
    }

    private showSaveAsModal() {
        const modal = document.getElementById('modal-saveas');
        if (modal) modal.style.display = 'flex';
    }
}

export const PresetBrowser = new OMEGA_PresetBrowser();
// @ts-ignore
window.PresetBrowser = PresetBrowser;
