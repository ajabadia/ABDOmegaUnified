/**
 * @purpose GET /api/modules — catálogo ACEMM dinámico. Escanea la estantería
 * canónica modules/ en runtime (misma lógica que scripts/generate_acemm_catalog.mjs)
 * y devuelve el catálogo en el MISMO shape que acemmCatalog.generated.ts.
 *
 * Fuente única: modules/<id>/<id>.acemm. Añadir/quitar un módulo en esa carpeta
 * basta para que aparezca aquí y en /en/player y /host-ui/index.html — sin
 * regenerar catálogos ni rebuildar.
 *
 * @classification Infrastructure Service
 * @complexity Medium
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createHash } from "node:crypto";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

/**
 * Resuelve el directorio canónico de la estantería de módulos.
 *
 * POR QUÉ NO SE CONSULTA `public/modules` — MEDIDO, NO SUPONIDO
 * -------------------------------------------------------------
 * Existe la tentación de añadir `public/modules` como tercer candidato (en un
 * despliegue `<root>/modules` no existe y `prebuild` deja ahí una copia real).
 * Medido con `next build` el 2 de octubre: **rompe el build**.
 *
 *   Symlink [project]/public/modules/440demo/440demo.acemm is invalid,
 *   it points out of the filesystem root
 *
 * Turbopack traza las llamadas a `fs` de la ruta y las resuelve en tiempo de
 * compilación; con el junction de esta máquina, `public/modules/...` cae fuera
 * del root de Next (`web/`) y Turbopack aborta. Da igual que el candidato sea
 * el último de la lista: la ruta literal basta para que la tracee.
 *
 * Consecuencia asumida en un despliegue: `GET /api/modules` responde 500 y
 * `SharedModuleCatalogService.loadCatalog()` cae al catálogo generado
 * (`acemmCatalog.generated.ts`), que es el comportamiento que ya cubren sus
 * tests. Los `.acemm` estáticos (`/modules/<id>/<id>.acemm`) sí se sirven, los
 * materializa `prebuild` en `public/`.
 *
 * LA MISMA TRAZA, SIN LA ANOTACIÓN — MEDIDO
 * ------------------------------------------
 * Añadir `public/modules` no era el único problema: los dos candidatos de ARRIBA
 * también salen del root (`..`), y eso arrastraba el repo entero a la lambda.
 * El aviso del build lo decía literalmente, con el rastro
 * `./next.config.ts -> ./app/api/modules/route.ts`, y
 * `.next/server/app/api/modules/route.js.nft.json` medía **3827 ficheros /
 * 294.07 MB** frente a 113 ficheros / 26.74 MB de `app/api/audio`: se colaban
 * `exports/` (105.81 MB), `src/` (62.96), `public/` (53.21), `docs/` (48.52) y
 * `wasm-runtime/` (19.68). En Vercel: una lambda de 264.38 MB, por encima del
 * límite de 250 MB, y el despliegue en ERROR.
 *
 * Por qué la anotación va en el argumento de `fs` y no en el `path.join`
 * ------------------------------------------------------------------
 * El propio aviso del build sugiere annotar el `path.join`, y esa forma NO
 * funciona: vercel/next.js#95125 lo mide en esta misma versión de Next y solo se
 * silencia cuando la anotación va sobre una variable desnuda pasada directamente
 * a la llamada `fs`. Por eso aquí cada ruta se calcula en una variable aparte y se
 * anota ahí, y por eso no queda ningún `path.join` anidado dentro de un `fs`.
 * La anotación del `path.join` se conserva igualmente, porque es inocua y es la
 * que recomienda el aviso del build.
 *
 * OJO al editar este bloque: la anotación no puede escribirse con sus dos
 * delimitadores dentro de un comentario de bloque, porque el de cierre lo termina
 * antes de tiempo y el fichero deja de compilar. Abajo sí aparece en su forma
 * completa, porque va en código.
 *
 * Nada de esto cambia lo que la ruta hace: `app/api/modules/__tests__/route.spec.ts`
 * la ejecuta contra un directorio de módulos de prueba y ata con alambre tanto el
 * resultado como la colocación de cada anotación. El peso de la lambda se mide en
 * `scripts/check-api-modules-trace.mjs` sobre la traza del build.
 */
function resolveModulesDir(): string {
  const candidates = [
    // Ruta real del monorepo (cwd = web/): <root>/modules
    path.join(/* turbopackIgnore: true */ process.cwd(), "..", "modules"),
    // Si se ejecuta desde la raíz del repo
    path.join(/* turbopackIgnore: true */ process.cwd(), "modules"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(/* turbopackIgnore: true */ candidate) && fs.statSync(/* turbopackIgnore: true */ candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      /* probar siguiente */
    }
  }
  throw new Error(`No se encontró la estantería de módulos (probó: ${candidates.join(", ")})`);
}

/** Deriva slot/units/hp canónicos desde el rack del .acemm (paridad con RackRouter). */
function resolveRackMeta(manifest: any) {
  const rack = manifest?.metadata?.rack ?? manifest?.rack ?? {};
  const hp = Number(rack.hp) || 8;
  const heightMode = String(rack.height_mode || rack.units || "").toLowerCase();
  const slotRaw = String(rack.slot || "").toLowerCase();
  const isUpper = slotRaw === "upper" || slotRaw === "top" || heightMode === "1u" || heightMode === "compact";
  return { hp, units: isUpper ? "1U" : "3U", slot: isUpper ? "upper" : "lower" };
}

/** Parsea un .acemm (YAML o JSON — js-yaml soporta ambos). */
function parseAcemm(filePath: string): any {
  const raw = fs.readFileSync(/* turbopackIgnore: true */ filePath, "utf8");
  return yaml.load(raw);
}

/** Estructura determinista de una entrada del catálogo (mismo shape que el generador). */
function buildEntry(moduleId: string, filePath: string) {
  const parsed = parseAcemm(filePath) || {};
  const rack = resolveRackMeta(parsed);

  const dimensions = parsed?.ui?.dimensions
    ? {
        width: Number(parsed.ui.dimensions.width) || rack.hp * 15,
        height: Number(parsed.ui.dimensions.height) || (rack.slot === "upper" ? 144 : 432),
      }
    : { width: Math.max(rack.hp * 15, 60), height: rack.slot === "upper" ? 144 : 432 };

  const dir = path.dirname(filePath);

  const wasmPath = path.join(/* turbopackIgnore: true */ dir, `${moduleId}.wasm`);
  const wasmExists = fs.existsSync(/* turbopackIgnore: true */ wasmPath);
  const wasmBytes = wasmExists ? fs.readFileSync(/* turbopackIgnore: true */ wasmPath) : null;
  const artifact = wasmBytes
    ? {
        sha256: createHash("sha256").update(wasmBytes).digest("hex"),
        size: wasmBytes.length,
      }
    : null;

  // La ruta del `.cpp` tambien en variable, no anidada en el `fs`: un `path.join`
  // dentro de la llamada es justo la forma que vercel/next.js#95125 demuestra que
  // la anotación NO silencia. El `.wasm` ya lo tiene (`wasmPath`).
  const cppPath = path.join(/* turbopackIgnore: true */ dir, `${moduleId}.cpp`);

  return {
    id: moduleId,
    name: parsed?.metadata?.name || parsed?.name || moduleId.toUpperCase(),
    description: parsed?.metadata?.description || parsed?.description || "",
    metadata: {
      name: parsed?.metadata?.name || moduleId.toUpperCase(),
      family: parsed?.metadata?.family || "utility",
      version: parsed?.metadata?.version || "1.0.0",
      rack,
    },
    rack: { slot: rack.slot, hp: rack.hp },
    assets: {
      source: fs.existsSync(/* turbopackIgnore: true */ cppPath),
      wasm: wasmExists,
    },
    artifact,
    wasmUrl: wasmBytes ? `modules/${moduleId}/${moduleId}.wasm` : null,
    manifestUrl: `modules/${moduleId}/${moduleId}.acemm`,
    params: parsed?.params || {},
    ui: {
      ...(parsed?.ui || {}),
      dimensions,
    },
  };
}

export async function GET(_req: NextRequest) {
  try {
    const modulesDir = resolveModulesDir();
    const entries: Record<string, any> = {};

    for (const moduleId of fs.readdirSync(/* turbopackIgnore: true */ modulesDir).sort()) {
      const dir = path.join(/* turbopackIgnore: true */ modulesDir, moduleId);
      try {
        if (!fs.statSync(/* turbopackIgnore: true */ dir).isDirectory()) continue;
      } catch {
        continue;
      }
      const acemmPath = path.join(/* turbopackIgnore: true */ dir, `${moduleId}.acemm`);
      if (fs.existsSync(/* turbopackIgnore: true */ acemmPath)) {
        entries[moduleId] = buildEntry(moduleId, acemmPath);
      }
    }

    const sortedEntries = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
    return NextResponse.json(sortedEntries, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/modules error:", error);
    return NextResponse.json({ error: String((error as Error)?.message || error) }, { status: 500 });
  }
}
