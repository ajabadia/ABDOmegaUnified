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
   CONFIG — Paleta de colores del cable (§9 Color Picker)
   Swatches que ofrece el inspector de la Matrix para personalizar
   el color de un cable. Los 4 primeros coinciden con los colores
   por defecto de cada tipo de señal; el resto son extras.
   El color elegido se persiste en el slot (campo `color`) y se
   serializa en el patch (C++ VarSerialization/OmegaUiBridge).
   ═══════════════════════════════════════════════════════ */
export const CABLE_PALETTE: string[] = [
    '#10b981', // Verde esmeralda (audio)
    '#06b6d4', // Cian neón (CV)
    '#ef4444', // Rojo carmesí (gate)
    '#a855f7', // Violeta neón (midi)
    '#f59e0b', // Ámbar
    '#ec4899', // Rosa neón
    '#22c55e', // Verde lima
    '#3b82f6', // Azul
    '#f97316', // Naranja
    '#e5e7eb', // Blanco grisáceo
] as const;

/**
 * Normaliza un color de cable a formato hex "#rrggbb" (o "#rgb").
 * Devuelve null si el valor no es un hex válido (evita inyectar
 * CSS arbitrario en el stroke).
 */
export function normalizeCableColor(color: unknown): string | null {
    if (typeof color !== 'string') return null;
    const c = color.trim().toLowerCase();
    if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/.test(c)) return c;
    return null;
}

/**
 * Resuelve el color efectivo de un cable:
 * color personalizado del slot (si es hex válido) → color del tipo
 * de señal → cian (CV) por defecto.
 */
export function resolveCableColor(slotColor: unknown, signalType: string): string {
    return normalizeCableColor(slotColor) || SIGNAL_COLORS[signalType] || SIGNAL_COLORS.cv;
}

/* ═══════════════════════════════════════════════════════
   CONFIG — Agrupación en "mazo" (§9 Ideas Propias)
   Si varios cables conectan el MISMO PAR de módulos, se separan
   perpendicularmente al eje source→target para correr paralelos
   en el centro del recorrido y abrirse hacia sus jacks en los
   extremos. Cada cable conserva su propio path (color, tooltip,
   ghosting, drag-to-patch) — el "mazo" es solo visual.
   ═══════════════════════════════════════════════════════ */
export const CABLE_BUNDLE = {
    /**
     * Separación lateral (px) entre cables consecutivos de un mazo.
     * Se aplica a los puntos de control de la Bézier; el centro de
     * la curva recibe ~0.75× ese desplazamiento, que con stroke de
     * 4px mantiene los cables del mazo casi tocándose en el centro.
     */
    SPREAD: 10,
} as const;

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
   CONFIG — Tooltip del cable (§8.2, de Patchcab/VCV Rack)
   Mantener pulsada la tecla Alt + pasar sobre un cable muestra
   un tooltip con la ruta (source → target), el tipo de señal
   y el multiplicador del slot.
   ═══════════════════════════════════════════════════════ */
export const TOOLTIP = {
    /** Tecla modificadora que activa el hover-inspect del cable */
    MODIFIER_KEY: 'Alt',

    /**
     * Radio (px) alrededor del cursor que cuenta un cable como "hovered".
     * El stroke del cable mide 4px, así que con 8 hay margen cómodo.
     */
    HOVER_RADIUS: 8,

    /** Puntos a muestrear por cable para hallar el más cercano al cursor */
    CURVE_SAMPLES: 20,

    /** Clase CSS del tooltip */
    TOOLTIP_CLASS: 'cable-tooltip',

    /** Desplazamiento (px) del tooltip respecto al cursor */
    OFFSET_X: 14,
    OFFSET_Y: 14,

    /** Prefijo del rótulo de slot (ej: "CABLE 04") */
    SLOT_PREFIX: 'CABLE',
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
