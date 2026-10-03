/**
 * El postbuild que replica `web/` en la raiz del repo para que el validador de
 * Vercel resuelva las rutas sin el segmento `web` (vercel/vercel#15937). Todo
 * SOLO en Vercel.
 *
 * Se prueban las funciones puras, no el disco: crear symlinks en Windows no es
 * fiable y el CI corre en Linux, asi que lo que importa es la decision.
 */

import { plan, planLinks } from '../link-vercel-root-output.mjs';

describe('link-vercel-root-output: plan', () => {
  it('replica web/ cuando Vercel valida la salida', () => {
    expect(plan({ onVercel: true, buildDirExists: true })).toEqual({
      action: 'link',
      reason: 'el validador de Vercel busca web/ en la ruta',
    });
  });

  it('no toca nada fuera de Vercel, aunque el build exista', () => {
    const decision = plan({ onVercel: false, buildDirExists: true });
    expect(decision.action).toBe('skip');
    expect(decision.reason).toBe('no es un despliegue de Vercel');
  });

  it('no enlaza si web/.next no existe (build que no llego a terminar)', () => {
    const decision = plan({ onVercel: true, buildDirExists: false });
    expect(decision.action).toBe('skip');
    expect(decision.reason).toBe('web/.next no existe');
  });
});

describe('link-vercel-root-output: planLinks', () => {
  it('enlaza .next y node_modules, que en la raiz no existen', () => {
    // El segundo fallo medido fue
    // node_modules/next/dist/build/adapter/setup-node-env.external.js.
    const links = planLinks([{ name: '.next' }, { name: 'node_modules' }, { name: 'app' }], () => false);
    expect(links).toEqual([
      { from: '.next', to: '.next' },
      { from: 'node_modules', to: 'node_modules' },
      { from: 'app', to: 'app' },
    ]);
  });

  it('no pisa lo que ya existe en la raiz del repo', () => {
    // docs/, scripts/ y modules/ son del repo: el enlace los ocultaria.
    const inRepo = new Set(['docs', 'scripts', 'modules']);
    const links = planLinks(
      [{ name: 'docs' }, { name: 'scripts' }, { name: 'modules' }, { name: '.next' }],
      (rel) => inRepo.has(rel)
    );
    expect(links).toEqual([{ from: '.next', to: '.next' }]);
  });

  it('fusiona un directorio que existe en los dos sitios', () => {
    // Tercer fallo medido: /vercel/path0/docs/ADR-009.md. La raiz tiene docs/
    // (del repo) y web/ tiene docs/ADR-009.md (trazado por Next). Enlazar el
    // directorio entero ocultaria el del repo, asi que se enlaza dentro lo que
    // falte.
    const tree = [{ name: 'docs', children: [{ name: 'ADR-009.md' }, { name: 'ESTADO-APLICACION.md' }] }];
    const inRepo = new Set(['docs', 'docs/ESTADO-APLICACION.md']);
    expect(planLinks(tree, (rel) => inRepo.has(rel))).toEqual([
      { from: 'docs/ADR-009.md', to: 'docs/ADR-009.md' },
    ]);
  });

  it('no baja mas de un nivel dentro de un directorio compartido', () => {
    // Un nivel basta para lo medido; sin tope, replicar el arbol entero en la
    // raiz del repo seria mas lento de lo que el despliegue ahorra.
    const tree = [
      {
        name: 'docs',
        children: [{ name: 'assets', children: [{ name: 'logo.png' }] }],
      },
    ];
    expect(planLinks(tree, () => true)).toEqual([]);
  });

  it('no hace nada si la raiz ya lo tiene todo', () => {
    const all = new Set(['docs', 'scripts', 'modules', '.next', 'node_modules']);
    const tree = [{ name: 'docs' }, { name: 'scripts' }, { name: 'modules' }, { name: '.next' }, { name: 'node_modules' }];
    expect(planLinks(tree, (rel) => all.has(rel))).toEqual([]);
  });
});