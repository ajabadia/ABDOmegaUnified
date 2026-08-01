# Guía de Migración y Desarrollo: Arquitectura de Contenedores

Esta guía describe los pasos que el equipo de desarrollo (Seniors y Juniors) debe seguir para implementar el formato de paquete de trabajo **OmegaPack (`.zip`)** y el pipeline de destilación de manifiestos para **JUCE 8**.

---

## 📋 Distribución de Tareas por Rol

### Asignaciones Senior 🧠
* **Fase A (Extensión de OmegaPack):** [x] **Completado** - Se ha modificado `exportOmegaPack` en `useBundleTransfer.ts` para incluir `history.json` (historial serializado) y `project.json` (viewport y estado del editor).
* **Fase B (Pipeline de Destilación):** [x] **Completado** - Implementada la destilación de manifiestos y layouts planos a hex para JUCE en `distillForJUCE.ts`.
* **Fase D (Validación e Integración):** [x] **Completado** - Modificado el cargador e importador en `restoreOmegaPackage` y `upgradeDistilled.ts` para la carga y migración inversa con advertencias.

### Asignaciones Junior 🛠️
* **Fase C (Interfaz e Interacciones):** [x] **Completado**
  - [x] Asociado `Ctrl+S` a la exportación extendida de **OmegaPack (`.zip`)** y menú actualizado.
  - [x] Añadida la opción **"Export to OMEGA Module Rack"** bajo `File > Export` de `MenuBar.tsx` que ejecuta el pipeline destilado.
* **Fase E (Pruebas & Control de Calidad):** [x] **Completado** - Pruebas E2E implementadas (`e2e/omega-project.spec.ts`) y validación de tipos e integridades limpia.
  ```bash
  npx tsc --noEmit
  npm run lint
  ```

---

## 🗺️ Ejecución del Plan Paso a Paso

### Fase A: Extensión de OmegaPack (Senior)
1. [x] **Librería ZIP:** Reutilizar **JSZip** que ya está instalado en el proyecto.
2. [x] **Extender `exportOmegaPack`:**
   - [x] Ubicado en [useBundleTransfer.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/hooks/io/useBundleTransfer.ts).
   - [x] Añadir al zip el archivo `history.json` con `JSON.stringify(historyService.getHistory())`.
   - [x] Añadir `project.json` con metadatos del estado del editor (zoom, panel states, active tabs).
3. [x] **Extender `handleBulkUpload`:** Asegurar que al arrastrar o cargar un `.zip` (OmegaPack), extraiga y rehidrate el manifiesto (`.acemm`), el historial (`history.json`) y cargue los recursos en memoria.

---

### Fase B: Pipeline de Destilación para JUCE 8 (Senior)
1. [x] **Implementar `distillForJUCE.ts`:** Crear la función en `src/omega-ui-core/utils/`.
   - [x] **Aplanar Layout:** Recorrer recursivamente el árbol `ui.tree` acumulando las coordenadas relativas para convertirlas en un array de componentes plano con posiciones `pos` absolutas en píxeles.
   - [x] **Fossilizar Estilos:** Llamar a `distillManifest()` de `StyleResolver.ts` para resolver variantes y paleta a hex.
   - [x] **Poda:** Eliminar metadatos de trabajo del editor.
   - [x] **Mapear Referencias de Assets:** Convertir rutas de assets locales a URIs compatibles con JUCE (ej: `asset://nombre_archivo.png`).

---

### Fase C: Interfaz de Usuario y Guardado (Junior)
1. [x] **Acciones de Guardado:**
   - [x] Asociar `Ctrl+S` a la descarga del OmegaPack ZIP extendido.
   - [x] En [MenuBar.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/layout/MenuBar.tsx), añadir la opción de exportación: **"Export to OMEGA Module Rack"**, que ejecuta `distillForJUCE` y descarga el JSON final.
2. [x] **Carga e Importación Defensiva:**
   - [x] Permitir arrastrar o seleccionar un archivo destilado plano `.dist.json` para ejecutar la reconstrucción defensiva en memoria.

---

### Fase D: Pruebas y Limpieza (Equipo)
1. [x] **Smoke Tests:** Verificar que comprimir y volver a descomprimir un OmegaPack no altera los IDs de los nodos ni sus posiciones.
2. [x] **Typecheck & Linter:** Asegurar limpieza absoluta antes del merge:
   ```bash
   npx tsc --noEmit
   npm run lint
   ```
