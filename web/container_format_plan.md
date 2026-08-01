# Plan de Arquitectura de Contenedores: Formato `.omega` (Source) vs Manifiesto Destilado (Distilled)

> **Documento principal** de la arquitectura de dos niveles.
> Ver también: [`synthedit_design_proposal.md`](synthedit_design_proposal.md) (especificación de diseño),
> [`synthedit_migration_guide.md`](synthedit_migration_guide.md) (plan de trabajo del equipo).

---

## 1. Motivación

El editor actual guarda manifiestos como archivos YAML/JSON individuales (`.acemm`, `.contract.json`) y los assets se manejan como `ArrayBuffer` en memoria. Esto tiene tres problemas:

1. **Proyectos no portables** — mover un proyecto a otro ordenador requiere transportar múltiples archivos.
2. **Sin historial persistente** — el historial de deshacer se pierde al recargar la página.
3. **Assets volátiles** — las imágenes cargadas (filmstrips, PNGs) viven en `ObjectURLs` temporales que se pierden.

La solución es un **contenedor ZIP autocontenido** (`.omega`) que agrupe todo en un solo archivo, más un **exportador destilado** que genere un JSON plano para producción en JUCE 8.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    EDITOR (WORK MODE)                    │
│                                                         │
│  ┌──────────────┐    ┌──────────┐    ┌──────────────┐   │
│  │  UCA Tree     │    │  History │    │  Assets       │   │
│  │  (recursivo)  │    │  (undo)  │    │  (ObjectURLs) │   │
│  └──────┬───────┘    └────┬─────┘    └──────┬───────┘   │
│         │                 │                  │           │
│         └─────────────────┼──────────────────┘           │
│                           │                              │
│              ┌────────────▼────────────┐                 │
│              │   projectPackager.ts    │                 │
│              │  (JSZip wrapper)        │                 │
│              └────────┬───────────────┘                 │
│                       │                                  │
│              ┌────────▼────────┐                         │
│              │  .omega (ZIP)   │  ← Ctrl+S / Save        │
│              │  ┌───────────┐  │                         │
│              │  │manifest   │  │                         │
│              │  │history    │  │                         │
│              │  │project    │  │                         │
│              │  │assets/    │  │                         │
│              │  └───────────┘  │                         │
│              └────────────────┘                          │
│                       │                                  │
│              ┌────────▼────────┐                         │
│              │  distillForJUCE │  ← Export to JUCE       │
│              │  (distillManifest│                         │
│              │   + flatten)    │                         │
│              └────────┬───────┘                          │
│                       │                                  │
└───────────────────────┼──────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │  .dist.json (plano) │  → JUCE 8 WebView2
              │  (producción)       │
              └────────────────────┘
```

---

## 3. El Formato `.omega` (Source / Work Mode)

### 3.1 Estructura del ZIP

```
mi-sintetizador.omega (ZIP)
├── project.json              # Metadatos del proyecto y estado del editor
│   ├── name: string
│   ├── schemaVersion: "10.0.0-omega"
│   ├── editorState: {
│   │     zoom: number,
│   │     panX: number,
│   │     panY: number,
│   │     activeTab: string,
│   │     windowStates: Record<string, boolean>,
│   │     guides: GridGuide[]
│   │   }
│   └── exportedAt: ISO8601
│
├── manifest.json             # Manifiesto de trabajo rico (OMEGA_Manifest completo)
│                              # Conserva ui.tree, ui.styles, ui.palette, ui.sizes,
│                              # resources.assets (con referencias a assets/), etc.
│
├── history.json              # Historial de transacciones para Undo/Redo infinito
│   ├── past: HistoryEntry[]
│   └── future: HistoryEntry[]
│
└── assets/                   # Recursos binarios reales (NO base64)
    ├── bg_chassis.png
    ├── knob_metal_strip.png
    └── status_led.svg
```

### 3.2 Ventajas del formato

| Aspecto | Antes (archivos sueltos) | Después (.omega) |
|---|---|---|
| Portabilidad | Múltiples archivos | Un solo archivo ZIP |
| Assets | Base64 en JSON o ObjectURLs volátiles | Archivos binarios reales en carpeta interna |
| Historial | Se pierde al recargar | Persistente en `history.json` |
| Estado del editor | No se guarda | `project.json` guarda zoom, pan, ventanas |
| Parseo inicial | Pesado si hay base64 | JSON ligero + assets separados |

### 3.3 ⚠️ Precaución: Tamaño de history.json

El historial puede crecer rápidamente si cada transacción incluye un `manifest` completo. Recomendaciones:

- **Límite de entradas**: Ya existe `maxEntries = 50` en `historyService.ts`.
- **Compresión**: Dentro del ZIP, `history.json` puede comprimirse individualmente si supera 1MB.
- **Snapshot diferencial**: En lugar de guardar el manifest completo en cada entrada, guardar solo el diff (opcional, fase futura).

---

## 4. El Manifiesto Destilado (Distilled / Production)

### 4.1 Estructura del JSON de salida

```json
{
  "schemaVersion": "10.0.0-distilled",
  "name": "Mi Sintetizador",
  "author": "User",
  "version": "1.0.0",
  "rack": {
    "width": 800,
    "height": 600,
    "children": [
      {
        "id": "abc-123",
        "type": "knob",
        "label": "Volume",
        "pos": { "x": 120, "y": 45 },
        "size": { "width": 48, "height": 48 },
        "style": {
          "color": "#00f2ff",
          "indicatorColor": "#ff8c00",
          "variant": "A_cyan"
        },
        "bind": { "target": "param_volume" }
      }
    ]
  },
  "assets": [
    "asset://knob_metal_strip.png",
    "asset://bg_chassis.png"
  ]
}
```

### 4.2 Pipeline de destilación (`distillManifest()`)

**NOTA: `distillManifest()` YA EXISTE** en `src/omega-ui-core/utils/StyleResolver.ts` (línea 483). La cadena actual es:

```
fossilizeLegacyStyles(manifest)
  → contractManifest(manifest)
    → pruneUnusedStyles(manifest)
      → pruneUnusedAssets(manifest)
```

Lo que hace cada paso:

| Paso | Efecto |
|---|---|
| `fossilizeLegacyStyles` | Aplana tokens de color (paleta → hex) en todos los nodos y variantes. Asegura tamaños A/B/C/D y tipografía por defecto. |
| `contractManifest` | Elimina el campo `style` de nodos cuyo estilo coincide exactamente con el default de su tipo. |
| `pruneUnusedStyles` | Elimina variantes de `ui.styles` que ningún nodo referencia (excepto "default"). |
| `pruneUnusedAssets` | Elimina assets de `resources.assets` que ningún nodo utiliza. |

### 4.3 Post-procesado para JUCE 8 (lo que NO existe y hay que crear)

`distillManifest()` opera sobre el `OMEGA_Manifest` actual. Para generar el formato plano que JUCE 8 necesita, hay que añadir un post-procesador:

1. **Aplanar `ui.tree`**: Recorrer el árbol recursivo y convertir a un array plano de `{ id, type, label, pos, size, style, bind }`.
2. **Resolver layouts dinámicos** (`stack-v`, `stack-h`): Calcular coordenadas absolutas en píxeles.
3. **Eliminar metadatos de editor**: `project.json`, history, guías, comentarios de ingeniería.
4. **Mapear assets a `asset://`**: Convertir rutas internas a URIs que JUCE 8 entienda.

---

## 5. Servicio projectPackager.ts

### 5.1 API implementada

El archivo `src/services/projectPackager.ts` **ya está creado** e implementa:

```typescript
// src/services/projectPackager.ts

export interface ProjectMetadata {
  name: string;
  id: string;
  schemaVersion: string;
  version: string;
  author?: string;
  family?: string;
  exportedAt: string;
  editorState?: Record<string, unknown>;
}

export interface HistoryBundle {
  past: unknown[];
  future: unknown[];
}

export interface OmegaPackage {
  project: ProjectMetadata;
  manifest: OMEGA_Manifest;
  history: HistoryBundle;
  assets: Map<string, ArrayBuffer>;
  wasmBuffer: ArrayBuffer | null;
}

export interface PackageParams {
  manifest: OMEGA_Manifest;
  history?: HistoryBundle;
  assets?: Array<{ name: string; data: ArrayBuffer }> | Map<string, ArrayBuffer>;
  wasmBuffer?: ArrayBuffer | null;
  editorState?: Record<string, unknown>;
}

export async function packageProject(params: PackageParams): Promise<Blob>;
export async function unpackageProject(blob: Blob): Promise<OmegaPackage>;
```

**packageProject** empaqueta:
- `project.json` (metadatos + editorState con defaults desde el manifest)
- `manifest.json` (JSON canónico)
- `{moduleId}.acemm` (YAML vía `js-yaml` para compatibilidad legacy)
- `history.json` (solo si hay entradas)
- `resources/` (assets binarios, acepta `Map` o `Array`)
- `{moduleId}.wasm` (opcional)

**unpackageProject** desempaqueta:
- `project.json` con fallback a metadata mínima si no existe
- `manifest.json` primero, con fallback a `.acemm` (YAML vía import dinámico)
- `history.json` (silenciosamente ignorado si corrupto)
- `resources/` extraído a `Map<string, ArrayBuffer>`
- WASM detectado por patrón `{id}.wasm` con regex escapado (seguro para IDs con caracteres especiales)

### 5.2 Dependencia

**JSZip ya está instalado** (`package.json` v3.10.1) y **ya se usa** en `useBundleTransfer.ts` para `exportOmegaPack()` y `exportCellAsBlueprint()`. No es necesario instalar `fflate` — JSZip es suficiente y ya está probado.

### 5.4 Integración con el flujo existente

El hook `useBundleTransfer.ts` ya maneja `exportOmegaPack()` — este nuevo servicio lo reemplazaría o complementaría. La diferencia clave:

| Aspecto | `exportOmegaPack` actual | `packageProject` |
|---|---|---|
| Formato | `.omega` con YAML + JSON + history + project + resources + WASM | `.omega` con JSON + YAML + history + project + resources + WASM |
| Historial | ✅ Incluye `history.json` (vía `historyService.getHistory()`) | ✅ Incluye `history.json` (parámetro explícito) |
| Estado editor | ✅ Incluye `project.json` (metadata + grid + skin) | ✅ Incluye `project.json` (parámetro `editorState` explícito) |
| Assets | Solo los usados (filtrados por `getUsedResources`) | ✅ Todos los assets proporcionados |
| Manifest | `.acemm` (YAML) + `.contract.json` | `manifest.json` (JSON) + `.acemm` (YAML legacy) |
| WASM | ✅ Incluye si presente | ✅ Incluye si presente (como `wasmBuffer`) |

---

## 6. Importación Defensiva (Upgrader)

Cuando un usuario carga un archivo `.json` destilado (plano, sin metadatos de editor):

### 6.1 Detección

```typescript
function isDistilledManifest(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const m = obj as Record<string, unknown>;
  return (
    m.schemaVersion === '10.0.0-distilled' ||
    (Array.isArray(m.children) && !m.ui)  // Heurística: tiene children planos, no ui.tree
  );
}
```

### 6.2 Migración Inversa

```typescript
function upgradeDistilledToWork(raw: DistilledManifest): OMEGA_Manifest {
  return {
    schemaVersion: '10.0.0-omega',
    id: crypto.randomUUID(),
    metadata: {
      name: raw.name || 'Imported (Distilled)',
      version: raw.version || '1.0.0',
      family: 'utility',
    },
    ui: {
      dimensions: { width: raw.rack?.width || 800, height: raw.rack?.height || 600 },
      palette: CANONICAL_PALETTE,  // Valores por defecto
      styles: {},                  // Vacío — los estilos están aplanados
      tree: buildFakeTree(raw.children),  // Contenedor raíz ficticio
    },
    resources: { assets: [] },
    nodes: [],
  };
}
```

### 6.3 Advertencia al usuario

> ⚠️ **"Importando manifest plano de producción. Se han generado valores de layout estáticos y se ha inicializado el historial de deshacer. Algunos metadatos de diseño (layouts automáticos, variantes de estilo) se han perdido durante la exportación."**

---

## 7. Resumen de lo que YA EXISTE vs lo que HAY QUE CREAR

| Componente | Estado | Archivo/s |
|---|---|---|
| `distillManifest()` | ✅ **YA EXISTE** — pipeline completo fossilize→contract→prune | `StyleResolver.ts:483` |
| JSZip (dependencia) | ✅ **YA INSTALADO** v3.10.1 | `package.json` |
| `exportOmegaPack()` | ✅ **YA EXISTE** — empaquetado ZIP con .acemm + history.json + project.json + resources + WASM | `useBundleTransfer.ts` |
| `exportCellAsBlueprint()` | ✅ **YA EXISTE** — empaquetado ZIP de blueprints | `useBundleTransfer.ts` |
| `historyService` | ✅ **YA EXISTE** — push/undo/redo/getHistory/clear | `historyService.ts` |
| `exportManifest(mode)` | ✅ **YA EXISTE** — exporta en modo `'work'` y `'distilled'` | `useManifestTransfer.ts` |
| SHA-256 asset dedup | ✅ **YA EXISTE** — `crypto.subtle.digest('SHA-256', ...)` | `useBundleTransfer.ts` |
| --- | --- | --- |
| `projectPackager.ts` | ✅ **YA CREADO** — `packageProject()` y `unpackageProject()` para .omega | `src/services/projectPackager.ts` |
| Post-procesado JUCE 8 | ✅ **YA CREADO** — aplanar tree a array plano + asset:// URIs | `distillForJUCE.ts` |
| Importador defensivo | ✅ **YA CREADO** — `isDistilledManifest()` + `upgradeDistilledToWork()` + `UPGRADE_WARNING` | `upgradeDistilled.ts` |
| `historyService.restore()` | ✅ **YA CREADO** — restaura past/future arrays desde disco | `historyService.ts` |
| `handleLoadOmegaProject` | ✅ **YA CREADO** — file picker + descompresión + restauración completa | `WorkbenchContainer.tsx` |
| `restoreOmegaPackage(file)` | ✅ **YA CREADO** — helper compartido file picker/drag-and-drop | `WorkbenchContainer.tsx` |
| UI: Open .omega Project | ✅ **YA CREADO** — ítem en File > Load, shortcut Ctrl+O | `MenuBar.tsx` |
| UI: Drag & Drop .omega | ✅ **YA CREADO** — drop zone overlay con restauración completa | `WorkbenchContainer.tsx` |
| UI: Export to OMEGA Module Rack | ✅ **YA CREADO** — botón en File > Export + handler con distill + ZIP | `MenuBar.tsx`, `WorkbenchContainer.tsx` |
| UI: Ctrl+O shortcut | ✅ **YA CREADO** — event listener global en keydown | `WorkbenchContainer.tsx` |
| E2E tests: Open .omega | ✅ **YA CREADO** — 5 tests en suite e2e | `e2e/omega-project.spec.ts` |
| UI: Ctrl+S → .omega | ✅ **YA CREADO** — atajo asociado a `exportOmegaPack()` + menu item actualizado | `useWorkbenchShortcuts.ts`, `MenuBar.tsx` |

**Esfuerzo estimado original: ~2-3 días hábiles** (1 senior, 1 junior).

**Progreso actual (v3.1):**
- ✅ `projectPackager.ts` → creado e implementado
- ✅ `history.json` en `exportOmegaPack` → implementado
- ✅ `project.json` en `exportOmegaPack` → implementado
- ✅ Nombre de descarga `.omega` → implementado
- ✅ `historyService.restore()` → creado
- ✅ `handleLoadOmegaProject` → file picker + restauración completa
- ✅ `restoreOmegaPackage()` → helper compartido
- ✅ Open .omega Project → ítem en MenuBar
- ✅ Drag & Drop .omega → overlay + drop handler
- ✅ Export to OMEGA Module Rack → botón + handler con ZIP destilado
- ✅ `distillForJUCE.ts` → creado e integrado en `handleExportOmegaRack`
- ✅ `upgradeDistilled.ts` → creado e integrado en `restoreOmegaPackage`
- ✅ UI: Ctrl+S → .omega → atajo asociado + menú actualizado
- ✅ Integración `isDistilledManifest` + `upgradeDistilledToWork` en carga de manifiestos

---

## 8. Glosario de Archivos

| Archivo | Ruta | Rol |
|---|---|---|
| `projectPackager.ts` | `src/services/` (creado) | Empaquetar/desempaquetar `.omega` con `packageProject()` y `unpackageProject()` |
| `distillForJUCE.ts` | `src/omega-ui-core/utils/` (nuevo) | Post-procesado de manifiesto destilado para JUCE 8 |
| `upgradeDistilled.ts` | `src/omega-ui-core/utils/` (nuevo) | Migración inversa de manifiesto destilado a work |
| `StyleResolver.ts` | `src/omega-ui-core/utils/` (existe) | `distillManifest()`, `fossilizeLegacyStyles()`, etc. |
| `historyService.ts` | `src/services/` (existe) | Servicio de historial |
| `useBundleTransfer.ts` | `src/features/manifest-editor/hooks/io/` (existe) | OmegaPack export, blueprint packaging |
| `useManifestTransfer.ts` | `src/features/manifest-editor/hooks/io/` (existe) | Export en modo work/distilled, CAD blueprints |
| `WorkbenchContainer.tsx` | `src/features/manifest-editor/components/` (existe) | Punto de integración de Ctrl+S y Export |
| `MenuBar.tsx` | `src/features/manifest-editor/components/layout/` (existe) | Botones de Save y Export to JUCE |

---

*Documento v1.0 — Alineado con la arquitectura real del código (Era 9.2.0-dev)*
