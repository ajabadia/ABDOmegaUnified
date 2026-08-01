/**
 * OMEGA — PatchCableManager (Orquestador de Cables)
 * Fase 3: lee la MATRIX del runtimeStore y sincroniza los cables SVG.
 *
 * ALGORITMO (paso a paso):
 * 1. Leer state.patch.patchbayMatrix[] del RuntimeStore.
 * 2. Para cada slot activo con source Y target:
 *    a. Buscar coordenadas de ambos jacks en el JackRegistry.
 *    b. ¿Ya existe cable para ese slot? → solo actualizar posición.
 *    c. ¿No existe? → crear cable nuevo (path SVG + plugs).
 * 3. Para cada cable cuyo slot ya no está activo → eliminarlo.
 *
 * NOTA: si un jack no se encuentra (el módulo fue quitado) se ignora
 * silenciosamente; el cable reaparecerá cuando el módulo vuelva.
 * Los cables son DECORATIVOS: ningún fallo aquí rompe la UI del synth.
 */
import { OmegaLog } from '../../RPC/omega_log.js';
import {
    SignalTypeResolver,
    SIGNAL_COLORS,
    INTERACTION,
    DRAG_TO_PATCH,
    setGlobalTension,
} from './cableConstants.js';
import { JackRegistry } from './JackRegistry.js';
import { CableRenderer, CableEndpoints } from './CableRenderer.js';
import {
    setupCableGhosting,
    setupCableVisibilityToggle,
    setupCableRepulsion,
    setupCableSoloMode,
    setupDragToPatch,
} from './CableInteraction.js';

interface ActiveCable {
    slotIndex: number;
    sourceId: string;
    targetId: string;
    signalType: string;
    pathElement: SVGPathElement;
    plugsElement: SVGGElement | null;
    /** Endpoints base (sin deformación) — se actualizan en cada redraw. */
    base: CableEndpoints;
    /** Desplazamiento de repulsión actual (§7.3), o null si el cable está neutro. */
    deform: { x: number; y: number } | null;
}

export class PatchCableManager {
    readonly jackRegistry: JackRegistry = new JackRegistry();
    readonly signalTypeResolver: SignalTypeResolver = new SignalTypeResolver();

    private activeCables: Map<number, ActiveCable> = new Map();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingRedraw = false;
    private mutationObserver: MutationObserver | null = null;
    private unsubscribeStore: (() => void) | null = null;
    private disposeRepulsion: (() => void) | null = null;
    private disposeDragToPatch: (() => void) | null = null;
    /** Slot destacado por la Ruta destacada (§9), o null si no hay ninguno. */
    private highlightedSlot: number | null = null;

    init(): void {
        // 1. Primera lectura de posiciones de jacks + tipos de señal
        this.jackRegistry.refresh();
        this.signalTypeResolver.refresh(
            (window as any).inventoryStore,
            (window as any).runtimeStore?.getSnapshot?.(),
        );

        // 2. Listeners de layout (scroll, resize, DOM mutations)
        this.setupLayoutListeners();

        // 3. Interacción (Fase 4): ghosting de cables + tecla [H]
        //    + Fase 7.3 (§7.3): repulsión elástica al cursor
        //    + §9: modo "solo cables" (esquema de conexionado)
        setupCableGhosting();
        setupCableVisibilityToggle();
        setupCableSoloMode();
        this.disposeRepulsion = setupCableRepulsion(this);
        this.disposeDragToPatch = setupDragToPatch(this);

        // 4. Suscripción al RuntimeStore (cambios estructurales = módulos/matrix)
        this.subscribeStructureChanges();

        // 5. Sincronización inicial en el primer frame
        requestAnimationFrame(() => this.syncCablesFromState());

        OmegaLog.info(
            'CABLES',
            `[PatchCableManager] Initialized. Jacks registered: ${this.jackRegistry.count}`,
        );
    }

    dispose(): void {
        if (this.mutationObserver) this.mutationObserver.disconnect();
        this.mutationObserver = null;
        if (this.unsubscribeStore) this.unsubscribeStore();
        this.unsubscribeStore = null;
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
        if (this.disposeRepulsion) {
            this.disposeRepulsion();
            this.disposeRepulsion = null;
        }
        if (this.disposeDragToPatch) {
            this.disposeDragToPatch();
            this.disposeDragToPatch = null;
        }
        this.removeAllCables();
    }

    /**
     * NÚCLEO: lee la Matrix y sincroniza los cables SVG.
     * Se llama al arranque, tras cambios estructurales y al iniciar.
     */
    syncCablesFromState(): void {
        this.jackRegistry.refresh();
        this.signalTypeResolver.refresh(
            (window as any).inventoryStore,
            (window as any).runtimeStore?.getSnapshot?.(),
        );

        const matrix = this.readMatrix();
        const activeSlotIndices = new Set<number>();

        matrix.forEach((slot: any, index: number) => {
            const isActive =
                slot?.active === true || slot?.active === 1 || slot?.active === 'true';
            const hasRoute = slot?.source && slot?.target;

            if (!isActive || !hasRoute) return;

            activeSlotIndices.add(index);

            const sourcePos = this.jackRegistry.getPosition(slot.source);
            const targetPos = this.jackRegistry.getPosition(slot.target);

            // Si no encontramos algún jack (módulo fuera), no dibujar cable
            if (!sourcePos || !targetPos) return;

            const endpoints: CableEndpoints = {
                x1: sourcePos.x, y1: sourcePos.y,
                x2: targetPos.x, y2: targetPos.y,
            };

            const existing = this.activeCables.get(index);

            // ¿El slot cambió de ruta? Recrear (ids stale).
            const routeChanged =
                existing &&
                (existing.sourceId !== slot.source || existing.targetId !== slot.target);

            if (existing && !routeChanged) {
                // Caso A: cable ya existe → solo actualizar posición
                // (preservando el desplazamiento de repulsión si lo hay)
                existing.base = endpoints;
                CableRenderer.updateCablePath(
                    existing.pathElement, endpoints, existing.deform ?? undefined,
                );
                if (existing.plugsElement) {
                    CableRenderer.updatePlugs(existing.plugsElement, endpoints);
                }
            } else {
                // Caso B (nuevo, o ruta cambiada): crear desde cero
                if (existing && routeChanged) {
                    this.removeCableAt(index);
                }

                const signalType = this.signalTypeResolver.getSignalType(slot.source);
                const color = SIGNAL_COLORS[signalType] || SIGNAL_COLORS.cv;

                const pathElement = CableRenderer.createCablePath(
                    index, endpoints, signalType,
                );

                // Fase 5 (§8.3): pulso de señal opcional. Se aplica DESPUÉS de
                // la animación 'entering' para no pisar su stroke-dasharray.
                if (INTERACTION.SIGNAL_PULSE) {
                    setTimeout(() => pathElement.classList.add('signal-active'), 600);
                }

                const plugsElement = CableRenderer.createPlugs(
                    sourcePos.x, sourcePos.y,
                    targetPos.x, targetPos.y,
                    color,
                );

                this.activeCables.set(index, {
                    slotIndex: index,
                    sourceId: slot.source,
                    targetId: slot.target,
                    signalType,
                    pathElement,
                    plugsElement,
                    base: endpoints,
                    deform: null,
                });
            }
        });

        // Paso 3: eliminar cables cuyo slot ya no está activo
        for (const [slotIndex, cable] of this.activeCables) {
            if (!activeSlotIndices.has(slotIndex)) {
                this.removeCableAt(slotIndex, cable);
            }
        }

        // Paso 4: re-aplicar la Ruta destacada (§9) a los cables creados/actualizados
        this.applyRouteHighlight();
    }

    /** Conteo de enlaces activos en la matrix (utilidad de verificación). */
    getActiveCableCount(): number {
        return this.readMatrix().filter((slot: any) =>
            slot?.active === true || slot?.active === 1 || slot?.active === 'true'
        ).length;
    }

    /* ── Fase 7 (§9): API pública del drag-to-patch ── */

    /**
     * Devuelve el primer slot de la matrix sin ruta activa (libre para
     * crear un parche por drag-to-patch). Respeta el límite del modal UI
     * (DRAG_TO_PATCH.MATRIX_SLOT_LIMIT). -1 si no hay hueco.
     */
    getFreeMatrixSlot(): number {
        const matrix = this.readMatrix();
        for (let i = 0; i < DRAG_TO_PATCH.MATRIX_SLOT_LIMIT; i++) {
            const slot = matrix[i];
            const isActive =
                slot?.active === true || slot?.active === 1 || slot?.active === 'true';
            if (!isActive) return i;
        }
        return -1;
    }

    /** Número de cables SVG actualmente en pantalla. */
    get cableCount(): number {
        return this.activeCables.size;
    }

    /* ── Fase 7.3 (§7.3): API pública para la repulsión elástica ── */

    /**
     * Devuelve los cables activos para la repulsión elástica.
     * El slotIndex permite a CableInteraction escribir de vuelta
     * sin acoplarse al estado interno del manager.
     */
    getActiveCablePaths(): { slotIndex: number; pathElement: SVGPathElement }[] {
        const result: { slotIndex: number; pathElement: SVGPathElement }[] = [];
        for (const cable of this.activeCables.values()) {
            result.push({ slotIndex: cable.slotIndex, pathElement: cable.pathElement });
        }
        return result;
    }

    /**
     * Aplica (o limpia) el desplazamiento de repulsión a un cable.
     * `offset = null` restaura la forma base. No-op si el cable no existe
     * o el offset no ha cambiado (evita escribir el SVG en cada frame).
     */
    setCableDeform(slotIndex: number, offset: { x: number; y: number } | null): void {
        const cable = this.activeCables.get(slotIndex);
        if (!cable) return;

        const unchanged =
            (cable.deform?.x ?? null) === (offset?.x ?? null) &&
            (cable.deform?.y ?? null) === (offset?.y ?? null);
        if (unchanged) return;

        cable.deform = offset;
        CableRenderer.updateCablePath(
            cable.pathElement, cable.base, offset ?? undefined,
        );
    }

    /** Restaura todos los cables a su forma base (cursor fuera del rack). */
    resetAllDeforms(): void {
        for (const cable of this.activeCables.values()) {
            if (!cable.deform) continue;
            cable.deform = null;
            CableRenderer.updateCablePath(cable.pathElement, cable.base);
        }
    }

    /**
     * Aplica la tensión global del cable (0 = espagueti, 1 = tenso) y
     * redibuja todos los cables con el nuevo sag. §9 — Noodlerack/VCV Rack.
     * Conserva cualquier deformación de repulsión activa (§7.3).
     */
    applyGlobalTension(tension: number): void {
        setGlobalTension(tension);
        this.redrawAllCables();
    }

    /* ── Fase 9 (§9): API pública de la Ruta destacada ── */

    /**
     * Destaca el cable del slot seleccionado en la Matrix (añade
     * `.route-highlight`) y atenúa el resto (`.route-dimmed`).
     * `slotIndex = null` restaura todos los cables a su apariencia normal.
     * Decorativo: no-op seguro si no hay cables o el slot no existe.
     */
    highlightRoute(slotIndex: number | null): void {
        this.highlightedSlot = slotIndex;
        this.applyRouteHighlight();
    }

    /** Devuelve el slot actualmente destacado, o null si no hay ninguno. */
    getHighlightedSlot(): number | null {
        return this.highlightedSlot;
    }

    /**
     * Aplica las clases de la Ruta destacada a todos los cables.
     * Se invoca en cada sync para que los cables recién creados
     * (o los slots que cambiaron de ruta) respeten el estado actual.
     */
    private applyRouteHighlight(): void {
        for (const cable of this.activeCables.values()) {
            const isHighlighted =
                this.highlightedSlot !== null && cable.slotIndex === this.highlightedSlot;
            const isDimmed = this.highlightedSlot !== null && !isHighlighted;

            cable.pathElement.classList.toggle('route-highlight', isHighlighted);
            cable.pathElement.classList.toggle('route-dimmed', isDimmed);

            if (cable.plugsElement) {
                cable.plugsElement.classList.toggle('route-highlight', isHighlighted);
                cable.plugsElement.classList.toggle('route-dimmed', isDimmed);
            }
        }
    }

    /* ───────────────────────── internos ───────────────────────── */

    /** Lee la matrix como array (soporta array y objeto mapeado). */
    private readMatrix(): any[] {
        const win = window as any;
        const state = win.runtimeStore?.getSnapshot?.();
        const matrixData = state?.patch?.patchbayMatrix ||
            state?.preset?.patchbayMatrix ||
            [];
        return Array.isArray(matrixData)
            ? matrixData
            : (matrixData && Object.values(matrixData)) || [];
    }

    /** Elimina un cable del mapa y del SVG (con fade-out). */
    private removeCableAt(slotIndex: number, cable?: ActiveCable): void {
        const active = cable || this.activeCables.get(slotIndex);
        if (!active) return;

        CableRenderer.removeCablePath(active.pathElement);
        if (active.plugsElement) {
            active.plugsElement.style.transition = 'opacity 0.3s';
            active.plugsElement.style.opacity = '0';
            setTimeout(() => active.plugsElement?.remove(), 300);
        }
        this.activeCables.delete(slotIndex);
    }

    private removeAllCables(): void {
        for (const [slotIndex] of this.activeCables) {
            this.removeCableAt(slotIndex);
        }
    }

    /** Redibuja todos los cables sin crear ni eliminar (scroll/resize). */
    private redrawAllCables(): void {
        this.jackRegistry.refresh();

        for (const [, cable] of this.activeCables) {
            const sourcePos = this.jackRegistry.getPosition(cable.sourceId);
            const targetPos = this.jackRegistry.getPosition(cable.targetId);

            if (sourcePos && targetPos) {
                const endpoints: CableEndpoints = {
                    x1: sourcePos.x, y1: sourcePos.y,
                    x2: targetPos.x, y2: targetPos.y,
                };
                cable.base = endpoints;
                CableRenderer.updateCablePath(
                    cable.pathElement, endpoints, cable.deform ?? undefined,
                );
                if (cable.plugsElement) {
                    CableRenderer.updatePlugs(cable.plugsElement, endpoints);
                }
            }
        }
    }

    /**
     * Programa un redibujado agrupado en el siguiente frame.
     * Evita redibujar 60 veces por segundo durante un resize.
     */
    private scheduleRedraw(): void {
        if (this.pendingRedraw) return;
        this.pendingRedraw = true;
        requestAnimationFrame(() => {
            this.redrawAllCables();
            this.pendingRedraw = false;
        });
    }

    /**
     * Escucha resize + scroll de los racks (debounced).
     * El scroll interno de los racks mueve los jacks: hay que re-posicionar.
     */
    private setupLayoutListeners(): void {
        const win = window as any;
        win.addEventListener?.('resize', () => this.scheduleRedraw());

        const debouncedRefresh = () => {
            if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.debounceTimer = null;
                this.scheduleRedraw();
            }, INTERACTION.DEBOUNCE_MS);
        };

        for (const id of ['upper-rack', 'lower-rack']) {
            document.getElementById(id)
                ?.addEventListener('scroll', debouncedRefresh, { passive: true });
        }

        // Observar cambios en el DOM (módulos añadidos/quitados)
        const rackEl = document.getElementById('omega-rack');
        if (rackEl && 'MutationObserver' in window) {
            this.mutationObserver = new MutationObserver(debouncedRefresh);
            this.mutationObserver.observe(rackEl, { childList: true, subtree: true });
        }
    }

    /**
     * Suscribe cambios estructurales del runtimeStore y redibuja.
     * Se espera UN FRAME para que el DOM se actualice antes de escanear jacks.
     */
    private subscribeStructureChanges(): void {
        const store = (window as any).runtimeStore;
        if (!store?.subscribe) return;

        this.unsubscribeStore = store.subscribe((changeType: number) => {
            if (changeType & 1 /* ChangeType.Structure */) {
                requestAnimationFrame(() => this.syncCablesFromState());
            }
        });
    }
}
