/**
 * @purpose Comprueba qué hace `fetchManifest` cuando el módulo NO existe, para demostrar la pérdida silenciosa.
 * @purpose_en Checks what `fetchManifest` does when the module does NOT exist, to demonstrate the silent loss.
 *
 * `loadCatalog` comprueba `res.ok`, avisa y cae al catálogo generado.
 * `fetchManifest`, diez líneas más abajo, NO comprueba `res.ok`: lee el
 * cuerpo de la respuesta, intenta JSON y, si falla, se lo pasa a `yaml.load`.
 *
 * La pregunta que este script responde: ante un 404, ¿lanza un error que
 * diga "falta el módulo", o devuelve basura silenciosamente?
 */

'use strict';

const yaml = require('js-yaml');

const BODIES = {
  '404 de Next (dev)': 'This page could not be found.',
  '404 de Next (prod, HTML)':
    '<!DOCTYPE html><html><head><title>404</title></head><body><h1>404</h1></body></html>',
  '404 de un CDN': 'Not Found',
  'HTML de error de Vercel':
    '<!DOCTYPE html><html><head><title>404: Not Found</title></head><body>404</body></html>',
};

// Esto es EXACTAMENTE lo que hace fetchManifest con el cuerpo de un 404.
function whatFetchManifestReturns(text) {
  try {
    return { via: 'JSON.parse', value: JSON.parse(text) };
  } catch {
    try {
      return { via: 'yaml.load', value: yaml.load(text) };
    } catch (e) {
      return { via: 'LANZÓ', value: `${e.name}: ${String(e.message).slice(0, 90)}` };
    }
  }
}

console.log('Qué devuelve fetchManifest ante un cuerpo de 404:\n');
for (const [name, body] of Object.entries(BODIES)) {
  const r = whatFetchManifestReturns(body);
  console.log(`  ${name}`);
  console.log(`    vía    : ${r.via}`);
  console.log(`    valor  : ${JSON.stringify(r.value)}`);
  console.log(
    `    tipo   : ${typeof r.value}`,
    r.value === null ? '(NULO — el llamante comprobará .metadata sobre null)' : ''
  );
  console.log('');
}

console.log('Diagnóstico:');
console.log('  Ninguno de estos cuerpos menciona el MÓDULO que falta.');
console.log('  El llamante recibe un string, no un manifiesto, y el fallo');
console.log('  aparece más tarde como "undefined is not an object" o similar,');
console.log('  muy lejos de la causa real: el fichero no está.');
console.log('  fetchSource, en cambio, sí comprueba res.ok y nombra el módulo.');