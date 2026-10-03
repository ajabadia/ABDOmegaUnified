/**
 * El enlace `<repo>/.next` -> `web/.next` que Vercel necesita para no abortar
 * el despliegue con ENOENT (vercel/vercel#15937) SOLO se crea en Vercel.
 *
 * Estos tests comprueban la decision, no el enlace en disco: Symlink de disco
 * no existe en Windows de forma fiable y el CI corre en Linux, asi que lo que
 * importa es que `plan()` diga 'skip' en local y 'link' en un despliegue.
 */

import { plan } from '../link-vercel-root-output.mjs';

describe('link-vercel-root-output', () => {
  const enVercel = { onVercel: true, buildDirExists: true, linkExists: false };

  it('crea el enlace cuando Vercel valida la salida', () => {
    expect(plan(enVercel)).toEqual({
      action: 'link',
      reason: 'el validador de Vercel busca web/ en la ruta',
    });
  });

  it('no toca nada fuera de Vercel, aunque el build exista', () => {
    const decision = plan({ ...enVercel, onVercel: false });
    expect(decision.action).toBe('skip');
    expect(decision.reason).toBe('no es un despliegue de Vercel');
  });

  it('no enlaza si web/.next no existe (build que no llego a terminar)', () => {
    const decision = plan({ ...enVercel, buildDirExists: false });
    expect(decision.action).toBe('skip');
    expect(decision.reason).toBe('web/.next no existe');
  });

  it('no sustituye un .next real de la raiz', () => {
    const decision = plan({ ...enVercel, linkExists: true });
    expect(decision.action).toBe('skip');
    expect(decision.reason).toBe('la raiz ya tiene un .next real');
  });
});