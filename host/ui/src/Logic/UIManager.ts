import { OmegaLog } from '../RPC/omega_log.js';

/**
 * OMEGA Era 7.2.3 - UI Manager
 * Orchestrates global UI states: Modals, Menus, LCD, and Splash.
 */
export class UIManager {
    private lastPresetName: string = "INITIAL PATCH";
    private lcdTimer: number | null = null;

    constructor() {
        this.setupModals();
        this.setupMenus();
    }

    public hideSplash() {
        const splash = document.getElementById('splash-screen');
        const rack = document.getElementById('omega-rack');
        if (!splash) return;

        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        
        setTimeout(() => {
            splash.style.display = 'none';
            if (rack) {
                rack.style.display = 'flex';
                rack.style.opacity = '1';
                rack.style.pointerEvents = 'auto';
                rack.classList.add('visible');
            }
        }, 1000);
    }

    public updateLCD(text: string, isTemporary: boolean) {
        const lcd = document.getElementById('lcd-text');
        if (!lcd) return;

        if (this.lcdTimer) clearTimeout(this.lcdTimer);

        if (isTemporary) {
            lcd.textContent = text;
            lcd.style.color = "#ff8888";
            this.lcdTimer = window.setTimeout(() => {
                lcd.textContent = this.lastPresetName;
                lcd.style.color = "#ff3c3c";
            }, 1500);
        } else {
            this.lastPresetName = text;
            lcd.textContent = text;
            lcd.style.color = "#ff3c3c";
        }
    }

    public updateVersion(version: string, build?: string) {
        const topEl = document.getElementById('top-bar-version');
        if (topEl) {
            topEl.textContent = `OMEGA Era 7.2.3 [Build ${build || 'SYS_READY'}]`;
        }
        
        document.querySelectorAll('.splash-version, #app-title-mini, #about-version, .about-version').forEach(el => {
            (el as HTMLElement).textContent = version;
        });

        const buildEl = document.getElementById('about-build');
        if (buildEl) buildEl.textContent = build || '0';
    }

    public showModal(id: string) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    }

    public setupInteractions() {
        const bind = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        bind('close-console', () => {
            const el = document.getElementById('debug-console');
            if (el) el.style.display = 'none';
        });

        bind('clear-console', () => {
            const el = document.getElementById('debug-console-content');
            if (el) el.innerHTML = '';
        });

        this.setupSliders();
        this.setupButtons();
        this.setupBender();
    }

    private setupSliders() {
        document.querySelectorAll('.v-slider, .v-slider-mini, .b-track').forEach(container => {
            const pod = container.closest('[data-param]');
            if (!pod) return;
            const paramID = pod.getAttribute('data-param')!;

            const move = (e: PointerEvent) => {
                const rect = container.getBoundingClientRect();
                let val = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
                (window as any).rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: paramID, value: val } 
                });
                this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
            };

            container.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                (container as HTMLElement).setPointerCapture((e as PointerEvent).pointerId);
                move(e as PointerEvent);
                const onMove = (ev: PointerEvent) => move(ev);
                const onUp = () => {
                    container.removeEventListener('pointermove', onMove as EventListener);
                    container.removeEventListener('pointerup', onUp as EventListener);
                };
                container.addEventListener('pointermove', onMove as EventListener);
                container.addEventListener('pointerup', onUp as EventListener);
            });
        });
    }

    private setupButtons() {
        document.querySelectorAll('.sq[data-param], .tiny-btn[data-param], .juno-btn[data-param]').forEach(btn => {
            const paramID = btn.getAttribute('data-param')!;
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const isActive = btn.getAttribute('data-active') === 'true';
                (window as any).rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: paramID, value: isActive ? 0 : 1 } 
                });
            });
        });
    }

    private setupBender() {
        const stick = document.getElementById('bender-stick');
        const housing = document.getElementById('stick-housing');
        if (!stick || !housing) return;

        housing.addEventListener('pointerdown', (e: PointerEvent) => {
            e.preventDefault();
            housing.setPointerCapture(e.pointerId);

            const move = (ev: PointerEvent) => {
                const rect = housing.getBoundingClientRect();
                let x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                stick.style.left = (x * 100) + '%';
                (window as any).rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: 'bender', value: x } 
                });
            };

            const onUp = () => {
                housing.removeEventListener('pointermove', move as EventListener);
                housing.removeEventListener('pointerup', onUp as EventListener);
                stick.style.left = '50%';
                (window as any).rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: 'bender', value: 0.5 } 
                });
            };
            housing.addEventListener('pointermove', move as EventListener);
            housing.addEventListener('pointerup', onUp as EventListener);
        });
    }

    private setupModals() {
        document.querySelectorAll('.modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal') as HTMLElement;
                if (modal) modal.style.display = 'none';
            });
        });
    }

    private setupMenus() {
        document.querySelectorAll('.menu-item').forEach(item => {
            const htmlItem = item as HTMLElement;
            htmlItem.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const dropdown = htmlItem.querySelector('.dropdown') as HTMLElement;
                
                if (target.tagName === 'A' && target.hasAttribute('data-action')) {
                    // Action handling remains in App Orchestrator for now
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                if (!dropdown) return;
                const isVisible = dropdown.style.display === 'block';
                document.querySelectorAll('.dropdown').forEach(d => (d as HTMLElement).style.display = 'none');
                dropdown.style.display = isVisible ? 'none' : 'block';
            });
        });
    }
}
