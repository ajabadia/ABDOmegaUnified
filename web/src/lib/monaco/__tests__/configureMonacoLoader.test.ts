/**
 * @jest-environment jsdom
 */

/**
 * El editor de código no debe depender de un CDN.
 *
 * POR QUÉ ESTE TEST EXISTE
 * -----------------------
 * `@monaco-editor/loader` trae por defecto
 * `https://cdn.jsdelivr.net/npm/monaco-editor@<version>/min/vs` (medido en la
 * librería instalada). Nadie lo reconfiguraba, así que la vista de código
 * dependía de internet: sin red se quedaba en "Loading..." para siempre y sin
 * un error que lo explicara. Estos tests fijan que la configuración local se
 * aplica y que es idempotente.
 *
 * Si alguna vez se quita `configureMonacoLoader()` de `SourceView`, el fallo se
 * ve aquí y no en producción.
 */

const configMock = jest.fn();

jest.doMock('@monaco-editor/react', () => ({
  loader: { config: configMock },
}));

type LoaderModule = typeof import('../configureMonacoLoader');

/**
 * `jest.isolateModules` + `doMock` (y no `jest.mock`) porque el módulo guarda
 * estado en el ámbito del módulo (`configured`): hay que releerlo limpio en
 * cada test. Es el mismo truco que usan los tests de `jest.config.js`.
 */
function freshModule(): LoaderModule {
  let mod!: LoaderModule;
  jest.isolateModules(() => {
    mod = require('../configureMonacoLoader') as LoaderModule;
  });
  return mod;
}

describe('configureMonacoLoader', () => {
  beforeEach(() => {
    configMock.mockClear();
  });

  it('apunta el cargador a la copia local de /monaco/vs', () => {
    const mod = freshModule();

    mod.configureMonacoLoader();

    expect(configMock).toHaveBeenCalledTimes(1);
    expect(configMock).toHaveBeenCalledWith({ paths: { vs: '/monaco/vs' } });
  });

  it('NO configura ninguna URL de CDN (jsdelivr/unpkg/…)', () => {
    const mod = freshModule();

    mod.configureMonacoLoader();

    const serialised = JSON.stringify(configMock.mock.calls);
    expect(serialised).not.toMatch(/https?:/);
  });

  it('es idempotente: llamarla dos veces no pisa la configuración', () => {
    const mod = freshModule();

    mod.configureMonacoLoader();
    mod.configureMonacoLoader();
    mod.configureMonacoLoader();

    expect(configMock).toHaveBeenCalledTimes(1);
  });

  it('expone la ruta con la que se sirve el editor', () => {
    const mod = freshModule();

    // El lector de esta vista depende de `/monaco/vs/loader.js`, que es lo que
    // deja el paso de build. Si cambia uno, tiene que cambiar el otro.
    expect(mod.MONACO_VS_PATH).toBe('/monaco/vs');
  });
});