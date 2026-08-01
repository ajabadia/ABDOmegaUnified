# Plan de Implementación: Blueprint Store UCA-Native (v9.2.0)

Este documento detalla la especificación de diseño técnico para la fase de la **Blueprint Store** e integración de celdas, adaptada a la arquitectura del manifiesto autocontenido y el árbol canónico de UCA.

---

## 📅 Hoja de Ruta de Tareas (Orden de Implementación)

### 1. [NEW] `extractSubtreeResources(rootNode, manifest)` (Junior - Prioridad: Alta)
*   **Estado:** ✅ Completado e integrado en [StyleResolver.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/omega-ui-core/utils/StyleResolver.ts).
*   **Detalle Técnico:** 
    *   Mapea y filtra de forma recursiva (tree-based) los estilos y assets utilizados en el subárbol del nodo seleccionado para generar exportaciones autocontenidas.

### 2. [MODIFY] Pestañas y Unificación en `BlueprintLibraryPanel.tsx` (Junior - Prioridad: Alta)
*   **Fichero:** [BlueprintLibraryPanel.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/inspector/BlueprintLibraryPanel.tsx).
*   **Detalle Técnico:**
    *   Añadir un componente de tabs compactas (Estilo tech-noir: bordes $\le 8px$, cristal traslúcido, acento cyan `#00f0ff` en activo) para dividir el panel lateral en:
        *   **"Official Store"**: Blueprints oficiales servidos por index.json.
        *   **"User Library"**: Blueprints locales cargados desde disco.
    *   **Unificación/Deprecación**: Deprecar el modal `TemplateGallery.tsx` redirigiendo sus accesos en la UI (MenuBar, Toolbar) para que en su lugar enfoquen y expandan este panel lateral derecho, eliminando el bloqueo a pantalla completa.

### 3. [MODIFY] Habilitar Arrastre (Drag) de Contenedores y Grupos (Senior - Prioridad: Alta)
*   **Ficheros:** 
    *   [StructuralNode.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/omega-ui-core/renderers/components/StructuralNode.tsx)
    *   [CellNode.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/omega-ui-core/renderers/components/CellNode.tsx)
*   **Detalle Técnico:**
    *   **Diagnóstico del Problema de Arrastre/Desplazamiento de Grupos:**
        1. Al agrupar celdas con click derecho, se crea un nodo con `kind: 'group'`. En la lógica actual de `parentIsDraggableContainer`, solo se bloquea el arrastre de los hijos si el padre es un `container` o `face`. Al no incluir `group`, los hijos siguen teniendo `isDraggable = true`.
        2. Al arrastrar un hijo dentro del grupo, este se mueve de forma independiente respecto al grupo en lugar de mover todo el bloque.
        3. El fix del doble arrastre (`onPointerDown={(e) => e.stopPropagation()}`) detiene incondicionalmente la propagación de eventos. Si el hijo tiene `isDraggable = false` (por ejemplo, si estuviera en un contenedor), el click en el hijo detiene el evento y la acción de arrastre nunca llega al contenedor superior, dejándolo "bloqueado".
        4. Si ambos tienen `isDraggable = true` y no hay parada de propagación, se produce un doble arrastre (desplazamiento duplicado en el que el padre se desplaza $dx$ y el hijo se desplaza $dx$ relativo al padre, resultando en un salto de $2 \cdot dx$).
    *   **Solución Propuesta (Fijación de Cuerpo Rígido y Burbujeo Controlado):**
        1. **Redefinir `parentIsDraggableContainer`** en ambos archivos para incluir `group` y **excluir explícitamente el nodo raíz dinámico**:
           ```typescript
           const parentIsDraggableContainer = !!(
             parentNode &&
             parentNode.id !== 'root' &&
             parentNode.id !== manifest.ui?.tree?.id && // Exclusión robusta del nodo raíz
             parentNode.kind !== 'rack' &&
             (parentNode.kind === 'container' || parentNode.kind === 'face' || parentNode.kind === 'group') &&
             !(debugContext?.lockedNodeIds?.includes(parentNode.id)) &&
             (parentNode.layout?.mode === 'absolute' || !parentNode.layout?.mode)
           );
           ```
           Esto asegura que los hijos de un grupo/contenedor/face tengan `isDraggable = false` y no se desplacen de forma aislada, evitando además tratar al nodo raíz como un contenedor arrastrable.
        2. **Bloquear el arrastre del nodo raíz mismo** en `isDraggable`:
           ```typescript
           const isRootNode = node.id === 'root' || node.id === manifest.ui?.tree?.id;
           const isDraggable = !debugContext?.isLiveMode && 
                               node.kind !== 'rack' && 
                               !isRootNode && // Bloquea que el root sea arrastrado al hacer click en su fondo
                               !debugContext?.lockedNodeIds?.includes(node.id) && 
                               !parentIsDraggableContainer;
           ```
        3. **Condicionar la parada de propagación (`stopPropagation`)**:
           Modificar la propiedad en el div de movimiento de `CellNode.tsx` y `StructuralNode.tsx`:
           `onPointerDown={isDraggable ? (e) => e.stopPropagation() : undefined}`
           Si el elemento es arrastrable (`isDraggable = true`), frena el evento para evitar doble arrastre del padre. Si el elemento NO es arrastrable (`isDraggable = false` debido a que pertenece a un grupo o contenedor), deja que el evento burbujee hacia el contenedor/grupo superior para que sea capturado por su handler de arrastre (`isDraggable = true`). Esto permite mover todo el bloque rígido de forma cohesiva al arrastrar cualquiera de sus componentes sin saltos de coordenadas.

### 4. [MODIFY] Posicionamiento y Prevención de Solapamiento (Senior - Prioridad: Alta)
*   **Fichero:** [ucaInjection.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/omega-ui-core/utils/ucaInjection.ts).
*   **Detalle Técnico:**
    *   Al inyectar un blueprint mediante `injectBlueprint()`, calcular el tamaño de su caja contenedora (bounding box de los hijos).
    *   Llamar a `resolveFreePosition()` (del motor de colisiones de `useEntityCRUD.ts`) para calcular una coordenada `layout.pos` libre en el Rack antes de insertar el blueprint en el árbol, evitando que se apilen encima del origen `{x: 10, y: 10}`.

### 5. [MODIFY] Empaquetador `.acepack` en `useBundleTransfer.ts` (Senior - Prioridad: Alta)
*   **Estado:** ✅ Completado
*   **Fichero:** [useBundleTransfer.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/hooks/io/useBundleTransfer.ts).
*   **Detalle Técnico:**
    *   Evolucionar `exportSelectedAsBlueprint` para generar un paquete zip descargable con la extensión `.acepack`.
    *   El zip debe empaquetar:
        1. `blueprint.json` (subárbol UCA + estilos destilados).
        2. Carpeta `/resources/` con los binarios de `extraResources` en uso.
        3. String SVG del thumbnail en los metadatos.

### 6. [MODIFY] UI Inspector: Eliminar Bloqueo Estructural (Senior - Prioridad: Media)
*   **Estado:** ✅ Completado
*   **Fichero:** [EntityIdentity.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/inspector/sections/identity/EntityIdentity.tsx).
*   **Detalle Técnico:**
    *   En la línea 155, cambiar la condición del botón de exportación a `'kind' in entity` para que cualquier celda o grupo seleccionado (no solo `container` y `face`) muestre el botón para guardarse a disco de forma individual.

### 7. [NEW] Thumbnail SVG de Blueprint (Senior - Prioridad: Media)
*   **Ubicación:** `CADExportService.ts` o `BlueprintThumbnailGenerator.ts`.
*   **Detalle Técnico:**
    *   Generar un string SVG que renderice la silueta del subárbol (bounding box y posiciones relativas de los hijos).
    *   Embeber el SVG resultante como un string en el metadato `thumbnail` del blueprint antes de guardarlo en el `.acepack`.

### 8. [MODIFY] Conectar User Library al Estado de la UI (Senior - Prioridad: Alta)
*   **Ficheros:** `useBundleTransfer.ts`, `useWorkbenchState.ts` (o `manifest` en orchestrator).
*   **Detalle Técnico:**
    *   Conectar el resultado de `handleBlueprintUpload` para que los blueprints importados por el usuario se registren en un estado accesible (por ejemplo, en `manifest.moduleTemplates` o un array de `userBlueprints` en el estado del Workbench).
    *   Esto permitirá que `BlueprintLibraryPanel.tsx` lea y liste inmediatamente las tarjetas en la pestaña "User Library".

### 9. [MODIFY] Inyección desde User Library (Senior - Prioridad: Alta)
*   **Fichero:** `BlueprintLibraryPanel.tsx` y `useBlueprintInjection.ts`.
*   **Detalle Técnico:**
    *   Convertir el objeto del blueprint seleccionado (`BlueprintDefinition`) al formato inyectable canónico al hacer clic en él en el panel lateral.
    *   Llamar a `startInjection(blueprint)` para gatillar el pipeline completo de inyección con su dry-run y confirmación en el Rack.


