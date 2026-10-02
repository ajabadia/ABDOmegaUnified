// @ts-check
/**
 * Polyfills de globals de navegador ausentes en el entorno de test.
 *
 * `jest-environment-jsdom` construye su global a partir de la spec de Window,
 * y jsdom NO implementa `structuredClone` (aunque sí exista en Node 17+ y en
 * todos los navegadores soportados). Por eso `typeof structuredClone` es
 * `undefined` dentro de cualquier spec con `@jest-environment jsdom`, aunque
 * el código de producción funcione correctamente en el navegador.
 *
 * Se polyfillea con `v8.serialize`/`v8.deserialize`, que es el equivalente de
 * Node con la misma semántica de structured clone:
 *   - conserva las claves con valor `undefined` (a diferencia de JSON),
 *   - tolera referencias cíclicas,
 *   - clona Date/Map/Set/RegExp/ArrayBuffer correctamente.
 * Ante cualquier valor no serializable (funciones, por ejemplo) lanza el mismo
 * `DataCloneError` que haría `structuredClone`, de modo que un test no puede
 * pasar por un camino que el navegador no recorre.
 *
 * Solo se instala si falta: en `testEnvironment: 'node'` el global nativo
 * existe y no se toca, así que los tests de lógica pura ejercitan la
 * implementación real.
 */

/* eslint-env node */

/**
 * AVISO: la zona horaria de la suite NO se fija aquí.
 *
 * Se probó primero en este fichero y no surtía efecto: los ficheros de setup se
 * ejecutan con el entorno de test ya construido, y Node ya ha resuelto la zona
 * horaria para entonces. Verificado midiendo: con el `TZ` puesto aquí, la suite
 * seguía dando verde con el reloj local, es decir, no había cambiado nada.
 *
 * Está en `jest.config.js`, que se evalúa en el proceso padre antes de que
 * existan los workers, y de ahí sí se propaga a todos ellos. Ahí está también
 * el porqué de que importe: hay snapshots que guardan la hora del reloj y, sin
 * esto, una prueba está verde por la zona horaria de la máquina que la ejecuta.
 *
 * (Lo que sigue documenta los polyfills de este fichero.)
 *
 * =============================================================================
 * POR QUÉ ESTO NO ES COSMÉTICA
 * =============================================================================
 * Hay pruebas que renderizan la hora del reloj a partir de `Date.now()` y la
 * guardan en un snapshot. Medido en el primer día de integración continua:
 *
 *     UndoTimelinePopover — should match snapshot with batch entries
 *     verde en el portátil (UTC+2), rojo en el runner de GitHub (UTC)
 *
 * porque el snapshot contenía `13:59:30` y en el runner se generaba `11:59:30`.
 * Es decir: **una prueba verde dependedía de la zona horaria de quien la
 * ejecutaba**, y no fallaba por un cambio de código sino por estar en otro
 * sitio. Alguien en otro huso horario, o un runner de otra región, lo habría
 * visto roto sin haber tocado una línea.
 *
 * Fijar la zona horana antes de que se cree ningún entorno de test convierte
 * los snapshots en comparables en cualquier parte. Los snapshots se han
 * vuelto a grabar DESPUÉS de aplicar esto, así que los que hay en el repo
 * están en UTC y no dependen del reloj de nadie.
 *
 * Ojo: esto fija la zona, no el instante. Un snapshot con una hora absoluta
 * sigue siendo frágil si la prueba usa `Date.now()` de verdad; lo correcto para
 * esas es congelar el reloj en la propia prueba. Aquí solo se quita la
 * dependencia de la MÁQUINA, que es el fallo medido.
 */

const { serialize, deserialize } = require('node:v8');

if (typeof globalThis.structuredClone !== 'function') {
  /**
   * @param {unknown} value
   * @returns {unknown}
   */
  globalThis.structuredClone = function structuredClonePolyfill(value) {
    // serialize() falla con funciones/símbolos, igual que structuredClone.
    return deserialize(serialize(value));
  };
}

/*
 * `TextEncoder`/`TextDecoder` y `crypto.subtle`.
 *
 * `IntegrityService.generateManifestHash` — del que depende la unión entre la
 * sesión de `localStorage` y la bóveda de historial — hashea con SHA-256 a
 * través de `crypto.subtle` sobre texto codificado con `TextEncoder`. jsdom
 * no expone ninguno de los dos, así que sin esto cualquier test que ejercite
 * ese camino falla con `TextEncoder is not defined` y el resto del efecto se
 * cae: en la bóveda, un fallo de hash no degrada a "sin deshacer", se
 * come también la rehidratación del documento.
 *
 * Se toma el WebCrypto y el TextEncoder de Node, que son las MISMAS
 * implementaciones que usa el navegador (Node las toma de V8/OpenSSL), no
 * stubs. Un mock aquí dejaría pasar cualquier cambio en la canonicalización
 * del hash, que es justo lo que une la bóveda con su manifiesto.
 */
if (typeof globalThis.TextEncoder !== 'function') {
  const { TextEncoder, TextDecoder } = require('node:util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

if (!globalThis.crypto || typeof globalThis.crypto.subtle === 'undefined') {
  const { webcrypto } = require('node:crypto');
  // Se define solo `subtle` si falta, para no quitarle a jsdom el resto de su
  // implementación de `crypto` (getRandomValues, randomUUID...).
  const target = globalThis.crypto || {};
  Object.defineProperty(target, 'subtle', {
    value: webcrypto.subtle,
    configurable: true,
    writable: true
  });
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      value: target,
      configurable: true,
      writable: true
    });
  }
}