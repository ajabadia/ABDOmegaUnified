/**
 * @purpose Genera un documento nuevo con identificador único y manifiesto estructuralmente independiente, para que abrir un documento no pueda corromper a otro por referencias compartidas.
 * @purpose_en Generates a new document with a unique id and a structurally independent manifest, so opening a document can never corrupt another through shared references.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @lastUpdated 2026-10-02T00:00:00.000Z
 */

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { DEFAULT_MANIFEST } from '../constants/defaults';

/**
 * POR QUÉ ESTE ARCHIVO EXISTE
 *
 * Dos problemas, ambos discretos y ambos con consecuencias cuando se abren
 * varios documentos.
 *
 * EL IDENTIFICADOR
 *
 * El id NO puede ser `Date.now()`. Esa función tiene resolución de
 * milisegundo, así que dos "Nuevo" pulsados con 3 ms de diferencia production
 * el mismo id — y `OPEN_DOCUMENT` trata un id repetido como "cambiar al
 * documento ya existente" en vez de crear uno nuevo. El usuario pulsa dos
 * veces y no ocurre nada. Es el mismo defecto que se corrigió una vez en
 * `omega-ui-core/utils/historyEntryId.ts` para las entradas de historial, y
 * por eso se reutiliza aquí su patrón (contador monotónico + nonce de sesión)
 * en vez de inventar un segundo esquema de ids.
 *
 * LA REFERENCIA COMPARTIDA
 *
 * `normalizeManifest` (`constants/defaults.ts`) hace un spread SUPERFICIAL. Su
 * campo más profundo es:
 *
 *     ui: { ...(m.ui || {}), ..., tree: m.ui?.tree || DEFAULT_MANIFEST.ui.tree }
 *
 * Ese `||` entrega la referencia del objeto `DEFAULT_MANIFEST` TAL CUAL, sin
 * copiar. Con un solo documento eso es inofensivo porque nadie más la toca. Con
 * varios, dos documentos recién creados comparten la MISMA referencia de
 * `ui.tree`: mover un nodo en el documento A lo mueve también en el documento
 * B, y el síntoma aparece como un bug de renderizado en una pestaña que el
 * usuario no está tocando.
 *
 * `normalizeManifest` no se puede arreglar sin más sin romper su contrato (es
 * la frontera de normalización del schema y sus tests asumen el spread
 * superficial), así que el clonado ocurre AQUÍ, en el punto donde se crea un
 * documento nuevo, que es donde el aliasing nace.
 */

/**
 * Un manifiesto cuyo `id` es obligatorio.
 *
 * Existe solo para el type-checker: refleja lo que `createNewManifest` ya
 * garantiza de facto. No introduce ninguna restricción nueva, solo deja de
 * obligar a los llamadores a tratar `id` como posiblemente indefinido.
 */
export type NewManifest = OMEGA_Manifest & { id: string };

/** Nonce de sesión: instante en base36 + sufijo aleatorio. Ordenable y único. */
const SESSION_NONCE: string = `${Date.now().toString(36)}${Math.random()
  .toString(36)
  .slice(2, 8)}`;

/** Contador del módulo, compartido por todos los documentos de esta sesión. */
let counter = 0;

/**
 * Devuelve el siguiente id de documento.
 *
 * @example nextDocumentId() // → "doc_m1x2y3_000001"
 */
export function nextDocumentId(): string {
  counter += 1;
  // Relleno a 6 dígitos para que el id ORDENE por creación dentro de la
  // sesión: sin él, `..._10` se ordenaría antes que `..._9`.
  return `doc_${SESSION_NONCE}_${String(counter).padStart(6, '0')}`;
}

/**
 * Copia profunda de un manifiesto.
 *
 * `structuredClone` y no `JSON.parse(JSON.stringify(...))`: el manifiesto
 * contiene `undefined`, y el round-trip por JSON los convierte en `null`,
 * silhoueteando campos opcionales en `exactOptionalPropertyTypes`. Además
 * `structuredClone` lanza un error ruidoso si algún día el manifiesto deja de
 * ser clonable, en vez de producir un documento medio vacío en silencio.
 */
function cloneManifest(manifest: OMEGA_Manifest): OMEGA_Manifest {
  return structuredClone(manifest);
}

/**
 * Crea el contenido de un documento nuevo: un manifiesto base con id y nombre
 * propios, y SIN ninguna referencia compartida con `DEFAULT_MANIFEST` ni con
 * ningún otro documento.
 *
 * @param name Nombre legible de la pestaña. Si se omite, se usa el del
 *   manifiesto por defecto.
 *
 * @returns Un manifiesto con `id` garantizado. El tipo devuelto estrecha
 *   `OMEGA_Manifest` porque un documento nuevo siempre lo tiene: sin este
 *   estrechamiento, `openDocument(manifest.id, manifest)` no compila bajo
 *   `exactOptionalPropertyTypes`, ya que `OMEGA_Manifest.id` es opcional.
 */
export function createNewManifest(name?: string): NewManifest {
  const manifest = cloneManifest(DEFAULT_MANIFEST);
  const id = nextDocumentId();

  return {
    ...manifest,
    // `OMEGA_Manifest.id` es opcional en el tipo, pero un documento NUEVO
    // siempre tiene id: es lo que lo distingue del resto y lo que
    // `OPEN_DOCUMENT` usa como clave. Se estrecha el tipo en la firma para que
    // quien llame no tenga que comprobar un `undefined` que no puede ocurrir.
    id,
    metadata: {
      ...manifest.metadata,
      name: name ?? manifest.metadata?.name ?? 'New OMEGA Module',
    },
    // Se clonan también los contenedores que `normalizeManifest` reutiliza
    // por referencia. `DEFAULT_MANIFEST.resources` es un objeto vacío y
    // `entities`/`nodes` son arrays vacíos, así que hoy no importaría; se
    // dejan como copia propia igualmente para que este helper siga siendo
    // correcto si el manifiesto por defecto gana contenido.
    resources: { ...manifest.resources },
    entities: [...(manifest.entities ?? [])],
    nodes: [...(manifest.nodes ?? [])],
    ui: {
      ...manifest.ui,
      palette: { ...manifest.ui?.palette },
      sizes: { ...manifest.ui?.sizes },
      // `ui.tree` es opcional en el tipo (`exactOptionalPropertyTypes`), pero
      // `DEFAULT_MANIFEST` lo define siempre. El fallback mantiene el tipo
      // honesto en vez de mentir con un `as`.
      tree: structuredClone(manifest.ui?.tree ?? DEFAULT_MANIFEST.ui.tree),
    },
  };
}
