// @ts-check

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

/**
 * Fija la zona horaria de TODA la suite, en el proceso padre.
 *
 * =============================================================================
 * POR QUÉ AQUÍ Y NO EN `jest.setup.js` (medido, no supuesto)
 * =============================================================================
 * Hay pruebas que renderizan la hora del reloj desde `Date.now()` y la guardan
 * en un snapshot. El primero que se ejecutó fuera de mi portátil —la integración
 * continua— falló con el snapshot ya grabado:
 *
 *     UndoTimelinePopover — should match snapshot with batch entries
 *     verde en UTC+2, rojo en el runner (UTC)
 *
 * El snapshot contenía `13:59:30`; en UTC se generaba `11:59:30`. O sea: la
 * prueba estaba en verde **por la zona horaria de la máquina**, no por el
 * código. Cualquiera en otro huso la habría visto rota sin haber tocado nada.
 *
 * Poner `process.env.TZ` en `setupFiles` NO funciona: los ficheros de setup se
 * ejecutan cuando el entorno de test ya está construido, y para entonces Node
 * ya ha resuelto la zona horaria. Verificado: con el TZ puesto ahí, la suite
 * seguía dando verde con el reloj local, es decir, no había cambiado nada.
 * En el config —que se evalúa en el padre, antes de que existan los workers—
 * sí se propaga a todos ellos.
 *
 * Los snapshots se regrabaron DESPUÉS de aplicar esto, así que los del repo
 * están en UTC y no dependen del reloj de nadie.
 */
process.env.TZ = 'UTC';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Use node environment since most tests are backend/service logic
  // Hook tests use @jest-environment jsdom directive per file
  testEnvironment: 'node',

  // Match both .test.ts/.spec.ts and .test.tsx/.spec.tsx files
  testMatch: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],

  // Exclude E2E tests (Playwright), node_modules, and legacy code
  //
  // `/wasm-runtime/third_party/` es codigo de TERCEROS (WAMR, Intel), y ni
  // siquiera se versiona aqui: `.gitignore:98` ignora `web/wasm-runtime/`.
  // Sus tests de la extension de VSCode importan `mocha` y `chai`, que no son
  // dependencias de este proyecto, asi que Jest los recogia por el `testMatch`
  // y la suite entera acababa en rojo con "Cannot find module 'mocha'".
  // No es un test nuestro que se pueda arreglar ni un bug: es un fichero ajeno
  // con otro runner. Se excluye el arbol entero, no el fichero, porque esto se
  // descarga de forma automatica y puede traer mas tests con el mismo patron.
  testPathIgnorePatterns: ['/node_modules/', '/legacy/', '/e2e/', '/wasm-runtime/third_party/'],

  // Polyfills de globals de navegador que jsdom no implementa
  // (hoy `structuredClone`). Ver web/jest.setup.js.
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Verbose output for debugging
  verbose: true,

  // Prevent 'React is not defined' errors with jsdom
  injectGlobals: true,

  // Redirect UniversalRenderer to mock in moduleNameMapper to bypass
  // SWC/import resolution mismatch with jest.mock + @/ aliases.
  moduleNameMapper: {
    // Scripts/utilidades que viven en la RAÍZ del repo (fuera de web/).
    // Los tests de Jest solo corren con rootDir=web/, asi que sin este alias
    // habria que importar con rutas relativas brittle tipo '../../../../scripts/...'.
    // El script se importa aqui para REUSAR su logica de clasificacion en vez
    // de reimplementarla (una copia puede desviarse y dar verde sobre un arbol
    // corrupto). Ver web/src/lib/__tests__/checkNodeModulesIntegrity.test.ts.
    '^@scripts/(.*)$': '<rootDir>/../scripts/$1',
    // Matches resolved absolute paths like D:\...omega-ui-core\renderers\UniversalRenderer
    '[\\\\/]omega-ui-core[\\\\/]renderers[\\\\/]UniversalRenderer$':
      '<rootDir>/src/omega-ui-core/renderers/__mocks__/UniversalRenderer.tsx',
    // Catch resolved absolute paths for editors — more flexible regex
    'editors(?:[/\\\\]index)?(?:\\.\\w+)?$':
      '<rootDir>/src/features/manifest-editor/components/inspector/editors/__mocks__/ComponentEditor.tsx',
  },
};

module.exports = createJestConfig(customJestConfig);
