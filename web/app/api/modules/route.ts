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
 * Nota: se evita resolver vía `public/modules` (junction) en este código — la
 * junction apunta fuera del root del proyecto web y Turbopack intenta trazar
 * ese path literal durante `next build` (error "points out of the filesystem
 * root"). La lectura en runtime usa directamente la carpeta real del monorepo.
 */
function resolveModulesDir(): string {
  const candidates = [
    // Ruta real del monorepo (cwd = web/): <root>/modules
    path.join(process.cwd(), "..", "modules"),
    // Si se ejecuta desde la raíz del repo
    path.join(process.cwd(), "modules"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
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
  const raw = fs.readFileSync(filePath, "utf8");
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

  const wasmPath = path.join(dir, `${moduleId}.wasm`);
  const wasmBytes = fs.existsSync(wasmPath) ? fs.readFileSync(wasmPath) : null;
  const artifact = wasmBytes
    ? {
        sha256: createHash("sha256").update(wasmBytes).digest("hex"),
        size: wasmBytes.length,
      }
    : null;

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
      source: fs.existsSync(path.join(dir, `${moduleId}.cpp`)),
      wasm: fs.existsSync(path.join(dir, `${moduleId}.wasm`)),
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

    for (const moduleId of fs.readdirSync(modulesDir).sort()) {
      const dir = path.join(modulesDir, moduleId);
      try {
        if (!fs.statSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      const acemmPath = path.join(dir, `${moduleId}.acemm`);
      if (fs.existsSync(acemmPath)) {
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
