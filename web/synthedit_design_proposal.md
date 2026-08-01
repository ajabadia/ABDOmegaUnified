# Propuesta de Diseño Técnico: Arquitectura de Contenedores y Dos Niveles (Source vs. Distilled)

Este documento define la estructura de datos, las reglas de compatibilidad y la estrategia de empaquetado para el **editor de ABD Omega**, protegiendo la arquitectura existente y entregando un subproducto destilado optimizado para el lector C++ de **JUCE 8 (WebView2)**.

---

## 1. El Formato de Trabajo: Contenedor OmegaPack (`.zip`) (Source)

Para evitar la saturación de archivos sueltos y asegurar la portabilidad, el editor guardará y cargará los proyectos utilizando el formato **OmegaPack (`.zip`)** ya existente en el editor, extendiéndolo para empaquetar el estado de edición.

### Estructura interna de un OmegaPack (`.zip`):
```
[modulo_id].zip (ZIP)
├── project.json            # Metadatos del proyecto y estado del editor (ej. zoom, rejilla)
├── [modulo_id].acemm       # Manifiesto de trabajo rico (YAML - árbol jerárquico recursivo UCA)
├── history.json            # Historial de transacciones para Undo/Redo infinito
├── [modulo_id].wasm        # Binario compilado del DSP (opcional)
└── resources/              # Recursos binarios reales (PNG, SVG, Filmstrips)
    ├── bg_chassis.png
    ├── knob_metal_strip.png
    └── status_led.svg
```

#### Manifest de Trabajo (`.acemm`):
Conserva el árbol jerárquico recursivo (`ui.tree`) con sus relaciones complejas, guías de diseño, layouts automáticos y dependencias de tokens de paleta y estilos que ya están certificados en el editor.

#### 🟢 Nota de implementación — Infraestructura existente
Gran parte de la infraestructura necesaria **ya existe** en el código actual:
- **JSZip (v3.10.1)** está instalado y se usa en [useBundleTransfer.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/hooks/io/useBundleTransfer.ts) para `exportOmegaPack()` y `handleBlueprintUpload()`.
- **`historyService.getHistory()`** devuelve el historial serializable `{ past, future }`.
- **`acemm`** es el formato YAML nativo para el manifiesto de trabajo.
- **`extraResources`** maneja los assets binarios sueltos en memoria.

---

## 2. El Formato de Producción: Manifiesto Destilado (Distilled)

Es un archivo JSON plano único y altamente optimizado (`.dist.json` o `.json` plano) que se genera al pulsar "Export to JUCE". Es consumido por el motor C++ en **JUCE 8 WebView2**.

### Características principales:
- **Children Planos:** Mapea el árbol recursivo a un array de componentes plano con coordenadas `pos` y dimensiones `size` absolutas y calculadas en píxeles.
- **Estilos Híbridos Aplanados:** Resuelve las variantes y variables globales (`ui.styles` y `ui.palette`) convirtiendo los tokens semánticos directamente en sus valores hexadecimales/rgba finales.
- **Referenciación Externa de Assets:** Las imágenes no van inline; se referencian por su URI relativa (ej: `asset://knob_metal_strip.png`), ya que JUCE 8 cargará los archivos binarios de sus recursos compilados localmente.

#### 🟢 Nota de implementación — `distillManifest()` YA EXISTE
La función `distillManifest()` está completamente implementada en [StyleResolver.ts:L483](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/omega-ui-core/utils/StyleResolver.ts#L483).

---

## 3. Cadena de Resolución de Estilos (Híbrida — 4 Niveles)

El renderizador de producción resuelve estilos en base a una jerarquía de 4 niveles:

```
[ComponentNode / GroupNode]
  │
  ├── 1. Override Local ──► ¿style.color o style.indicatorColor definido? ──► Usarlo
  │
  ├── 2. Variante Global ──► Buscar aesthetics en manifest.ui.styles[cellRef][variant]
  │
  ├── 3. Central Palette ──► Si es un token (ej: "primary"), buscar en manifest.ui.palette
  │
  └── 4. Session Fallback ──► Buscar en OMEGA_THEMES[skin] (o transparent si no se encuentra)
```

---

## 4. Pipeline de Carga e Importación Defensiva

El editor opera nativamente con archivos OmegaPack (`.zip`) o manifiestos sueltos `.acemm`. Si un usuario intenta abrir un archivo destilado plano de producción (`.dist.json`):

1. **Detección:** El importador identifica que carece de la jerarquía UCA recursiva.
2. **Migración Inversa (Upgrading):**
   - Construye un `manifest` en memoria asignando un nodo contenedor raíz ficticio.
   - Aplica tipografía y paletas por defecto para los estilos podados.
   - Muestra una advertencia al diseñador: *"Importando manifest plano. Se han generado valores de layout estáticos y se ha inicializado el historial de deshacer."*
