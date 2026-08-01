/**
 * OMEGA — CableRenderer (Motor de Curvas Bézier)
 * Fase 2: dibuja y actualiza cables SVG colgantes en el overlay.
 *
 * La curva usa una Bézier cúbica: P0(source) → P3(target), con los
 * puntos de control C1/C2 DESPLAZADOS HACIA ABAJO para simular el
 * "sag" (panda) de un cable real que cuelga.
 *
 * En pantalla Y positivo = abajo, así que el sag se SUMA a la Y.
 */
import {
    CABLE_PHYSICS,
    CABLE_TENSION,
    CABLE_BUNDLE,
    getGlobalTension,
} from './cableConstants.js';

export interface CableEndpoints {
    x1: number; y1: number;  // Centro del jack source
    x2: number; y2: number;  // Centro del jack target
}

// Namespace SVG (necesario para crear elementos SVG con JavaScript).
// Exportado para que el drag-to-patch (Fase 7) reutilice la preview.
export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Desplazamiento lateral de un cable dentro de un "mazo" (§9 Ideas Propias).
 *
 * Si varios cables conectan el MISMO par de módulos, se separan
 * perpendicularmente al eje source→target: el cable con `position` central
 * queda sobre el eje y los demás se desplazan a cada lado. Como el offset
 * se aplica SOLO a los puntos de control de la Bézier, los extremos quedan
 * clavados en sus jacks mientras el centro corre paralelo al resto del mazo.
 *
 * @param ep         Endpoints base (sin deformación) del cable.
 * @param position   Índice del cable dentro del grupo (0..groupSize-1).
 * @param groupSize  Nº de cables del grupo (>= 2; con 1 no hay mazo).
 */
export function computeBundleSpread(
    ep: CableEndpoints,
    position: number,
    groupSize: number,
): { x: number; y: number } {
    const dx = ep.x2 - ep.x1;
    const dy = ep.y2 - ep.y1;
    const length = Math.hypot(dx, dy) || 1;

    // Perpendicular al eje source→target (normalizada)
    const nx = -dy / length;
    const ny = dx / length;

    // Centrado: con 2 cables → -SPREAD/2 y +SPREAD/2; con 3 → -SPREAD, 0, +SPREAD
    const offset = (position - (groupSize - 1) / 2) * CABLE_BUNDLE.SPREAD;

    return { x: nx * offset, y: ny * offset };
}

export class CableRenderer {

    /**
     * Calcula el string "d" del path SVG para un cable colgante.
     *
     * PASO A PASO:
     * 1. Distancia euclidiana entre los dos jacks.
     * 2. Cuánto debe colgar: sag = BASE_SAG + distancia * SAG_FACTOR
     *    (limitado a MAX_SAG para que no se salga del rack).
     * 3. Puntos de control DEBAJO de cada jack (Y + sag).
     * 4. String SVG: "M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"
     *
     * `deform` (opcional, Fase 7.3 repulsión elástica) desplaza AMBOS puntos
     * de control lateralmente para que el cable "se aparte" del cursor.
     * `bundle` (opcional, §9 mazo) desplaza ambos puntos de control
     * perpendicularmente al eje para que cables del mismo par de módulos
     * corran paralelos. Ambos offsets se suman.
     */
    static calculatePath(
        ep: CableEndpoints,
        deform?: { x: number; y: number },
        bundle?: { x: number; y: number },
    ): string {
        const { x1, y1, x2, y2 } = ep;

        // Distancia euclidiana entre los dos jacks
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Cuánto cuelga el cable (base, sin tensión)
        const baseSag = Math.min(
            CABLE_PHYSICS.BASE_SAG + distance * CABLE_PHYSICS.SAG_FACTOR,
            CABLE_PHYSICS.MAX_SAG,
        );

        // Tensión global (§9): modula el sag de "espagueti" (0) a "tenso" (1).
        // Con la tensión por defecto (0) el factor es 1 → se preserva el look actual.
        const tension = getGlobalTension();
        const sag = baseSag * (
            CABLE_TENSION.MIN_SAG_RATIO +
            (1 - CABLE_TENSION.MIN_SAG_RATIO) * (1 - tension)
        );

        // Repulsión (§7.3) + mazo (§9) se combinan en los puntos de control
        const offX = (deform?.x ?? 0) + (bundle?.x ?? 0);
        const offY = (deform?.y ?? 0) + (bundle?.y ?? 0);

        // Puntos de control: mismo X que los jacks, Y desplazada hacia abajo
        // (+ desplazamiento de repulsión si lo hay)
        const cx1 = x1 + offX;
        const cy1 = y1 + sag + offY;
        const cx2 = x2 + offX;
        const cy2 = y2 + sag + offY;

        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }

    /**
     * Crea un nuevo elemento <path> SVG para un cable.
     *
     * ATENCIÓN: usar createElementNS, NO createElement.
     * Los elementos SVG necesitan el namespace SVG para renderizarse.
     * Con createElement('path') el navegador NO lo dibuja.
     */
    static createCablePath(
        slotIndex: number,
        endpoints: CableEndpoints,
        signalType: string,
        color?: string,
    ): SVGPathElement {
        const svg = document.getElementById('patch-cables-overlay');
        if (!svg) throw new Error('[CableRenderer] SVG overlay #patch-cables-overlay not found');

        const path = document.createElementNS(SVG_NS, 'path');
        path.classList.add('patch-cable', 'entering');
        path.setAttribute('data-slot', String(slotIndex));
        path.setAttribute('data-signal', signalType);
        path.setAttribute('d', CableRenderer.calculatePath(endpoints));

        // Color personalizado del slot (§9): inline style GANA al selector CSS
        // `[data-signal]`, así que solo se aplica cuando hay override.
        if (color) path.style.stroke = color;

        svg.appendChild(path);

        // Quitar la clase 'entering' después de la animación (500ms en CSS)
        setTimeout(() => path.classList.remove('entering'), 600);

        return path;
    }

    /**
     * Aplica (o quita) el color personalizado de un cable ya existente.
     * `color = null` borra el override inline y vuelve al CSS [data-signal].
     */
    static setCableColor(path: SVGPathElement, color: string | null): void {
        if (color) {
            path.style.stroke = color;
        } else {
            path.style.removeProperty('stroke');
        }
    }

    /**
     * Actualiza la posición de un cable existente.
     * Se llama al hacer scroll, resize o mover módulos.
     * `deform` opcional: desplazamiento de repulsión (se preserva en redraws).
     * `bundle` opcional: offset lateral del mazo (§9) (se preserva en redraws).
     */
    static updateCablePath(
        path: SVGPathElement,
        endpoints: CableEndpoints,
        deform?: { x: number; y: number },
        bundle?: { x: number; y: number },
    ): void {
        path.setAttribute('d', CableRenderer.calculatePath(endpoints, deform, bundle));
    }

    /**
     * Elimina un cable del SVG con animación de fade-out.
     * El elemento se destruye 300ms después de empezar la animación.
     */
    static removeCablePath(path: SVGPathElement): void {
        path.style.transition = 'opacity 0.3s ease';
        path.style.opacity = '0';
        setTimeout(() => path.remove(), 300);
    }

    /**
     * Crea los círculos "plug" en los extremos del cable.
     * Simula visualmente el conector enchufado en el jack.
     */
    static createPlugs(
        x1: number, y1: number,
        x2: number, y2: number,
        color: string,
    ): SVGGElement {
        const svg = document.getElementById('patch-cables-overlay');
        if (!svg) throw new Error('[CableRenderer] SVG overlay not found');

        const group = document.createElementNS(SVG_NS, 'g');
        group.classList.add('cable-plugs');

        for (const [x, y] of [[x1, y1], [x2, y2]]) {
            const plug = document.createElementNS(SVG_NS, 'circle');
            plug.classList.add('cable-plug');
            plug.setAttribute('cx', String(x));
            plug.setAttribute('cy', String(y));
            plug.setAttribute('r', String(CABLE_PHYSICS.PLUG_RADIUS));
            plug.setAttribute('fill', color);
            plug.setAttribute('stroke', '#000');
            plug.setAttribute('stroke-width', '1.5');
            group.appendChild(plug);
        }

        svg.appendChild(group);
        return group;
    }

    /**
     * Mueve los plugs de un cable existente a las nuevas coordenadas.
     * Se usa en redraws por scroll/resize para no crear/destruir nodos.
     */
    static updatePlugs(group: SVGGElement, ep: CableEndpoints): void {
        const plugs = group.querySelectorAll<SVGCircleElement>('circle');
        if (plugs.length >= 1) {
            plugs[0].setAttribute('cx', String(ep.x1));
            plugs[0].setAttribute('cy', String(ep.y1));
        }
        if (plugs.length >= 2) {
            plugs[1].setAttribute('cx', String(ep.x2));
            plugs[1].setAttribute('cy', String(ep.y2));
        }
    }

    /**
     * Recolorea los plugs de un cable existente (fill). Se usa cuando
     * el color personalizado del slot cambia (§9 Color Picker).
     */
    static setPlugsColor(group: SVGGElement, color: string): void {
        group.querySelectorAll<SVGCircleElement>('circle')
            .forEach(plug => plug.setAttribute('fill', color));
    }
}
