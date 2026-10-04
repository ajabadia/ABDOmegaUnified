/**
 * La mecánica de recuperar un fichero de `_Deprecated`.
 *
 * Se prueban las funciones puras contra rutas y fuentes fabricadas, no
 * moviendo ficheros de verdad: el repo tiene 69 archivados y mover alguno en
 * un test seria una prova destructiva. Lo que se comprueba aqui es la regla
 * que hace funcionar el script:
 *
 *   - los imports RELATIVOS se resuelven solos al quitar el prefijo
 *     `_Deprecated/` (medido con ToastContainer.tsx), asi que no se reescriben;
 *   - los alias `@/` NO se resuelven, porque apuntan a `web/src/x` y lo
 *     archivado vive en `web/_Deprecated/src/x`.
 */

import {
  classifyImports,
  extractImports,
  planMove,
  stripDeprecatedPrefix,
  toPosix,
} from '../recover-deprecated-file.mjs';

describe('recover-deprecated-file: rutas', () => {
  it('quita el prefijo _Deprecated/ al planejar el destino', () => {
    expect(planMove('src/features/manifest-editor/components/shared/ToastContainer.tsx')).toEqual({
      from: '_Deprecated/src/features/manifest-editor/components/shared/ToastContainer.tsx',
      to: 'src/features/manifest-editor/components/shared/ToastContainer.tsx',
    });
  });

  it('acepta la ruta con el prefijo puesto, y no lo duplica', () => {
    const plan = planMove('_Deprecated/src/types/cell-conversion.ts');
    expect(plan.from).toBe('_Deprecated/src/types/cell-conversion.ts');
    expect(plan.to).toBe('src/types/cell-conversion.ts');
  });

  it('normaliza barras de Windows, que es como las devuelve git', () => {
    const plan = planMove('src\\components\\ui\\Button.tsx');
    expect(plan.from).toBe('_Deprecated/src/components/ui/Button.tsx');
    expect(plan.to).toBe('src/components/ui/Button.tsx');
  });

  it('rechaza una ruta que se sale del arbol', () => {
    // Un ".." permitiria mover algo de fuera de _Deprecated, que es justo lo
    // que este script no debe hacer.
    expect(() => planMove('../src/app/Route.tsx')).toThrow(/relativa/);
  });

  it('stripDeprecatedPrefix solo quita el prefijo exacto', () => {
    expect(stripDeprecatedPrefix('_Deprecated/src/a.ts')).toBe('src/a.ts');
    expect(stripDeprecatedPrefix('src/a.ts')).toBe('src/a.ts');
    expect(stripDeprecatedPrefix('_DeprecatedOld/src/a.ts')).toBe('_DeprecatedOld/src/a.ts');
  });

  it('toPosix normaliza sin tocar una ruta ya correcta', () => {
    expect(toPosix('a\\b\\c.ts')).toBe('a/b/c.ts');
    expect(toPosix('a/b/c.ts')).toBe('a/b/c.ts');
  });
});

describe('recover-deprecated-file: extractImports', () => {
  it('saca los imports con from', () => {
    const src = "import A from '../A';\nimport { b } from '@/lib/b';\n";
    expect(extractImports(src)).toEqual(['../A', '@/lib/b']);
  });

  it('saca los imports de efecto secundario, que no llevan from', () => {
    // El fallo que rompio `next build` en el archivado: el analisis de
    // importadores no contaba estos, y por eso un fichero se dio por muerto
    // cuando no lo estaba.
    const src = "import './omega-init';\nimport A from '../A';\n";
    expect(extractImports(src)).toContain('./omega-init');
  });

  it('saca la carga dinamica, que el analisis anterior se comia', () => {
    // El segundo fallo propio: se contaron contenedores vivos como muertos
    // porque solo se buscaba `import ... from`.
    const src = "const m = () => import('../RackPlayerContainer');\n";
    expect(extractImports(src)).toEqual(['../RackPlayerContainer']);
  });

  it('saca los require', () => {
    expect(extractImports("const x = require('../legacy');\n")).toEqual(['../legacy']);
  });

  it('devuelve lista vacia si no hay imports', () => {
    expect(extractImports('export const x = 1;\n')).toEqual([]);
  });
});

describe('recover-deprecated-file: classifyImports', () => {
  it('ignora los imports relativos: se resuelven solos al mover', () => {
    // El caso medido con ToastContainer.tsx: su unico error era
    // `../ToastContainer`, y desaparecio solo al quitar el prefijo.
    const { aliases, ok, broken } = classifyImports(
      'src/features/manifest-editor/components/shared/ToastContainer.tsx',
      ['../ToastContainer'],
    );

    expect(aliases).toBe(0);
    expect(ok).toEqual([]);
    expect(broken).toEqual([]);
  });

  it('marca como roto un alias cuyo destino no existe en src/', () => {
    // El caso de CalibrationPanel.tsx: `@/data/calibration-data` apunta a
    // web/src/data/..., que no existe porque el fichero esta archivado.
    const { broken } = classifyImports('src/components/ui/CalibrationPanel.tsx', [
      '@/data/calibration-data',
    ]);

    expect(broken).toHaveLength(1);
    expect(broken[0].spec).toBe('@/data/calibration-data');
    expect(broken[0].target).toBe('src/data/calibration-data');
  });

  it('da por bueno un alias que existe en el arbol vivo', () => {
    // Un alias a algo que nunca se movido sigue funcionando: no hay que
    // alarmar de algo que ya esta bien.
    const { ok, broken } = classifyImports('src/components/ui/CalibrationPanel.tsx', [
      '@/features/manifest-editor/components/ToastContainer',
    ]);

    expect(ok).toHaveLength(1);
    expect(broken).toHaveLength(0);
  });

  it('cuenta los alias pero no los relativos', () => {
    const { aliases } = classifyImports('src/x.tsx', ['@/a', '../b', '@/c']);
    expect(aliases).toBe(2);
  });
});