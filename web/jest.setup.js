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