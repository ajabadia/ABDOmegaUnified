# OMEGA Unified (Era 8)

Plataforma unificada de síntesis modular basada en un motor C++ agnóstico compilado a WebAssembly (WASM) y una interfaz web única en Next.js.

---

## 🏗️ Arquitectura de 3 Cajas Aisladas

```
ABDOmegaUnified/
├── engine/                # 📦 CAJA 1: MOTOR DSP C++
│   ├── include/           # Cabeceras core (OmegaConstants + macros de contrato ACE)
│   └── bindings/          # Compatibilidad Emscripten (wasm_compat.h)
│
├── modules/               # 📦 CAJA 2: ESTANTERÍA DE MÓDULOS
│   └── <modulo>/          # Carpeta por módulo (código .cpp + manifiesto .acemm)
│
├── web/                   # 📦 CAJA 3: APLICACIÓN WEB (Next.js 16 + React 19)
│   ├── app/[locale]/      #   - App Router (entry point real)
│   │   ├── player/        #     - Sintetizador Modular (ABDOmega Rack)
│   │   └── editor/        #     - Diseñador Visual (ABDOmega Editor)
│   └── src/features/      #   - Lógica y componentes (incluye Cell Studio)
│
└── scripts/               # 🛠️ PIPELINES DE COMPILACIÓN
    └── build_wasm.bat     # Script de compilación C++ -> WASM
```

> **Nota:** Cell Studio **no tiene ruta propia**; `/studio` no existe. Vive dentro
> del editor (`web/src/features/manifest-editor/components/lab/`). Las rutas del
> App Router llevan prefijo de idioma: `/en/editor`, `/en/player`.

---

## 🚨 Trampa del workspace pnpm padre

**Lee esto antes de tocar las dependencias.** Es la causa de la mayoría de los
problemas de arranque del editor, y falla de forma silenciosa.

### Qué pasa

`ABDOmegaUnified/` **no es un proyecto independiente del todo**: está dentro de
`D:\desarrollos\ABDSynths`, y ahí hay un workspace pnpm real:

```
D:\desarrollos\ABDSynths\
├── pnpm-workspace.yaml     # members: ABDSharedAssets, ABDEep, ABDCZ101, ...
├── pnpm-lock.yaml
├── package.json            # name: "abdsynths-workspace", packageManager: pnpm@10.25.0
└── ABDOmegaUnified/        # ← nosotros. NO estamos en la lista de members
```

`ABDOmegaUnified` **no figura** en `packages:` de ese workspace. Y `web/` es un
proyecto **npm** normal: tiene su `web/package-lock.json`, sin campo
`packageManager`, y sin dependencias `file:`/`workspace:`/`link:`.

El problema: para inferir la raíz del proyecto, Next.js **sube buscando
lockfiles**. Los del padre son pnpm, así que concludes que la raíz del proyecto
es `D:\desarrollos\ABDSynths` en lugar de `web/`. Turbopack acaba reportando sus
rutas virtuales como:

```
turbopack:///[project]/ABDOmegaUnified/web/node_modules/postcss/...
```

cuando deberían ser `turbopack:///[project]/node_modules/postcss/...`.

### Por qué las dependencias se instalan SIEMPRE en `web/`

Porque `web/` es **autónomo**: `node_modules/`, `package.json`,
`package-lock.json`, `app/`, `src/` y `public/` están todos dentro, el alias
`@/*` solo apunta a `./src/*` y `./*`, y no se referencia nada por encima de
`web/`. No hay nada que un `npm install` en la raíz pudiera resolver por ti.

```bash
cd web
npm install        # ← aquí, siempre
npm run dev
```

### La trampa de verdad: un `node_modules` en la raíz del repo

Si ejecutas `npm install` en `ABDOmegaUnified/` (o añades un `workspaces` a un
`package.json` de raíz), npm **hoistea** las dependencias de `web/` al repo raíz.
Eso ya pasó una vez y dejó esta checkout rota:

- `node_modules/` en la raíz con **822 paquetes**, **226** con el `package.json`
  relleno de bytes nulos.
- Resultado: `Can't resolve tailwindcss`, y el CSS del editor sin compilar.

Para diagnosticar y reparar ese estado:

```bash
node scripts/check_node_modules_integrity.mjs --dir .        # diagnóstico
node scripts/check_node_modules_integrity.mjs --delete --yes  # borra lo corrupto
```

### Qué lo arregla (y qué NO)

| Cambio | ¿Mueve la raíz de Turbopack? |
|---|---|
| `package.json` en la raíz del repo, **sin** `workspaces` | ❌ No. Verificado con A/B: error idéntico con y sin él. |
| `outputFileTracingRoot` en `web/next.config.ts` | ✅ Sí. |

Por eso `web/next.config.ts` fija:

```ts
outputFileTracingRoot: path.join(__dirname),
```

y las rutas pasaron de `[project]/ABDOmegaUnified/web/node_modules/...` a
`[project]/node_modules/...`, con el arranque cayendo de ~8 s a menos de 1 s.

Un `package.json` en la raíz se añadió en su momento y **se volvió a borrar**,
porque no aportaba nada y declaraba un `name`/`version` en un nivel que no es un
paquete real. No lo repongas.

### Regla

> Instala y ejecuta **siempre desde `web/`**. Nunca dejes un `package.json` ni un
> `node_modules` en la raíz de `ABDOmegaUnified/`.

---

## 🚀 Guía Rápida

1. **Compilar el Motor a WASM**: `.\scripts\build_wasm.bat`
2. **Instalar dependencias**: `cd web && npm install`
3. **Iniciar la App Web**: `cd web && npm run dev`
4. **Acceso a Rutas** (con prefijo de idioma):
   - Player: `http://localhost:3000/en/player`
   - Editor: `http://localhost:3000/en/editor`