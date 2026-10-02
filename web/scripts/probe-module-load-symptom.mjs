/**
 * @purpose Reproduce la cadena exacta que sigue un módulo 404 hasta el síntoma que ve el usuario.
 * @purpose_en Reproduces the exact chain a 404'd module follows up to the symptom the user actually sees.
 *
 * La cadena, con la referencia de archivo en cada salto:
 *
 *   1. sharedModuleCatalog.ts:159  fetchManifest NO comprueba res.ok
 *   2. (sin comprobar nada)       devuelve el cuerpo del 404 parseado
 *   3. useWorkbenchFileOperations:187  `if (manifest)` — un STRING es truthy
 *   4. useWorkbenchFileOperations:189  `manifest.ui = {}` sobre un string
 *   5. (ES modules = modo estricto) TypeError
 *   6. useWorkbenchFileOperations:198  toast "Error loading module X"
 *
 * El usuario ve un TypeError sobre la propiedad `ui` y piensa que el
 * MÓDULO está mal formateado. La causa real —que el fichero no existe— no
 * aparece en ninguna parte.
 *
 * Este fichero es ESM a propósito: los módulos de Next son ESM y por tanto
 * modo estricto. En sloppy mode la asignación fallaría en silencio, que sería
 * PEOR; conviene comprobar que el modo estricto es el que nos salva de una
 * pérdida aún más silenciosa.
 */

/** Lo que devuelve fetchManifest ante un 404 (medido con js-yaml). */
const manifest = 'Not Found';

console.log('1-2. fetchManifest devuelve:', JSON.stringify(manifest), `(tipo ${typeof manifest})`);
console.log('3. `if (manifest)` →', manifest ? 'PASA (string es truthy)' : 'falla');
console.log('');
console.log('4. `manifest.ui = {}` sobre ese valor:');

try {
  // ESM ⇒ modo estricto. Esta es la línea exacta del llamante.
  // eslint-disable-next-line
  manifest.ui = {};
  console.log('   → NO lanzó. El documento habría recibido un string como manifiesto.');
} catch (e) {
  console.log(`   → ${e.constructor.name}: ${e.message}`);
  console.log('');
  console.log('5. Eso es lo que ve el usuario: un TypeError sobre `ui`,');
  console.log('   que dice "el módulo tiene un formato raro", no "el módulo no existe".');
}