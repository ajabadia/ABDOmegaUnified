/**
 * OMEGA — Patch Cable System: Constants & Signal Types
 * Fase 1: configuración del cable (estética), física de redraw,
 * y resolutor de tipos de señal (SignalTypeResolver).
 *
 * Fuente única de verdad de IDs: la MATRIX.
 *   - qualifiedId = "{instanceId}.{portId}"  (ej: "1.saw_out")
 *   - instanceId SIEMPRE numérico (ej: "1")
 *   - formato "{typeId}_{idx}" SOLO como fallback de módulos aseptic
 *     sin instanceId numérico (ver matrixLayout.ts buildMetadataFromInventory).
 */
import { OmegaLog } from '../../RPC/omega_log.js';
import { buildMetadataFromInventory } from '../patchbay/matrixLayout.js';

/* ═══════════════════════════════════════════════════════
   CONFIG — Física y apariencia del cable
   REGLA: si un junior necesita ajustar "cuánto cuelga el cable" o
   "qué color tiene", solo toca ESTE fichero. No hay números mágicos
   dispersos por el código.
   ═══════════════════════════════════════════════════════ */
export const CABLE_PHYSICS = {
    /** Caída mínima en píxeles (cable corto entre jacks cercanos) */
    BASE_SAG: 40,

    /** Factor de caída según distancia (más lejos → más cuelga) */
    SAG_FACTOR: 0.15,

    /** Máxima caída permitida (para que cables muy largos no se salgan del rack) */
    MAX_SAG: 200,

    /** Grosor del cable en píxeles */
    STROKE_WIDTH: 4,

    /** Radio del círculo "plug" en los extremos del cable */
    PLUG_RADIUS: 5,
} as const;

/* ═══════════════════════════════════════════════════════
   CONFIG — Tensión global del cable (§9, de Noodlerack/VCV Rack)
   Slider global que controla cuánto cuelgan los cables,
   de "espagueti" (máximo sag) a "tenso" (sag mínimo).
   ═══════════════════════════════════════════════════════ */
export const CABLE_TENSION = {
    /** Tensión por defecto: 0 = "espagueti" (máximo sag, look actual). */
    DEFAULT: 0,

    /**
     * Fracción de sag que conserva un cable al 100% de tensión ("tenso").
     * 1 = el sag no cambia; 0 = cable completamente recto.
     */
    MIN_SAG_RATIO: 0.2,
} as const;

/**
 * Tensión global actual (0..1). Estado a nivel de módulo para que
 * CableRenderer.calculatePath() la lea sin cambiar su firma.
 * La UI la ajusta con setGlobalTension().
 */
let globalTension: number = CABLE_TENSION.DEFAULT;

/** Tensión global actual (0 = espagueti, 1 = tenso). */
export function getGlobalTension(): number {
    return globalTension;
}

/** Ajusta la tensión global, recortada a [0, 1]. */
export function setGlobalTension(tension: number): void {
    globalTension = Math.min(1, Math.max(0, tension));
}

export const SIGNAL_COLORS: Record<string, string> = {
    audio: '#10b981', // Verde esmeralda
    cv:    '#06b6d4', // Cian neón
    gate:  '#ef4444', // Rojo carmesí
    midi:  '#a855f7', // Violeta neón
};

/* ═══════════════════════════════════════════════════════
   CONFIG — Interacción (Fase 4+)
   ═══════════════════════════════════════════════════════ */
export const INTERACTION = {
    /** Radio en px alrededor del cursor para activar ghosting */
    GHOST_DETECTION_RADIUS: 80,

    /** Opacidad del cable en modo ghost */
    GHOST_OPACITY: 0.12,

    /** Puntos a muestrear en la curva Bézier para detección de colisión */
    CURVE_SAMPLES: 20,

    /** Tiempo de debounce para resize/scroll (ms) */
    DEBOUNCE_MS: 50,

    /** Clase CSS aplicada a cables en modo ghost */
    GHOST_CLASS: 'ghosted',

    /** Clase CSS del overlay cuando los cables están ocultos ([H]) */
    HIDDEN_CLASS: 'cables-hidden',

    /**
     * Pulso de señal (Fase 5, §8.3 — OPCIONAL).
     * Animación de "flujo" sobre los cables activos.
     * DESACTIVADO por defecto: sin telemetría por slot no hay forma de
     * distinguir un patch guardado de uno sonando, y pulsa todos los cables.
     * Activarlo: INTERACTION.SIGNAL_PULSE = true.
     */
    SIGNAL_PULSE: false,

    /* ── Estrategia C: Repulsión elástica (§7.3, AVANZADO) ── */

    /** Distancia (px) bajo la cual el cable empieza a deformarse del cursor */
    REPULSION_RADIUS: 60,

    /** Desplazamiento lateral MÁXIMO de los puntos de control (px) */
    REPULSION_STRENGTH: 90,

    /** Puntos a muestrear por cable para hallar el punto más cercano al cursor */
    REPULSION_SAMPLES: 20,
} as const;

/* ═══════════════════════════════════════════════════════
   CONFIG — Drag-to-patch (Fase 7)
   Arrastrar desde un jack de SALIDA hasta un jack de ENTRADA
   crea un cable directamente en el rack (sin abrir el modal).
   El backend NO auto-activa el slot: el drag debe enviar
   active:true además de source/target.
   ═══════════════════════════════════════════════════════ */
export const DRAG_TO_PATCH = {
    /** Distancia mínima (px) antes de que el pointerdown se considere drag */
    MIN_DRAG_DISTANCE: 6,

    /** Clase CSS del path de preview colgante */
    CABLE_PREVIEW_CLASS: 'cable-drag-preview',

    /** Clase CSS del jack de origen mientras hay drag */
    DRAG_ACTIVE_JACK_CLASS: 'drag-active-jack',

    /** Clase CSS de los jacks de entrada válidos mientras hay drag */
    TARGET_HIGHLIGHT_CLASS: 'target-highlight',

    /**
     * Límite de slots de la matrix a respetar al buscar slot libre
     * (el modal UI usa 32; el backend admite hasta 64).
     */
    MATRIX_SLOT_LIMIT: 32,
} as const;

/* ═══════════════════════════════════════════════════════
   SignalTypeResolver
   Resuelve el tipo de señal de un qualifiedId consultando el
   metadata de la inventory (buildMetadataFromInventory).
   Sustituye al roto getSignalType() del plan original:
   se refresca en cada init() y syncCablesFromState().
   ═══════════════════════════════════════════════════════ */
export class SignalTypeResolver {
    private signalMap: Map<string, string> = new Map();

    /**
     * Refresca el mapa { qualifiedId -> tipo de señal } a partir
     * del estado actual de la inventory + snapshot de runtimeStore.
     */
    refresh(inventoryStore: any, state: any): void {
        const next = new Map<string, string>();
        try {
            const items = inventoryStore?.getAllItems?.() || [];
            const { sources, targets } = buildMetadataFromInventory(items, state);
            for (const item of [...sources, ...targets]) {
                next.set(item.id, String(item.type || 'cv'));
            }
        } catch (err) {
            OmegaLog.warn('CABLES', 'SignalTypeResolver.refresh() failed:', err);
        }
        this.signalMap = next;
    }

    /**
     * Devuelve el tipo de señal en minúsculas ('audio', 'cv', 'gate', 'midi').
     * Por defecto 'cv' si el qualifiedId no existe en el metadata.
     */
    getSignalType(id: string): string {
        const type = this.signalMap.get(id);
        return type ? type.toLowerCase() : 'cv';
    }
}
