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
  classifyDependency,
  classifyImports,
  extractImports,
  planMove,
  planRecovery,
  resolveArchivedCounterpart,
  resolveFirstMatch,
  resolveRecoveryGroup,
  stripDeprecatedPrefix,
  toPosix,
} from '../recover-deprecated-file.mjs';

/**
 * Arbol de mentira para probar `resolveRecoveryGroup` sin tocar disco.
 *
 * `archivedSources` se indexa por la ruta VIVA de destino (sin `_Deprecated/`),
 * porque es sobre esas como razona el grupo, pero lo que hay en el disco es la
 * copia de DENTRO de `_Deprecated/`. Por eso `exists` contesta que si a
 * `_Deprecated/src/c.ts` y que NO a `src/c.ts`: un fichero archivado no es
 * visible en el arbol vivo. Si se hiciera al reves, el script daria al hermano
 * por ya presente y no lo propondría, que es justo lo que se quiere probar.
 *
 * `livePaths` son los que sí existen en el arbol vivo, ya resueltos.
 */
function fakeIo(archivedSources, livePaths = []) {
  const exists = (p) => {
    if (p.startsWith(`${'_Deprecated'}/`)) return archivedSources.has(stripDeprecatedPrefix(p));
    return livePaths.includes(p);
  };
  const readFile = (p) => archivedSources.get(stripDeprecatedPrefix(p)) ?? null;
  return { exists, readFile };
}

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
describe('recover-deprecated-file: resolveFirstMatch', () => {
  it('devuelve la ruta con su extension cuando existe', () => {
    const exists = (p) => p === 'src/a.ts';
    expect(resolveFirstMatch('src/a', exists)).toBe('src/a.ts');
  });

  it('devuelve la ruta SIN sufijo cuando lo que existe es un directorio', () => {
    // Este es el caso que dio dos falsos positivos al medir: un directorio con
    // index.ts resuelve, pero el valor devuelto es '' y '' es falsy en JS. Por eso
    // los que llaman comparan contra null y no contra su verdad.
    const exists = (p) => p === 'src/lib';
    expect(resolveFirstMatch('src/lib', exists)).toBe('src/lib');
  });

  it('devuelve null cuando no existe nada', () => {
    expect(resolveFirstMatch('src/a', () => false)).toBeNull();
  });

  it('prueba el index de un directorio antes de rendirse', () => {
    const exists = (p) => p === 'src/lib/index.ts';
    expect(resolveFirstMatch('src/lib', exists)).toBe('src/lib/index.ts');
  });
});

describe('recover-deprecated-file: resolveArchivedCounterpart', () => {
  it('devuelve la ruta sin prefijo si el hermano esta archivado', () => {
    const exists = (p) => p === '_Deprecated/src/data/calibration-data.ts';
    expect(resolveArchivedCounterpart('src/data/calibration-data', exists)).toBe(
      'src/data/calibration-data.ts',
    );
  });

  it('devuelve null si no hay contraparte archivada', () => {
    expect(resolveArchivedCounterpart('src/nada', () => false)).toBeNull();
  });
});

describe('recover-deprecated-file: classifyDependency', () => {
  it('marca ok un relativo que ya esta vivo', () => {
    const dep = classifyDependency('src/a/b.ts', './c', (p) => p === 'src/a/c.ts');
    expect(dep.kind).toBe('ok');
    expect(dep.target).toBe('src/a/c.ts');
  });

  it('marca sibling un relativo que solo existe archivado', () => {
    // El caso de AudioShowcase.tsx: sus 6 hermanos de ./audio/.
    const dep = classifyDependency(
      'src/components/ui/AudioShowcase.tsx',
      './audio/AudioPlaylist',
      (p) => p === '_Deprecated/src/components/ui/audio/AudioPlaylist.tsx',
    );
    expect(dep.kind).toBe('sibling');
    expect(dep.sibling).toBe('src/components/ui/audio/AudioPlaylist.tsx');
  });

  it('calcula el relativo desde la ruta VIVA, no desde la archivada', () => {
    // Si se calculara desde `_Deprecated/`, la distancia seria distinta y este
    // import pareceria no existir. Al medir, hacerlo asi dio 24 falsos "missing".
    const dep = classifyDependency(
      'src/a/b.ts',
      './c',
      (p) => p === '_Deprecated/src/a/c.ts',
    );
    expect(dep.kind).toBe('sibling');
    expect(dep.sibling).toBe('src/a/c.ts');
  });

  it('marca sibling un alias archivado, en el caso de CalibrationPanel', () => {
    const dep = classifyDependency(
      'src/components/ui/CalibrationPanel.tsx',
      '@/data/calibration-data',
      (p) => p === '_Deprecated/src/data/calibration-data.ts',
    );
    expect(dep.kind).toBe('sibling');
    expect(dep.sibling).toBe('src/data/calibration-data.ts');
  });

  it('da por bueno un alias que ya esta vivo', () => {
    const dep = classifyDependency('src/x.ts', '@/lib/y', (p) => p === 'src/lib/y.ts');
    expect(dep.kind).toBe('ok');
  });

  it('busca tambien en la segunda ruta de paths, la que no es src/', () => {
    // tsconfig declara `"@/*": ["./src/*", "./*"]`. Un modulo archivado puede
    // estar en la segunda, y mirar solo la primera lo daria por perdido.
    const dep = classifyDependency(
      'src/x.ts',
      '@/lib/z',
      (p) => p === '_Deprecated/lib/z.ts',
    );
    expect(dep.kind).toBe('sibling');
    expect(dep.sibling).toBe('lib/z.ts');
  });

  it('marca missing un import que no esta ni vivo ni archivado', () => {
    const dep = classifyDependency('src/x.ts', './nada', () => false);
    expect(dep.kind).toBe('missing');
  });

  it('ignora los paquetes de npm, que no son rutas', () => {
    expect(classifyDependency('src/x.ts', 'react', () => false).kind).toBe('external');
  });
});

describe('recover-deprecated-file: resolveRecoveryGroup', () => {
  it('un fichero sin hermanos devuelve un grupo de uno', () => {
    // Los 55 de 69 archivados son de este tipo: se mueven solos.
    const io = fakeIo(new Map([['src/ solitary.ts', 'export const x = 1;\n']]));
    const group = resolveRecoveryGroup('src/solitario.ts', io);
    expect(group.files).toEqual(['src/solitario.ts']);
    expect(group.siblings).toBe(0);
    expect(group.unresolved).toEqual([]);
  });

  it('une al hermano que falta, con la ruta viva de destino', () => {
    const io = fakeIo(
      new Map([
        ['src/ui/Panel.tsx', "import A from './audio/A';\n"],
        ['src/ui/audio/A.tsx', 'export const A = 1;\n'],
      ]),
    );
    const group = resolveRecoveryGroup('src/ui/Panel.tsx', io);
    expect(group.files).toEqual(['src/ui/Panel.tsx', 'src/ui/audio/A.tsx']);
    expect(group.siblings).toBe(1);
    expect(group.edges).toHaveLength(1);
    expect(group.edges[0].spec).toBe('./audio/A');
  });

  it('sigue la cadena entera: si B necesita a C, C tambien va', () => {
    // El grupo es TRANSITIVO. Moverse solo con A y B dejaria a C huerfano y
    // el grupo no cerraria, que es justo lo que esta funcn evita.
    const io = fakeIo(
      new Map([
        ['src/a.ts', "import B from './b';\n"],
        ['src/b.ts', "import C from './c';\n"],
        ['src/c.ts', 'export const C = 1;\n'],
      ]),
    );
    const group = resolveRecoveryGroup('src/a.ts', io);
    expect(group.files.sort()).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(group.siblings).toBe(2);
  });

  it('agrupa a los 6 hermanos de un solo fichero, como AudioShowcase', () => {
    const nombres = ['useAudioPlayer', 'AudioPlaylist', 'AudioVisualizer', 'AudioControls', 'AudioTrackInfo', 'AudioMetadataGrid'];
    const imports = nombres.map((n, i) => `import A${i} from './audio/${n}';`).join('\n');
    const io = fakeIo(
      new Map([
        ['src/components/ui/AudioShowcase.tsx', `${imports}\n`],
        ...nombres.map((n) => [`src/components/ui/audio/${n}.${n.startsWith('use') ? 'ts' : 'tsx'}`, 'export const x = 1;\n']),
      ]),
    );
    const group = resolveRecoveryGroup('src/components/ui/AudioShowcase.tsx', io);
    expect(group.siblings).toBe(6);
    expect(group.files).toHaveLength(7);
    expect(group.unresolved).toEqual([]);
  });

  it('no se cuelga con un ciclo entre hermanos', () => {
    // Los ciclos son normales entre modulos de un mismo grupo. Sin el `seen`,
    // este bucle no terminaria nunca.
    const io = fakeIo(
      new Map([
        ['src/a.ts', "import B from './b';\n"],
        ['src/b.ts', "import A from './a';\n"],
      ]),
    );
    const group = resolveRecoveryGroup('src/a.ts', io);
    expect(group.files.sort()).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('no repite un hermano al que apuntan dos ficheros', () => {
    // Tanto a.ts como b.ts necesitan a c.ts. c.ts tiene que aparecer UNA vez en
    // el grupo: si se repitiera, `git mv` intentaria moverlo dos veces.
    const io = fakeIo(
      new Map([
        ['src/a.ts', "import B from './b';\nimport C from './c';\nimport D from './d';\n"],
        ['src/b.ts', "import C from './c';\n"],
        ['src/c.ts', 'export const C = 1;\n'],
        ['src/d.ts', 'export const D = 1;\n'],
      ]),
    );
    const group = resolveRecoveryGroup('src/a.ts', io);
    expect(group.files).toHaveLength(4);
    expect(group.files.filter((f) => f === 'src/c.ts')).toHaveLength(1);
  });

  it('reporta como unresolved lo que no esta ni vivo ni archivado', () => {
    // Esto es lo que impide mover a medias: aunque el grupo este completo,
    // falta escribir ese modulo.
    const io = fakeIo(new Map([['src/a.ts', "import X from './nada';\n"]]));
    const group = resolveRecoveryGroup('src/a.ts', io);
    expect(group.unresolved).toHaveLength(1);
    expect(group.unresolved[0].spec).toBe('./nada');
  });

  it('detecta que un grupo no cierra por un alias sin contraparte', () => {
    // El caso real de InstrumentCard.tsx: su hermano `./card/CardSpecs` si se
    // puede mover, pero `@/data/instruments` no esta ni vivo ni archivado, asi
    // que el grupo esta completo y aun asi NO compila. Por eso `unresolved` va
    // aparte: el grupo puede estar entero y no cerrar.
    const io = fakeIo(
      new Map([
        ['src/InstrumentCard.tsx', "import { type Instrument } from '@/data/instruments';\nimport S from './card/CardSpecs';\n"],
        ['src/card/CardSpecs.tsx', 'export default S;\n'],
      ]),
    );
    const group = resolveRecoveryGroup('src/InstrumentCard.tsx', io);
    expect(group.files).toContain('src/card/CardSpecs.tsx');
    expect(group.siblings).toBe(1);
    expect(group.unresolved).toHaveLength(1);
    expect(group.unresolved[0].spec).toBe('@/data/instruments');
  });
});

describe('recover-deprecated-file: planRecovery', () => {
  it('deja mover un grupo cerrado', () => {
    const plan = planRecovery({ files: ['a.ts', 'b.ts'], siblings: 1, unresolved: [] });
    expect(plan.move).toBe(true);
    expect(plan.reason).toBe('closed');
    expect(plan.count).toBe(2);
  });

  it('deja mover un grupo de uno solo', () => {
    // Los 55 de 69 archivados se mueven asi: sin hermanos y sin cambios.
    expect(planRecovery({ files: ['a.ts'], siblings: 0, unresolved: [] }).move).toBe(true);
  });

  it('NO deja mover un grupo con imports sin destino', () => {
    // La regla que evita mover a medias. Un grupo entero sin cerrar sigue
    // siendo peor que dejarlo quieto en _Deprecated.
    const plan = planRecovery({
      files: ['a.ts', 'b.ts'],
      siblings: 1,
      unresolved: [{ from: 'a.ts', spec: './nada', target: 'src/nada' }],
    });
    expect(plan.move).toBe(false);
    expect(plan.reason).toBe('unresolved');
  });

  it('NO deja mover si falta un origen en _Deprecated', () => {
    const plan = planRecovery({
      files: ['a.ts', 'b.ts'],
      siblings: 1,
      unresolved: [],
      blockers: ['b.ts'],
    });
    expect(plan.move).toBe(false);
    expect(plan.reason).toBe('missing-source');
    expect(plan.blockers).toEqual(['b.ts']);
  });

  it('el motivo "missing-source" pisa a "unresolved": primero hay que tener los ficheros', () => {
    const plan = planRecovery({
      files: ['a.ts'],
      siblings: 0,
      unresolved: [{ from: 'a.ts', spec: './nada', target: 'src/nada' }],
      blockers: ['a.ts'],
    });
    expect(plan.reason).toBe('missing-source');
  });
});
