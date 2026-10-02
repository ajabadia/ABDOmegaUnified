// @ts-check

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

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
  testPathIgnorePatterns: ['/node_modules/', '/legacy/', '/e2e/'],

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
