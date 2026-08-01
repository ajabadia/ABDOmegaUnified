/**
 * OMEGA — CableInteraction (Evasión de Controles)
 * Fase 4: hace que los cables NO molesten al tocar los controles.
 *
 * Estrategia A (ghosting / "modo rayos X"):
 *  - Cuando el cursor está sobre un control (knob/jack con data-source),
 *    los cables que cruzan el módulo se vuelven semi-transparentes (.ghosted).
 *  - Si el cursor no está sobre un control → se quita el ghosting.
 *
 * Estrategia B (tecla [H]):
 *  - Alterna la clase `cables-hidden` en el overlay → oculta/muestra todos.
 *
 * Estrategia C (repulsión elástica, §7.3 — AVANZADO):
 *  - Cuando el cursor se acerca a un cable (< REPULSION_RADIUS), el cable
 *    se deforma lateralmente apartándose del cursor. Cuando el cursor se
 *    aleja, vuelve a su forma original.
 *
 * RENDIMIENTO: getPointAtLength() es nativo de SVG y muy rápido.
 * Con CURVE_SAMPLES=20 y 30 cables son ~600 comprobaciones por mousemove,
 * agrupadas por frame → perfectamente manejable.
 */
import { INTERACTION, DRAG_TO_PATCH } from './cableConstants.js';
import { CableRenderer, SVG_NS } from './CableRenderer.js';
import { sendUpdate } from '../patchbay/matrixEvents.js';
import { buildMetadataFromInventory } from '../patchbay/matrixLayout.js';
import { OmegaLog } from '../../RPC/omega_log.js';
import type { PatchCableManager } from './PatchCableManager.js';

/** Configura el ghosting de cables sobre el rack. */
export function setupCableGhosting(): void {
    const rack = document.getElementById('omega-rack');
    if (!rack) return;

    let ghostingActive = false;

    rack.addEventListener('mousemove', (e: MouseEvent) => {
        const target = e.target as Element | null;
        if (!target?.closest) return;

        // ¿Está el cursor sobre un control interactivo?
        // Todos los controles (knobs, sliders, jacks) emiten `data-source`
        // (CellRenderer/PortRenderer). Buscamos con closest() porque los
        // knobs contienen sub-elementos internos.
        const isOverControl = target.closest('[data-source]') !== null;

        if (isOverControl) {
            // El módulo padre puede ser un módulo Era 7 o un panel aseptic.
            const modulePanel = target.closest('.module, .aseptic-module-panel');
            if (!modulePanel) return;

            ghostingActive = true;
            const moduleRect = modulePanel.getBoundingClientRect();
            const rackRect = rack.getBoundingClientRect();

            // Coordenadas del módulo RELATIVAS al rack (mismo espacio que
            // el path del cable, que se calcula relativo al rack).
            const area = {
                left:   moduleRect.left - rackRect.left,
                top:    moduleRect.top - rackRect.top,
                right:  moduleRect.right - rackRect.left,
                bottom: moduleRect.bottom - rackRect.top,
            };

            // Comprobar cada cable activo
            document.querySelectorAll('.patch-cable').forEach((cable) => {
                const path = cable as SVGPathElement;
                path.classList.toggle('ghosted', doesCableCrossArea(path, area));
            });
        } else if (ghostingActive) {
            // El cursor ya no está sobre un control → quitar ghosting
            ghostingActive = false;
            clearGhosting();
        }
    });

    // Al salir del rack, limpiar todo
    rack.addEventListener('mouseleave', () => {
        ghostingActive = false;
        clearGhosting();
    });
}

/** Quita la clase 'ghosted' de todos los cables. */
function clearGhosting(): void {
    document.querySelectorAll('.patch-cable.ghosted').forEach((c) => {
        c.classList.remove('ghosted');
    });
}

/**
 * Comprueba si algún punto de la curva del cable cae dentro del
 * rectángulo dado.
 *
 * USA getPointAtLength(): método NATIVO de SVG que devuelve {x, y}
 * de cualquier punto a lo largo de un <path>. Muestreamos
 * INTERACTION.CURVE_SAMPLES puntos equidistantes.
 *
 * Devuelve false (sin lanzar) si el path no admite consultas de
 * longitud (elemento desconectado o longitud cero).
 */
export function doesCableCrossArea(
    path: SVGPathElement,
    area: { left: number; top: number; right: number; bottom: number },
): boolean {
    let totalLength: number;
    try {
        totalLength = path.getTotalLength();
    } catch {
        return false;
    }
    if (!totalLength || !Number.isFinite(totalLength) || totalLength <= 0) return false;

    const samples = INTERACTION.CURVE_SAMPLES;

    for (let i = 0; i <= samples; i++) {
        const point = path.getPointAtLength((i / samples) * totalLength);
        if (
            point.x >= area.left  && point.x <= area.right &&
            point.y >= area.top   && point.y <= area.bottom
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Tecla [H] para ocultar/mostrar todos los cables.
 * No se activa si el usuario está escribiendo en un input/textarea.
 */
export function setupCableVisibilityToggle(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            return;
        }

        if (e.key === 'h' || e.key === 'H') {
            const overlay = document.getElementById('patch-cables-overlay');
            if (overlay) {
                overlay.classList.toggle('cables-hidden');
                OmegaLog.info('CABLES', `[H] cables ${overlay.classList.contains('cables-hidden') ? 'ocultos' : 'visibles'}`);
            }
        }
    });
}

/**
 * Modo "solo cables" / Schematic (§9).
 *
 * Alterna la clase `cables-only` en `#omega-rack`: los módulos se ocultan
 * (via CSS con `visibility`, NUNCA `display:none` → las coordenadas de los
 * jacks se conservan y los cables no se despegan) y queda visible solo el
 * esquema de conexionado: cables + plugs.
 *
 * Se activa desde el botón del top-menu `#cable-solo-toggle` o la tecla [S].
 * No se activa si el usuario está escribiendo en un input/textarea.
 *
 * Devuelve `{ isActive, dispose }` para consultar el estado y desregistrar
 * los listeners (mismo patrón que `setupCableRepulsion`).
 */
export function setupCableSoloMode(): { isActive: () => boolean; dispose: () => void } {
    const rack = document.getElementById('omega-rack');
    if (!rack) {
        return {
            isActive: () => false,
            dispose: () => {},
        };
    }

    const btn = document.getElementById('cable-solo-toggle');

    const isActive = () => rack.classList.contains('cables-only');

    const apply = (active: boolean) => {
        rack.classList.toggle('cables-only', active);
        btn?.classList.toggle('active', active);
        OmegaLog.info('CABLES', `Modo solo-cables ${active ? 'activado' : 'desactivado'}`);
    };

    const onClick = () => apply(!isActive());

    const onKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            return;
        }
        if (e.key === 's' || e.key === 'S') {
            apply(!isActive());
        }
    };

    btn?.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    return {
        isActive,
        dispose: () => {
            btn?.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKey);
        },
    };
}

/* ══════════════════════════════════════════════════════════════════
   Estrategia C: Repulsión Elástica (§7.3)
   ══════════════════════════════════════════════════════════════════ */

/**
 * Calcula el desplazamiento de repulsión para un cable dado el cursor.
 *
 * 1. Muestrea REPULSION_SAMPLES puntos equidistantes de la curva.
 * 2. Halla el punto más cercano al cursor (distancia euclidiana).
 * 3. Si la distancia < REPULSION_RADIUS → devuelve un vector con
 *    dirección "desde el cursor hacia el cable" y magnitud
 *    REPULSION_STRENGTH * falloff (lineal con la distancia).
 * 4. Si el cursor está lejos (o el path no consultable) → null.
 *
 * El vector desplaza los puntos de control del cable, haciendo que
 * el cable "se abulte" alejándose del cursor.
 */
export function computeRepulsionOffset(
    path: SVGPathElement,
    cursorX: number,
    cursorY: number,
): { x: number; y: number } | null {
    let totalLength: number;
    try {
        totalLength = path.getTotalLength();
    } catch {
        return null;
    }
    if (!totalLength || !Number.isFinite(totalLength) || totalLength <= 0) return null;

    // 1. Punto de la curva más cercano al cursor
    let minDistance = Infinity;
    let closestX = cursorX;
    let closestY = cursorY;

    const samples = INTERACTION.REPULSION_SAMPLES;
    for (let i = 0; i <= samples; i++) {
        const p = path.getPointAtLength((i / samples) * totalLength);
        const d = Math.hypot(p.x - cursorX, p.y - cursorY);
        if (d < minDistance) {
            minDistance = d;
            closestX = p.x;
            closestY = p.y;
        }
    }

    // 2. ¿Dentro del radio de repulsión?
    if (minDistance > INTERACTION.REPULSION_RADIUS) return null;

    // 3. Dirección: desde el cursor hacia el cable (aparta el cable del cursor)
    let dx = closestX - cursorX;
    let dy = closestY - cursorY;
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;

    // 4. Magnitud con falloff lineal (más cerca → más empuje)
    const falloff = 1 - minDistance / INTERACTION.REPULSION_RADIUS;
    const scale = INTERACTION.REPULSION_STRENGTH * falloff;

    return { x: dx * scale, y: dy * scale };
}

/**
 * Configura la repulsión elástica de cables sobre el rack.
 *
 * Recibe el PatchCableManager activo (evita depender del global window).
 * Devuelve una función de limpieza para desregistrar los listeners.
 *
 * RENDIMIENTO: un solo pase por frame (rAF), solo sobre los cables que
 * estén dentro del radio. Los cables lejanos se dejan intactos.
 */
export function setupCableRepulsion(manager: PatchCableManager): () => void {
    const rack = document.getElementById('omega-rack');
    if (!rack) return () => {};

    let frameScheduled = false;
    let cursorX = 0;
    let cursorY = 0;
    let disposed = false;

    const applyRepulsion = () => {
        if (disposed) return;
        frameScheduled = false;

        const cables = manager.getActiveCablePaths();
        for (const { slotIndex, pathElement } of cables) {
            const offset = computeRepulsionOffset(pathElement, cursorX, cursorY);
            manager.setCableDeform(slotIndex, offset);
        }
    };

    const onMove = (e: MouseEvent) => {
        const rect = rack.getBoundingClientRect();
        cursorX = e.clientX - rect.left;
        cursorY = e.clientY - rect.top;
        if (!frameScheduled) {
            frameScheduled = true;
            requestAnimationFrame(applyRepulsion);
        }
    };

    const onLeave = () => manager.resetAllDeforms();

    rack.addEventListener('mousemove', onMove, { passive: true });
    rack.addEventListener('mouseleave', onLeave);

    return () => {
        disposed = true;
        rack.removeEventListener('mousemove', onMove);
        rack.removeEventListener('mouseleave', onLeave);
        manager.resetAllDeforms();
    };
}

/* ══════════════════════════════════════════════════════════════════
   Fase 7 (§9): Drag-to-patch
   Arrastrar desde un jack de SALIDA hasta un jack de ENTRADA crea un
   cable: se reserva un slot libre de la matrix y se despachan
   source/target/active vía sendUpdate() (el backend NO auto-activa).
   ══════════════════════════════════════════════════════════════════ */

interface JackRoles {
    outputs: Set<string>;
    inputs: Set<string>;
}

/**
 * Roles (sources = salidas, targets = entradas) desde el metadata de la
 * inventory. Se recalcula en cada pointerdown: los módulos pueden cambiar
 * entre drags. El fallback DOM de buildMetadataFromInventory cubre los
 * módulos aseptic.
 */
function buildJackRoles(): JackRoles {
    const outputs = new Set<string>();
    const inputs = new Set<string>();
    const win = window as any;
    try {
        const items = win.inventoryStore?.getAllItems?.() || [];
        const { sources, targets } = buildMetadataFromInventory(
            items,
            win.runtimeStore?.getSnapshot?.(),
        );
        for (const item of sources) outputs.add(item.id);
        for (const item of targets) inputs.add(item.id);
    } catch (err) {
        OmegaLog.warn('CABLES', 'buildJackRoles() failed:', err);
    }
    return { outputs, inputs };
}

/** ¿Es un jack de SALIDA? Prioriza data-jack-direction, luego metadata. */
function isOutputSocket(socket: Element, roles: JackRoles): boolean {
    const dir = socket.closest('.module-jack')?.getAttribute('data-jack-direction');
    if (dir) return dir === 'output' || dir === 'out';
    const qualifiedId = socket.getAttribute('data-source') || '';
    return roles.outputs.has(qualifiedId);
}

/** ¿Es un jack de ENTRADA? Prioriza data-jack-direction, luego metadata. */
function isInputSocket(socket: Element, roles: JackRoles): boolean {
    const dir = socket.closest('.module-jack')?.getAttribute('data-jack-direction');
    if (dir) return dir === 'input' || dir === 'in';
    const qualifiedId = socket.getAttribute('data-source') || '';
    return roles.inputs.has(qualifiedId);
}

/** qualifiedId del socket: data-source o, si falta, el registro del manager. */
function resolveQualifiedId(manager: PatchCableManager, socket: Element): string {
    const attr = socket.getAttribute('data-source');
    if (attr) return attr;
    for (const jack of manager.jackRegistry.getAll().values()) {
        if (jack.el === socket) return jack.id;
    }
    return '';
}

/** Punto del socket relativo al rack: registry primero, fallback rect DOM. */
function getJackPoint(
    manager: PatchCableManager,
    socket: Element,
    rack: HTMLElement,
): { x: number; y: number } {
    const qualifiedId = resolveQualifiedId(manager, socket);
    const pos = qualifiedId ? manager.jackRegistry.getPosition(qualifiedId) : null;
    if (pos) return pos;

    const rect = socket.getBoundingClientRect();
    const rackRect = rack.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - rackRect.left,
        y: rect.top + rect.height / 2 - rackRect.top,
    };
}

/** Despacha la creación del parche en el primer slot libre de la matrix. */
function commitPatch(
    manager: PatchCableManager,
    sourceId: string,
    targetId: string,
): void {
    if (!sourceId || !targetId) return;

    const slot = manager.getFreeMatrixSlot();
    if (slot < 0) {
        OmegaLog.warn('CABLES', 'Drag-to-patch: no hay slot libre en la matrix');
        return;
    }

    sendUpdate(slot, 'source', sourceId);
    sendUpdate(slot, 'target', targetId);
    sendUpdate(slot, 'amount', 1);
    sendUpdate(slot, 'active', true);

    OmegaLog.info('CABLES', `Drag-to-patch: slot ${slot} ← ${sourceId} → ${targetId}`);
}

/**
 * Configura el drag-to-patch sobre el rack.
 *
 * Flujo:
 *  1. `pointerdown` en un jack de SALIDA arma la sesión (solo visual).
 *  2. `pointermove` superando MIN_DRAG_DISTANCE crea la preview SVG colgante
 *     y resalta los jacks de ENTRADA válidos.
 *  3. `pointerup` sobre un jack de entrada válido despacha source/target/
 *     active (slot libre vía getFreeMatrixSlot()).
 *
 * Notas:
 *  - El overlay tiene `pointer-events: none`: la preview es solo visual y
 *    nunca roba el puntero.
 *  - `document.elementFromPoint` se usa con fallback a `e.target`
 *    (jsdom no lo implementa).
 *  - No se usa `setPointerCapture` (jsdom no lo tiene); el pointerup se
 *    escucha en document para no perderse fuera del rack.
 *
 * Devuelve `{ dispose }` (mismo patrón que setupCableRepulsion).
 */
export function setupDragToPatch(manager: PatchCableManager): { dispose: () => void } {
    const rack = document.getElementById('omega-rack');
    if (!rack) return { dispose: () => {} };

    const overlay = document.getElementById('patch-cables-overlay');
    const svg = overlay?.querySelector<SVGSVGElement>('svg');

    let pending: {
        sourceSocket: Element;
        sourceId: string;
        sourcePoint: { x: number; y: number };
        startX: number;
        startY: number;
        roles: JackRoles;
    } | null = null;

    let preview: SVGPathElement | null = null;
    let activeJack: Element | null = null;

    const clearHighlight = () => {
        activeJack?.classList.remove(DRAG_TO_PATCH.DRAG_ACTIVE_JACK_CLASS);
        activeJack = null;
        document
            .querySelectorAll(`.${DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS}`)
            .forEach((el) => el.classList.remove(DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS));
    };

    const removePreview = () => {
        preview?.remove();
        preview = null;
    };

    const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;

        const socket = (e.target as Element | null)
            ?.closest('.port-socket[data-source]');
        if (!socket) return;

        const roles = buildJackRoles();
        if (!isOutputSocket(socket, roles)) return;

        pending = {
            sourceSocket: socket,
            sourceId: resolveQualifiedId(manager, socket),
            sourcePoint: getJackPoint(manager, socket, rack),
            startX: e.clientX,
            startY: e.clientY,
            roles,
        };
    };

    const onPointerMove = (e: PointerEvent) => {
        if (!pending) return;

        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        if (!preview && Math.hypot(dx, dy) < DRAG_TO_PATCH.MIN_DRAG_DISTANCE) return;

        // 1. Crear la preview colgante (coordenadas relativas al rack)
        if (!preview) {
            if (!svg) {
                endDrag();
                return;
            }
            preview = document.createElementNS(SVG_NS, 'path');
            preview.classList.add(DRAG_TO_PATCH.CABLE_PREVIEW_CLASS);
            preview.setAttribute('data-signal', 'cv');
            svg.appendChild(preview);

            activeJack = pending.sourceSocket;
            activeJack.classList.add(DRAG_TO_PATCH.DRAG_ACTIVE_JACK_CLASS);
        }

        const rect = rack.getBoundingClientRect();
        preview.setAttribute(
            'd',
            CableRenderer.calculatePath({
                x1: pending.sourcePoint.x,
                y1: pending.sourcePoint.y,
                x2: e.clientX - rect.left,
                y2: e.clientY - rect.top,
            }),
        );

        // 2. Resaltar el jack de entrada válido bajo el cursor
        const hit = document.elementFromPoint?.(e.clientX, e.clientY)
            ?.closest('.port-socket[data-source]')
            || (e.target as Element | null)?.closest('.port-socket[data-source]');

        document
            .querySelectorAll(`.${DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS}`)
            .forEach((el) => el.classList.remove(DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS));

        if (
            hit &&
            hit !== pending.sourceSocket &&
            isInputSocket(hit, pending.roles)
        ) {
            hit.classList.add(DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS);
        }
    };

    const onPointerUp = (e: PointerEvent) => {
        if (!pending) return;

        const hit = document.elementFromPoint?.(e.clientX, e.clientY)
            ?.closest('.port-socket[data-source]')
            || (e.target as Element | null)?.closest('.port-socket[data-source]');

        if (
            preview &&
            hit &&
            hit !== pending.sourceSocket &&
            isInputSocket(hit, pending.roles)
        ) {
            commitPatch(
                manager,
                pending.sourceId,
                resolveQualifiedId(manager, hit),
            );
        }

        endDrag();
    };

    const endDrag = () => {
        pending = null;
        removePreview();
        clearHighlight();
    };

    rack.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    return {
        dispose: () => {
            endDrag();
            rack.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        },
    };
}
