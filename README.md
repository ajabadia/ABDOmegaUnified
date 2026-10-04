# ABDOmegaUnified

Plataforma unificada de síntesis modular: un motor C++ compilado a WebAssembly, un host nativo JUCE y una interfaz web en Next.js que comparten el mismo diseño y los mismos módulos.

---

## Qué es este repositorio

`ABDOmegaUnified` nació de la fusión de varios repositorios (motor, módulos, host, interfaz). Hoy es **un** repo con **cuatro cajas** y una regla de oro: **todo lo que se comparte se comparte por junction de NTFS, no por copia**. No hay scripts de sincronización porque no hacen falta.

```
ABDOmegaUnified/
├── engine/                 # CAJA 1 — SDK del motor (cabeceras)
│   ├── include/Core/Ace/   #   OmegaContract.h, OmegaConstants.h: macros del ABI
│   └── bindings/           #   Compatibilidad Emscripten
│
├── modules/                # CAJA 2 — ESTANTERÍA CANÓNICA DE MÓDULOS
│   └── <id>/
│       ├── <id>.cpp        #   Código C++ (OMEGA_PARAM / OMEGA_PORT)
│       ├── <id>.acemm      #   Manifiesto YAML (interfaz visual)
│       ├── <id>.contract.json  # Contrato, extraído del binario
│       └── <id>.wasm       #   Binario compilado
│
├── host/                   # CAJA 3 — HOST NATIVO (C++ + JUCE 8)
│   ├── src/Core/Ace/       #   Parser YAML, validador y catálogo
│   ├── src/Core/Compiler/  #   RuntimeCompiler: grafo de audio y orden topológico
│   ├── src/Core/Voice/     #   Plan de voz compilado
│   ├── src/Core/Wasm/      #   WasmHostInterface: el puente con los módulos
│   ├── src/Engine/         #   Motor de audio
│   ├── src/Plugin/         #   Formato VST
│   ├── src/UI/             #   UI nativa JUCE
│   ├── Resources/modules/  #   → junction a modules/
│   ├── JUCE/               #   Submódulo de JUCE 8
│   ├── CMake/              #   Build del host
│   └── ui/                 #   → junction a web/src/omega-ui-core
│
├── web/                    # CAJA 4 — APLICACIÓN WEB (Next.js 16 + React 19)
│   ├── app/[locale]/       #   App Router: /en/player y /en/editor
│   ├── app/api/            #   Endpoints (incluye la lambda api/modules)
│   ├── src/features/       #   manifest-editor y rack-player
│   ├── src/omega-ui-core/  #   DESIGN SYSTEM: fuente única, compartida con el host
│   ├── src/services/       #   Catálogo, runtime, RPC, validación
│   ├── public/modules/     #   → junction a modules/
│   └── _Deprecated/        #   Código congelado (71 ficheros, 7.361 líneas)
│
├── scripts/                # Guards, verificadores y pipelines
├── docs/                   # Documentación técnica
└── .github/workflows/      # CI
```

### Las cuatro junctions

Cuatro rutas apuntan al mismo contenido físico. Editar en cualquiera de los dos lados cambia el mismo fichero:

| Junction | Apunta a |
| :--- | :--- |
| `web/public/modules/` | `modules/` |
| `host/Resources/modules/` | `modules/` |
| `web/public/host-ui/` | `host/ui/` |
| `web/public/omega-ui-core/` | `web/src/omega-ui-core/` |

`host/ui/` y `web/src/omega-ui-core/` son el mismo design system por dos rutas. El guard `scripts/check_manifest_parity.mjs` falla si alguna de las dos primeras deja de ser junction y pasa a ser copia real.

---

## Empezar

```bash
# 1. Compilar los módulos a WASM
.\scripts\build_wasm.bat

# 2. Instalar dependencias (SIEMPRE desde web/)
cd web
npm install

# 3. Arrancar
npm run dev
```

| Ruta | Qué es |
| :--- | :--- |
| `http://localhost:3000/en/player` | Rack Player:Chain de voz WASM en vivo |
| `http://localhost:3000/en/editor` | Editor visual de manifiestos |

> Cell Studio **no tiene ruta propia**; `/studio` no existe. Vive dentro del editor en `web/src/features/manifest-editor/components/lab/`. Las rutas del App Router llevan prefijo de idioma.

---

## 🚨 La trampa del workspace pnpm padre

**Lee esto antes de tocar las dependencias.** Es la causa de la mayoría de los problemas de arranque del editor, y falla de forma silenciosa.

### Qué pasa

`ABDOmegaUnified/` está dentro de `D:\desarrollos\ABDSynths`, y ahí hay un workspace pnpm real:

```
D:\desarrollos\ABDSynths\
├── pnpm-workspace.yaml     # members: ABDSharedAssets, ABDEep, ABDCZ101, ...
├── pnpm-lock.yaml
├── package.json            # name: "abdsynths-workspace"
└── ABDOmegaUnified/        # ← nosotros. NO estamos en la lista de members
```

`ABDOmegaUnified` no figura en `packages:` de ese workspace. Y `web/` es un proyecto **npm** normal: tiene su `web/package-lock.json`, sin campo `packageManager`, y sin dependencias `file:`/`workspace:`/`link:`.

Para inferir la raíz del proyecto, Next.js **sube buscando lockfiles**. Los del padre son pnpm, así que concluye que la raíz es `D:\desarrollos\ABDSynths` en lugar de `web/`. Turbopack acaba reportando:

```
turbopack:///[project]/ABDOmegaUnified/web/node_modules/postcss/...
```

cuando debería ser `turbopack:///[project]/node_modules/postcss/...`.

### Por qué las dependencias van SIEMPRE en `web/`

Porque `web/` es **autónomo**: `node_modules/`, `package.json`, `package-lock.json`, `app/`, `src/` y `public/` están todos dentro, el alias `@/*` solo apunta a `./src/*` y `./*`, y no se referencia nada por encima de `web/`.

### La trampa de verdad: un `node_modules` en la raíz

Si ejecutas `npm install` en la raíz del repo, npm **hoistea** las dependencias de `web/` al repo raíz. Eso ya pasó y dejó el checkout roto: 822 paquetes, 226 con el `package.json` relleno de bytes nulos, y `Can't resolve tailwindcss`.

Para diagnosticar y reparar:

```bash
node scripts/check_node_modules_integrity.mjs --dir .        # diagnóstico
node scripts/check_node_modules_integrity.mjs --delete --yes  # borra lo corrupto
```

### Qué lo arregla (y qué NO)

| Cambio | ¿Mueve la raíz de Turbopack? |
| :--- | :--- |
| `package.json` en la raíz, **sin** `workspaces` | ❌ No. Verificado con A/B: error idéntico. |
| `outputFileTracingRoot` en `web/next.config.ts` | ✅ Sí. |

Por eso `web/next.config.ts` fija `outputFileTracingRoot: path.join(__dirname)`. Las rutas pasaron de `[project]/ABDOmegaUnified/web/node_modules/...` a `[project]/node_modules/...`, con el arranque cayendo de ~8 s a menos de 1 s.

Un `package.json` en la raíz se añadió en su momento y **se volvió a borrar**: no aportaba nada y declaraba un `name`/`version` en un nivel que no es un paquete real. No lo repongas.

### Regla

> Instala y ejecuta **siempre desde `web/`**. Nunca dejes un `package.json` ni un `node_modules` en la raíz de `ABDOmegaUnified/`.

---

## Comandos de `web/`

| Comando | Qué hace |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (`prebuild` materializa `public/`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest |
| `npm run test:e2e` | Playwright |
| `npm run arch-audit` | Guard de arquitectura |
| `npm run check:acemm-layout` | Guard de layout de los `.acemm` (snap 5 px, ancho = hp x 15) |
| `npm run typecheck:deprecated` | Typecheck del código congelado, contra baseline |
| `npm run recover:deprecated` | Recupera un fichero de `_Deprecated` |

### El código congelado

`web/_Deprecated/` contiene 71 ficheros y 7.361 líneas retiradas del producto. **No se borran**: hay un typecheck bajo demanda (`typecheck:deprecated`) que compara contra un baseline y solo falla ante errores nuevos, y un script de recuperación (`recover:deprecated`) que devuelve un fichero al producto resolviendo sus imports y proponiendo el grupo de hermanos si los tiene. Los dos están en `web/scripts/` y tienen sus specs.

---

## Verificadores

Cada script de `scripts/` es una puerta ejecutable. Los que verifican audio **instancian los binarios WASM reales** en el motor de Node y miden la salida; no son mocks.

| Script | Qué verifica |
| :--- | :--- |
| `review_module_contracts.mjs` | Cada `bind` del `.acemm` existe en el contrato del `.cpp`, y todo parámetro tiene `bind` |
| `check_acemm_layout.mjs` | Reglas de layout: posiciones en la rejilla de 5 px y ancho de panel = hp x 15 |
| `check_manifest_parity.mjs` | `modules/` es la fuente única (junctions, no copias) y el catálogo está al día |
| `verify_voice_chain_runtime.mjs` | La cadena `midi_2_cv → lfo → vco → vcf → adsr → vca` suena |
| `verify_rack_worklet_runtime.mjs` | El worklet del navegador carga los 9 módulos y reproduce una nota |
| `verify_midi_2_cv_runtime.mjs` / `verify_440demo_runtime.mjs` | Runtime de módulos concretos |
| `wasm-smoke.mjs` | Smoke de los 9 módulos |
| `check_canonical_defaults.mjs` | Ningún literal canónico reintroducido fuera de su constante `DEFAULT_*` |
| `gen_contracts.mjs` | Regenera los `.contract.json` desde los binarios |
| `verify_ci_workflow.cjs` | El workflow de CI sin depender de GitHub |

```bash
node scripts/verify_rack_worklet_runtime.mjs
```

---

## CI

`Verificación` corre dos jobs en cada push a `main`:

- **Tipos, pruebas y compilación** — guard de defaults, `tsc`, Jest, build de producción, comprobación de que `public/` se materializó y peso de la lambda `api/modules`.
- **Pruebas en navegador real** — Playwright sobre Chromium.

Los guards de `scripts/` que no dependen de la red se ejecutan en el primer job, así que un fallo de paridad de manifiestos o de contratos aparece antes de gastar minutos de navegador.

---

## Documentación

| Documento | Qué cubre |
| :--- | :--- |
| [docs/OMEGA_MODULE_DEVELOPER_GUIDE.md](docs/OMEGA_MODULE_DEVELOPER_GUIDE.md) | Cómo escribir un módulo: ABI, macros, compilación, manifiesto |
| [docs/ADR_001_MODULES_VS_JUCE.md](docs/ADR_001_MODULES_VS_JUCE.md) | Por qué los módulos no usan JUCE |
| [docs/RACK_RENDERER_SPEC.md](docs/RACK_RENDERER_SPEC.md) | Geometría, tokens y color del renderer, con la deuda técnica declarada |
| [host/README.md](host/README.md) | Documentación del host nativo |
| [host/BUILD.md](host/BUILD.md) | Build del host con CMake |

---

## Licencia

Ver [LICENSE](LICENSE).