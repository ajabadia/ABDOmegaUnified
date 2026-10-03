/**
 * Lo que hace el postbuild que replica `web/` en la raiz del repo y materializa
 * el manifiesto de rutas que Vercel exige para no abortar con ENOENT
 * (vercel/vercel#15937). Todo SOLO en Vercel.
 *
 * Se prueban las funciones puras, no el disco: crear symlinks en Windows no es
 * fiable y el CI corre en Linux, asi que lo que importa es la decision.
 */

import { entriesToLink, plan } from '../link-vercel-root-output.mjs';

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

describe('link-vercel-root-output: entriesToLink', () => {
  it('enlaza .next y node_modules, que en la raiz no existen', () => {
    // Ambos los pide el validador: el segundo fallo medido fue
    // node_modules/next/dist/build/adapter/setup-node-env.external.js.
    const linked = entriesToLink(['.next', 'node_modules', 'app'], (name) => name === 'app');
    expect(linked).toEqual(['.next', 'node_modules']);
  });

  it('no pisa lo que ya existe en la raiz del repo', () => {
    // docs/, scripts/ y modules/ son del repo: el enlace los ocultaria.
    const inRepo = new Set(['docs', 'scripts', 'modules']);
    const linked = entriesToLink(['docs', 'scripts', 'modules', '.next'], (n) => inRepo.has(n));
    expect(linked).toEqual(['.next']);
  });

  it('no enlaza nada si la raiz ya lo tiene todo', () => {
    const all = new Set(['docs', 'scripts', 'modules', '.next', 'node_modules']);
    expect(entriesToLink(['docs', 'scripts', 'modules', '.next', 'node_modules'], (n) => all.has(n))).toEqual(
      []
    );
  });
});