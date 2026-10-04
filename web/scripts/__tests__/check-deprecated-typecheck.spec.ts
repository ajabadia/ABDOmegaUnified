/**
 * La puerta que vigila el codigo congelado de `web/_Deprecated/`.
 *
 * Se prueban las funciones puras contra salidas de tsc fabricadas, NO invocando
 * tsc de verdad: el proposito de la linea base es justo que los errores
 * conocidos no fallen, y eso hay que demostrarlo con entradas controladas.
 * El comportamiento con el typecheck real se comprueba en el uso real
 * (`npm run typecheck:deprecated`), que es donde importa.
 */

import {
  buildBaseline,
  compareToBaseline,
  formatCodes,
  parseErrors,
  suppressCascadeNoise,
} from '../check-deprecated-typecheck.mjs';

/** Una linea de error de tsc tal y como la emite. */
function tscLine(file: string, line: number, code: string, message: string): string {
  return `${file}(${line},${line}): error ${code}: ${message}`;
}

describe('check-deprecated-typecheck: parseErrors', () => {
  it('extrae fichero, posicion, codigo y mensaje', () => {
    const [error] = parseErrors(
      tscLine('_Deprecated/src/data/x.ts', 12, 'TS2322', "Type 'string' is not assignable."),
    );

    expect(error).toMatchObject({
      file: '_Deprecated/src/data/x.ts',
      line: 12,
      col: 12,
      code: 'TS2322',
      message: "Type 'string' is not assignable.",
    });
  });

  it('normaliza las barras invertidas de Windows', () => {
    // En Windows tsc devuelve `_Deprecated\src\...`. La linea base se escribe a
    // mano y se revisa en el repo: si mezclara barras, cada comparaison fallaria.
    const [error] = parseErrors(tscLine('_Deprecated\\src\\data\\x.ts', 1, 'TS2307', 'no module'));

    expect(error.file).toBe('_Deprecated/src/data/x.ts');
    expect(error.identity).toContain('_Deprecated/src/data/x.ts');
    expect(error.identity).not.toContain('\\');
  });

  it('ignora lo que no son errores', () => {
    const output = [
      'tsc -p tsconfig.deprecated.json',
      '',
      'Found 34 errors.',
      'src/app/ok.ts(3,1): error TS9999: algo raro',
    ].join('\n');

    expect(parseErrors(output)).toHaveLength(1);
  });

  it('no confunde un numero de TSxxxx de mas de tres digitos', () => {
    // TS2307 es de 4 digitos: un patron `TS\d{3}` dejaria fuera la mitad de los
    // errores reales, que son justo los de modulo no encontrado.
    const [error] = parseErrors(tscLine('a.ts', 1, 'TS2307', 'Cannot find module'));

    expect(error.code).toBe('TS2307');
  });
});

describe('check-deprecated-typecheck: suppressCascadeNoise', () => {
  it('omite el implicit any de un fichero con imports sin resolver', () => {
    // El caso medido: CalibrationPanel.tsx importaba mal y sus 5 TS7006 no decian
    // nada, solo reflejaban que el import fallaba.
    const errors = [
      ...parseErrors(tscLine('CalibrationPanel.tsx', 18, 'TS2307', 'Cannot find module')),
      ...parseErrors(tscLine('CalibrationPanel.tsx', 74, 'TS7006', "Parameter 'cat' implicitly has an 'any' type.")),
      ...parseErrors(tscLine('CalibrationPanel.tsx', 74, 'TS7006', "Parameter 'idx' implicitly has an 'any' type.")),
    ];

    const { kept, suppressed } = suppressCascadeNoise(errors);

    expect(kept.map((e) => e.code)).toEqual(['TS2307']);
    expect(suppressed).toHaveLength(2);
  });

  it('NO omite un implicit any en un fichero sin imports rotos', () => {
    // La garantia importante: si se filtrase sin mirar el fichero, un implicit
    // any de verdad quedaria escondido y la puerta diria que todo va bien.
    const errors = [
      ...parseErrors(tscLine('Sano.tsx', 74, 'TS7006', "Parameter 'x' implicitly has an 'any' type.")),
    ];

    const { kept, suppressed } = suppressCascadeNoise(errors);

    expect(kept).toHaveLength(1);
    expect(suppressed).toHaveLength(0);
  });

  it('el filtro mira cada fichero por separado', () => {
    // Un TS7006 en el fichero A no se salva porque el fichero B tenga un import roto.
    const errors = [
      ...parseErrors(tscLine('Roto.tsx', 10, 'TS2307', 'Cannot find module')),
      ...parseErrors(tscLine('Sano.tsx', 74, 'TS7006', "Parameter 'x' implicitly has an 'any' type.")),
    ];

    const { kept, suppressed } = suppressCascadeNoise(errors);

    expect(suppressed).toHaveLength(0);
    expect(kept.map((e) => e.code).sort()).toEqual(['TS2307', 'TS7006']);
  });

  it('no toca ningun otro codigo de error', () => {
    // Un error de verdad (asignar un string a un number) no es cascada de nada.
    const errors = [
      ...parseErrors(tscLine('Roto.tsx', 10, 'TS2307', 'Cannot find module')),
      ...parseErrors(tscLine('Roto.tsx', 231, 'TS2322', "Type 'string' is not assignable to type 'number'.")),
    ];

    const { kept, suppressed } = suppressCascadeNoise(errors);

    expect(suppressed).toHaveLength(0);
    expect(kept.map((e) => e.code)).toEqual(['TS2307', 'TS2322']);
  });

  it('lo que sobrevive al filtro da una linea base que vuelve a compararse limpio', () => {
    const errors = [
      ...parseErrors(tscLine('Roto.tsx', 10, 'TS2307', 'Cannot find module')),
      ...parseErrors(tscLine('Roto.tsx', 74, 'TS7006', "Parameter 'x' implicitly has an 'any' type.")),
    ];

    const { kept } = suppressCascadeNoise(errors);
    const baseline = buildBaseline(kept);

    expect(baseline.known.every((k) => !k.includes('TS7006'))).toBe(true);
    expect(compareToBaseline(kept, baseline.known).newErrors).toHaveLength(0);
  });

  it('un implicit any en fichero sin imports rotos sale como error nuevo', () => {
    // La puerta completa: si alguien rompe un fichero archivado asi, tiene que sonar.
    const errors = [
      ...parseErrors(tscLine('Sano.tsx', 74, 'TS7006', "Parameter 'x' implicitly has an 'any' type.")),
    ];
    const { kept } = suppressCascadeNoise(errors);

    const result = compareToBaseline(kept, []);

    expect(result.newErrors).toHaveLength(1);
    expect(result.newErrors[0].code).toBe('TS7006');
  });
});

describe('check-deprecated-typecheck: compareToBaseline', () => {
  const known = parseErrors(tscLine('a.ts', 1, 'TS2307', 'Cannot find module'));

  it('un error que ya estaba en la linea base no es nuevo', () => {
    // El caso normal: el codigo archivado esta roto y eso ya se acepta.
    const result = compareToBaseline(known, known.map((e) => e.identity));

    expect(result.newErrors).toHaveLength(0);
    expect(result.knownErrors).toBe(1);
    expect(result.totalErrors).toBe(1);
  });

  it('un error que no estaba en la linea base es nuevo, y nombra fichero y linea', () => {
    // El caso que debe hacer fallar la puerta: alguien toco el codigo archivado.
    const added = parseErrors(tscLine('_Deprecated/src/data/calib.ts', 231, 'TS2322', 'malo'));
    const result = compareToBaseline([...known, ...added], known.map((e) => e.identity));

    expect(result.newErrors).toHaveLength(1);
    expect(result.newErrors[0]).toMatchObject({
      file: '_Deprecated/src/data/calib.ts',
      line: 231,
      code: 'TS2322',
    });
    expect(result.knownErrors).toBe(1);
  });

  it('mover el numero de linea NO crea un error nuevo', () => {
    // Sin esto, cada recuperacion (que mueve lineas) saldria con falsos positivos.
    const before = parseErrors(tscLine('a.ts', 10, 'TS2307', 'Cannot find module'));
    const after = parseErrors(tscLine('a.ts', 99, 'TS2307', 'Cannot find module'));

    expect(before[0].identity).toBe(after[0].identity);
    expect(compareToBaseline(after, [before[0].identity]).newErrors).toHaveLength(0);
  });

  it('reporta como "fixed" lo que ya no se reproduce, sin contarlo como nuevo', () => {
    // Al recuperar un fichero, su error desaparece: hay que avisar para que se
    // actualice la linea base, pero eso no es un fallo.
    const result = compareToBaseline([], known.map((e) => e.identity));

    expect(result.newErrors).toHaveLength(0);
    expect(result.fixed).toEqual(known.map((e) => e.identity));
  });

  it('una linea base vacia convierte todo en error nuevo', () => {
    // Si alguien regenera la linea base a mano y la deja vacia, todo falla: es
    // mejor que quedar verde sin comprobar nada.
    const result = compareToBaseline(known, []);

    expect(result.newErrors).toHaveLength(1);
  });
});

describe('check-deprecated-typecheck: buildBaseline', () => {
  it('deduplica identidades y las ordena, para que el diff sea legible', () => {
    // El caso real: ToastContainer.tsx falla dos veces con el mismo mensaje.
    const duplicated = [
      ...parseErrors(tscLine('_Deprecated/a.ts', 13, 'TS2307', 'Cannot find module')),
      ...parseErrors(tscLine('_Deprecated/a.ts', 14, 'TS2307', 'Cannot find module')),
    ];

    const baseline = buildBaseline(duplicated);

    expect(baseline.known).toHaveLength(1);
    expect(baseline.known[0]).toBe('_Deprecated/a.ts|TS2307|Cannot find module');
  });

  it('ordena las entradas', () => {
    const errors = [
      ...parseErrors(tscLine('_Deprecated/z.ts', 1, 'TS2307', 'z')),
      ...parseErrors(tscLine('_Deprecated/a.ts', 1, 'TS2307', 'a')),
    ];

    expect(buildBaseline(errors).known).toEqual([
      '_Deprecated/a.ts|TS2307|a',
      '_Deprecated/z.ts|TS2307|z',
    ]);
  });

  it('lo que genera vuelve a compararse limpio', () => {
    // Red de seguridad: la linea base escrita tiene que describir el estado real.
    const errors = parseErrors(tscLine('_Deprecated/a.ts', 1, 'TS2307', 'Cannot find module'));

    expect(compareToBaseline(errors, buildBaseline(errors).known).newErrors).toHaveLength(0);
  });
});

describe('check-deprecated-typecheck: formatCodes', () => {
  it('resume cuantos hay de cada codigo', () => {
    const errors = [
      ...parseErrors(tscLine('a.ts', 1, 'TS2307', 'm')),
      ...parseErrors(tscLine('b.ts', 2, 'TS2307', 'm')),
      ...parseErrors(tscLine('c.ts', 3, 'TS7006', 'm')),
    ];

    expect(formatCodes(errors)).toBe('2x TS2307, 1x TS7006');
  });

  it('no falla con la lista vacia', () => {
    expect(formatCodes([])).toBe('');
  });
});