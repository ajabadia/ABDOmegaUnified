/**
 * OMEGA — JackRegistry
 * Fase 1: registra los jacks (port-sockets) presentes en el DOM del rack
 * y calcula sus coordenadas RELATIVAS al rack para dibujar los cables.
 *
 * Fuente de verdad de IDs: la MATRIX.
 *   - qualifiedId = "{instanceId}.{portId}"  (ej: "1.saw_out")
 *   - El instanceId se extrae del id DOM del módulo ("mod-v7_1" -> "1").
 *   - Fallback para módulos aseptic sin instanceId numérico: "{typeId}_{idx}".
 */
import { OmegaLog } from '../../RPC/omega_log.js';

export interface Jack {
    id: string;        // qualifiedId completo: "{instanceId}.{portId}"
    el: HTMLElement;   // el port-socket del DOM
    x: number;         // centro X relativo al rack (px)
    y: number;         // centro Y relativo al rack (px)
    type: string;      // tipo de señal ('audio', 'cv', 'gate', 'midi')
}

export class JackRegistry {
    private jacks: Map<string, Jack> = new Map();

    /**
     * (Re)escanea el DOM del rack y reconstruye el registro de jacks.
     * Debe llamarse tras cambios de estructura (addModule/removeModule),
     * en init() y en cada syncCablesFromState().
     */
    refresh(): void {
        const jacks = new Map<string, Jack>();
        const rackEl = document.getElementById('omega-rack');

        if (rackEl) {
            // ── Vía principal (Era 7): módulos con id "mod-v7_{instanceId}" ──
            rackEl.querySelectorAll<HTMLElement>('.module[id^="mod-v7_"]').forEach((modEl) => {
                const instanceId = modEl.id.replace(/^mod-v7_/, '');
                this.scanPortSockets(modEl, instanceId, jacks);
            });

            // ── Fallback: paneles aseptic sin instanceId numérico ──
            // Usa contador por tipoId + índice (mirror de matrixLayout.ts).
            rackEl.querySelectorAll<HTMLElement>('.aseptic-module-panel').forEach((panelEl) => {
                const typeId = panelEl.dataset.moduleId || 'module';
                const idx = this.countPanelsOfType(panelEl);
                const instanceId = `${typeId}_${idx}`;
                this.scanPortSockets(panelEl, instanceId, jacks);
            });
        }

        this.jacks = jacks;
        OmegaLog.info('CABLES', `JackRegistry.refresh(): ${jacks.size} jacks`);
    }

    getJack(id: string): Jack | undefined {
        return this.jacks.get(id);
    }

    /** Número de jacks registrados (utilidad de verificación). */
    get count(): number {
        return this.jacks.size;
    }

    /** Coordenadas del jack RELATIVAS al rack, o null si no existe. */
    getPosition(id: string): { x: number; y: number } | null {
        const jack = this.jacks.get(id);
        return jack ? { x: jack.x, y: jack.y } : null;
    }

    getAll(): Map<string, Jack> {
        return this.jacks;
    }

    /** Devuelve todos los qualifiedIds registrados (utilidad de verificación). */
    getAllIds(): string[] {
        return Array.from(this.jacks.keys());
    }

    /* ───────────────────────── internos ───────────────────────── */

    /** Cuenta cuántos paneles del mismo typeId hay ANTES que el dado. */
    private countPanelsOfType(current: HTMLElement): number {
        const rackEl = document.getElementById('omega-rack');
        if (!rackEl) return 1;
        const typeId = current.dataset.moduleId || '';
        let idx = 0;
        rackEl.querySelectorAll<HTMLElement>('.aseptic-module-panel').forEach((el) => {
            if (el === current) return;
            if ((el.dataset.moduleId || '') === typeId) idx += 1;
        });
        return idx + 1;
    }

    /** Escanea los port-sockets de un módulo y registra cada jack. */
    private scanPortSockets(
        moduleEl: HTMLElement,
        instanceId: string,
        out: Map<string, Jack>,
    ): void {
        const rackEl = document.getElementById('omega-rack');
        if (!rackEl) return;

        const rackRect = rackEl.getBoundingClientRect();
        moduleEl.querySelectorAll<HTMLElement>('.port-socket[data-source]').forEach((el) => {
            const dataSource = el.dataset.source || '';
            if (!dataSource) return;
            const qualifiedId = `${instanceId}.${dataSource}`;
            const r = el.getBoundingClientRect();
            out.set(qualifiedId, {
                id: qualifiedId,
                el,
                x: r.left + r.width / 2 - rackRect.left,
                y: r.top + r.height / 2 - rackRect.top,
                type: 'cv', // se resuelve vía SignalTypeResolver
            });
        });
    }
}
