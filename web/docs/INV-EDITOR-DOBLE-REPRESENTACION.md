# Inventario: quién lee el manifiesto por listas planas

> Medido el 3 de octubre de 2026, tras quitar el fallback legacy. Responde a una
> pregunta concreta: de los 35 ficheros que leen `ui.controls` / `ui.jacks`,
> cuáles dependían del interruptor que se quitó y cuáles son lecturas legítimas?

## Qué era "el fallback legacy"

Una bandera, `ui.useUCA: false`, que se activaba desde dos sitios: **View →
"Disable UCA Rendering (Fallback)"** y un botón en el inspector. Doce hooks
ramificaban según `manifest.ui?.useUCA !== false`.

**Qué hacía en realidad, medido en el navegador antes de quitarlo:**

| | |
|---|---|
| ¿Cambiaba el dibujado? | **No.** Ningún componente lee la bandera: el rack dibuja siempre desde `ui.tree`. |
| ¿Qué pasaba al añadir un nodo? | Se escribía en `ui.controls`, que nadie dibuja. Medido: 0 celdas en el árbol, 0 celdas en pantalla. **El trabajo desaparecía sin aviso.** |
| ¿La bandera se quedaba? | **No.** `omegaTreeToManifest` fuerza `useUCA: true` en cada escritura del árbol, así que cualquier escritura la borraba. |

Un plan B que no dibuja, y que además traga trabajo al activarlo, es una vía de
datos muerta con un interruptor en la interfaz. Se quitó.

## Los dos tipos de lector que quedan

Ambos son legítimos, y son cosas distintas. Ninguno depende de la bandera.

**1. La proyección.** `buildManifestFromTree` recalcula `ui.controls` y
`ui.jacks` desde el árbol en cada escritura. Son una **vista derivada**, no una
segunda fuente de verdad. Leerlas está bien, pero son una caché del árbol: ya
nada se escribe ahí de forma independiente.

**2. La compatibilidad con ficheros antiguos.** Un `.json` guardado antes del
formato de árbol no tiene `ui.tree`. `manifestToTree` lo migra al abrirlo, y
`findItem` / `updateItem` siguen consultando las listas planas para que un
documento viejo se convierta en árbol en cuanto se toca. Por eso se quitó la
bandera pero **no** las listas.

## Los ficheros, clasificados

Entre paréntesis, número de apariciones de `ui.controls` / `ui.jacks` en
código que no es de test.

### Consumidores de la proyección — correctos tal cual (17 ficheros)

Leen la lista derivada para no recorrer el árbol. Correcto.

| Fichero | Por qué |
|---|---|
| `components/rack/useConnectionPositions.ts` (3) | Posiciona los tiradores de conexión desde la proyección. **El más importante**: de él dependen los cables, y lo cubren las 22 pruebas de `connection-editor.spec.ts`. |
| `utils/manifestDiff.ts` (10) | Compara dos manifiestos; la forma plana es cómoda para comparar. |
| `services/cadExportService.ts` (2) · `services/mockupService.ts` (2) · `services/sharedModuleCatalog.ts` (1) | Exportación a CAD, maquetas y catálogo de módulos. |
| `utils/buildCommandPalette.ts` (2) · `utils/alignmentUtils.ts` (2) | Paleta de comandos y matemáticas de alineación. |
| `components/modulation/ModulationGrid.tsx` (2) · `components/modulation/VisualModulationMatrix.tsx` (2) · `components/inspector/sections/ModulationSection.tsx` (2) | Visualización de modulación. |
| `components/inspector/sections/EntityIdentity.tsx` (4) · `services/contractService.ts` (4) | Leen `useUCA` como heurística "¿esto es un documento con árbol?", no como interruptor. Inofensivas, se dejan. |
| `hooks/useModuleMetrics.ts` (2) · `hooks/useAuditNavigator.ts` (2) · `utils/governanceUtils.ts` (3) | Métricas, navegación de auditoría y reglas de gobernanza. |
| `hooks/io/useManifestTransfer.ts` (3) | Importar/exportir. **Conserva `useUCA` al cargar** a propósito, para no perder el dato de un fichero antiguo. |

### Compatibilidad con ficheros antiguos — deben quedarse (5 ficheros)

Así se lee y se migra un documento viejo que aún no tiene árbol.

| Fichero | Por qué |
|---|---|
| `omega-ui-core/uca/converters/manifestToTree.ts` (2) | Construye un árbol a partir de un documento plano. Es la migración. |
| `omega-ui-core/uca/converters/flatToTree.ts` (1) | El sentido contrario de la misma conversión. |
| `hooks/entities/ucaInspectorAdapter.ts` (1) | `findLegacyItem` / `adaptManifestEntityToNode`. |
| `hooks/entities/entityCRUDUtils.ts` (2) | Vuelve a escribir la proyección tras editar el árbol. |
| `services/validation/industrialRules.ts` (2) | Valida entidades de cualquiera de las dos formas (`'kind' in entity`, sin relación con la bandera). |

### Autorreferentes — el conversor y su propia salida

`entityCRUDUtils.ts` · `hooks/entities/useBatchUngroup.ts` (2) ·
`hooks/entities/useGroupCRUD.ts` (8) · `hooks/entities/useLayoutCRUD.ts` (2)

### Relacionados con la posición (3 ficheros)

- `omega-ui-core/utils/spatialUtils.ts` (2) — `getOccupiedBoxes`. **Este se
  cambió**: antes medía las colisiones contra `ui.controls` cuando la bandera
  estaba apagada, es decir contra piezas que no estaban en pantalla, así que dos
  nodos podían solaparse sin que nada lo notara. Ahora mide siempre contra el
  árbol, que es lo que se dibuja.
- `omega-ui-core/uca/panelGeometry.ts` (2) · `omega-ui-core/uca/utils/idManager.ts` (2) —
  geometría y reparto de identificadores sobre la forma plana.

### Vaciados — el interruptor y sus ramas muertas

Ya no ramifican por la bandera.

| Fichero | Qué se quitó |
|---|---|
| `components/layout/menuDefinitions.ts` | La opción "Disable UCA Rendering (Fallback)" del menú. |
| `components/inspector/sections/ModuleArchitectureSection.tsx` | El botón "Legacy Rendering Fallback" y tres condiciones `useUCA !== false` que solo existían para ocultarlo. |
| `hooks/entities/useEntityFactory.ts` | Las ramas de escritura de `addEntity` y `pasteEntity` — **las que perdían el trabajo**. |
| `hooks/entities/useEntityOperations.ts` | Las ramas de escritura de `updateItem` y `duplicateItem`. |
| `hooks/entities/useEntityTreeOps.ts` | Dos guardas `!isUCA`. |
| `hooks/entities/useGroupCRUD.ts` | Cuatro guardas `!isUCA`. |
| `hooks/entities/useEntityFinder.ts` | La bandera hacía que se saltara la búsqueda en el árbol; ahora el árbol manda siempre y se conserva la lectura de compatibilidad. |

## Lo que NO se hizo, a propósito

- **No se han unificado los dos componentes duplicados del renderizado.**
  `StructuralNode.tsx` y `CellNode.tsx` son casi idénticos, pero unirlos es
  reescribir ~300 líneas en el corazón del dibujado: riesgo alto, beneficio
  estético. No es el siguiente paso, y quizá nunca sea lo correcto.

- **La bandera sigue en el tipo del manifiesto**, porque un fichero importado
  puede traerla y la importación la conserva a propósito. Ya no se lee como
  interruptor en ninguna parte del editor.

- **Las listas planas no se han borrado.** Son la proyección que consumen 17
  ficheros, y la vía de entrada de los documentos antiguos.

## La regresión que vigila todo esto

`web/e2e/legacy-fallback.spec.ts` — cuatro pruebas, verificadas como **rojas si
vuelve el interruptor**:

1. El menú View no ofrece el fallback.
2. Añadir un nodo lo guarda en el árbol y se ve.
3. **Con `useUCA` forzado a `false` desde fuera, un nodo nuevo sigue yendo al
   árbol y sigue viéndose.** Esta es la que caza la pérdida de trabajo.
4. La proyección plana sigue cuadrando con el árbol tras una escritura.

Comprobado: guardando los cambios de código fuente, **2 de las 4** se ponen rojas.