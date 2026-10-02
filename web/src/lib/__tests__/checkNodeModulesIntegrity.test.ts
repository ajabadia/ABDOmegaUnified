/**
 * Tests de la lógica de clasificación del doctor de node_modules.
 *
 * IMPORTAN `classifyManifest` del propio script en vez de reimplementarla: una
 * copia en el test es una segunda fuente de verdad que puede desviarse del
 * script real y dar verde sobre un árbol corrupto. Eso es exactamente la
 * regresión que este archivo existe para evitar.
 *
 * Por qué vive aquí y no junto al script: el único runner de tests del repo es
 * el Jest de `web/` (rootDir = web/), así que un test en `scripts/` no se
 * descubriría. El import se resuelve con el alias `@scripts/*` de
 * `web/jest.config.js`.
 */
import { classifyManifest, classifyEntryFile } from '@scripts/check_node_modules_integrity.mjs';

/** Buffer con nulos, imitando el patrón real de un install interrumpido. */
const nulls = (len: number): Buffer => Buffer.alloc(len, 0);

/** Buffer de texto normal. */
const text = (s: string): Buffer => Buffer.from(s, 'utf8');

describe('classifyManifest — regresión de NULL_BYTES', () => {
  it('detecta el package.json íntegramente nulo (la firma del incidente real)', () => {
    // Incidente documentado: 822 paquetes en la raíz del repo, 226 con el
    // package.json relleno de bytes nulos. Turbopack lo tomaba como descripción
    // de paquete y fallaba con "Can't resolve 'tailwindcss'".
    const result = classifyManifest(nulls(4096));
    expect(result?.code).toBe('NULL_BYTES');
    expect(result?.detail).toContain('nulos');
  });

  it('NO deja pasar un archivo con nulos aunque el JSON "se pueda" parsear', () => {
    // La regresión más probable: alguien "arregla" la corrupción haciendo
    // JSON.parse(bytes.replace(/\0/g, '')) en lugar de reportarla. El árbol
    // volvería a marcarse como sano y el fallo del dev server regresaría sin
    // señal. Aquí debe seguir siendo NULL_BYTES.
    const conNulos = text('{"name":"x","version":"1.0.0"}\0\0\0');
    expect(conNulos.length).toBeGreaterThan(0);
    expect(classifyManifest(conNulos)?.code).toBe('NULL_BYTES');
  });

  it('un solo byte nulo basta, incluso en un manifest válido por lo demás', () => {
    const manifest = text('{"name":"paquete","version":"2.0.0","main":"index.js"}');
    const conUnNulo = Buffer.concat([manifest, Buffer.from([0])]);
    expect(classifyManifest(conUnNulo)?.code).toBe('NULL_BYTES');
  });

  it('reporta cuántos nulos hay, para cuantificar la corrupción', () => {
    const result = classifyManifest(nulls(10));
    expect(result?.detail).toMatch(/\d+ bytes, 10 nulos/);
  });

  it('NULL_BYTES tiene prioridad sobre BAD_JSON', () => {
    // Orden de clasificación: si JSON.parse se comprobara antes, un archivo de
    // nulos se reportaría como BAD_JSON y se perdería la señal que dice que el
    // fichero está truncado a mitad de escritura en disco.
    const result = classifyManifest(nulls(5));
    expect(result?.code).not.toBe('BAD_JSON');
    expect(result?.code).toBe('NULL_BYTES');
  });
});

describe('classifyManifest — el resto de clases', () => {
  it('EMPTY para un archivo de 0 bytes', () => {
    expect(classifyManifest(Buffer.alloc(0))).toEqual({ code: 'EMPTY', detail: '0 bytes' });
  });

  it('BAD_JSON para JSON truncado sin nulos', () => {
    expect(classifyManifest(text('{"name":"x",'))?.code).toBe('BAD_JSON');
    expect(classifyManifest(text('no soy json'))?.code).toBe('BAD_JSON');
  });

  it('null para un package.json sano', () => {
    const bueno = text(
      JSON.stringify({
        name: 'react',
        version: '19.2.0',
        main: 'index.js',
        dependencies: { scheduler: '^0.27.0' }
      })
    );
    expect(classifyManifest(bueno)).toBeNull();
  });

  it('null para manifests válidas en los bordes: sin dependencias, con unicode, minificado', () => {
    const casos: unknown[] = [
      { name: 'a' },
      { name: 'páquete-ñ', version: '1.0.0' },
      { name: 'x', scripts: { build: 'tsc && vite build' } },
      { name: 'x', bin: { cli: './cli.js' } },
      { name: 'x', type: 'module', exports: { '.': './index.js' } }
    ];
    for (const c of casos) {
      expect(classifyManifest(text(JSON.stringify(c)))).toBeNull();
    }
    // Minificado, sin espacios.
    expect(classifyManifest(text('{"name":"x","version":"1.0.0"}'))).toBeNull();
  });

  it('no confunde un manifest grande con corrupción', () => {
    // El detalle de NULL_BYTES dice que "un package.json sano ocupa cientos de
    // bytes": este test fija que el tamaño grande, por sí solo, no dispara nada.
    const grande = text(JSON.stringify({ name: 'x', version: '1.0.0', keywords: Array(400).fill('k') }));
    // Se afirma que es "grande" de verdad antes de usar el tamaño como argumento.
    expect(grande.length).toBeGreaterThan(1000);
    expect(classifyManifest(grande)).toBeNull();
  });
});

describe('classifyManifest — contrato con el resto del script', () => {
  it('SIEMPRE devuelve null o un objeto con code y detail', () => {
    const entradas: Buffer[] = [
      Buffer.alloc(0),
      nulls(3),
      text('{'),
      text('{"name":"ok"}'),
      text('[]')
    ];
    for (const buf of entradas) {
      const r = classifyManifest(buf);
      if (r !== null) {
        expect(typeof r.code).toBe('string');
        expect(typeof r.detail).toBe('string');
        expect(r.code.length).toBeGreaterThan(0);
      }
    }
  });

  it('un JSON que NO es un objeto (array, número, string) no es corrupción', () => {
    // Son válidos para JSON.parse; el doctor no valida la forma del manifest,
    // solo que el fichero esté íntegro. Un falso positivo aquí borraría paquetes
    // sanos con --delete.
    expect(classifyManifest(text('[]'))).toBeNull();
    expect(classifyManifest(text('42'))).toBeNull();
    expect(classifyManifest(text('"hola"'))).toBeNull();
  });
});
/**
 * Ficheros de entrada (index.js y hermanos).
 *
 * Aquí la regla es DISTINTA a la del package.json, y esa asimetría es
 * intencionada: hay paquetes publicados que usan un index.js vacío a
 * propósito. `client-only@0.0.1` —presente en el lockfile de este repo—
 * publica exactamente eso. Marcarlo como corrupción daría un falso positivo
 * sobre una instalación correcta, y `--delete --yes` borraría un paquete sano.
 */
describe('classifyEntryFile — bytes nulos', () => {
  it('detecta nulos en un index.js truncado a mitad de escritura', () => {
    const buf = Buffer.from([0x63, 0x6f, 0x00, 0x00, 0x64, 0x65]);
    expect(classifyEntryFile(buf)?.code).toBe('NULL_BYTES');
  });

  it('un index.js íntegramente nulo se detecta', () => {
    expect(classifyEntryFile(Buffer.alloc(2048, 0))?.code).toBe('NULL_BYTES');
  });

  it('NO "cura" los nulos en vez de reportarlos', () => {
    // La regresión peligrosa: filtrar los 0x00 y parsear el resultado daría
    // un fichero sano y dejaría el árbol corrupto marcado como bueno.
    const conNulos = Buffer.concat([Buffer.from('module.exports = 1;', 'utf8'), Buffer.from([0, 0])]);
    expect(classifyEntryFile(conNulos)?.code).toBe('NULL_BYTES');
  });

  it('devuelve null para un index.js sano, por pequeño que sea', () => {
    expect(classifyEntryFile(Buffer.from('x', 'utf8'))).toBeNull();
    expect(classifyEntryFile(Buffer.from('//', 'utf8'))).toBeNull();
    expect(classifyEntryFile(Buffer.from([0x0a]))).toBeNull();
  });

  it('no aplica parseo JSON a un index.js', () => {
    // Nada de BAD_JSON aquí: un .js no es JSON y eso no lo hace corrupto.
    expect(classifyEntryFile(Buffer.from('{ esto no es json', 'utf8'))).toBeNull();
  });
});

describe('classifyEntryFile — el caso de client-only (0 bytes)', () => {
  it('un index.js vacío es SANO por defecto', () => {
    expect(classifyEntryFile(Buffer.alloc(0))).toBeNull();
  });

  it('con allowEmpty se marca como EMPTY', () => {
    expect(classifyEntryFile(Buffer.alloc(0), { allowEmpty: true })?.code).toBe('EMPTY');
  });

  it('allowEmpty NO cambia el tratamiento de los nulos', () => {
    expect(classifyEntryFile(Buffer.from([0, 0]), { allowEmpty: true })?.code).toBe('NULL_BYTES');
  });

  it('el caso real de client-only@0.0.1 es un vacío legítimo', () => {
    // Reproduce exactamente lo que hace el paquete publicado en este repo.
    const manifest = { name: 'client-only', version: '0.0.1', main: 'index.js' };
    expect(classifyManifest(Buffer.from(JSON.stringify(manifest), 'utf8'))).toBeNull();
    expect(classifyEntryFile(Buffer.alloc(0))).toBeNull();
  });
});
