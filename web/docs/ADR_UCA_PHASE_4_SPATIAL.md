# ADR: UCA Phase 4 - Spatial Governance & Layout Stability

## Status
Accepted

## Context
Tras consolidar la jerarquía recursiva en la Fase 3, el sistema necesitaba una precisión de grado industrial para la manipulación de componentes en el espacio 2D. La Fase 4 se centró en la transición de un modelo de "flujo" a un gobierno de **Coordenadas Absolutas** y la estabilización del motor de resolución espacial dentro del OMEGA Workbench.

## Decisiones Arquitectónicas

### 1. Motor de Coordenadas Absolutas (Spatial Engine)
Se formalizó el uso de coordenadas `x`, `y`, `w`, `l` (Width/Length) como la fuente de verdad para el renderizado en el Rack.
- **W/L Parity**: Sincronización estricta entre los campos del Inspector y las métricas visuales del Rack.
- **Unidad OMEGA**: Adopción de la rejilla de 1px como unidad base, eliminando redondeos flotantes que causaban "jitter" visual.

### 2. HUD de Métricas (Real-time HUD)
Implementación de un overlay dinámico en el Rack que muestra las dimensiones y posición del nodo seleccionado en tiempo real.
- **Aesthetic**: Uso de líneas de cota cian (Industrial Cyan) con tipografía JetBrains Mono para reforzar el look de herramienta CAD.
- **Performance**: El HUD opera sobre un canvas/overlay independiente para no re-renderizar todo el Rack durante el arrastre.

### 3. Sincronización de Profundidad (Z-Index Governance)
Establecimiento de reglas de apilamiento para nodos anidados. 
- La profundidad visual ahora es una función de la jerarquía del árbol del manifiesto, asegurando que los hijos siempre se rendericen sobre sus padres sin necesidad de `z-index` manuales arbitrarios.

### 4. Inspector de Posicionamiento
Refactorización de la sección de Layout en el Inspector para incluir controles granulares de:
- **Anchors**: Definición de puntos de anclaje para comportamiento responsivo básico.
- **Constraints**: Validación en tiempo real para evitar que los componentes se salgan de sus contenedores padres.

## Consecuencias
- **Positivo**: Logramos paridad visual total entre lo que el usuario ve en el editor y lo que el motor ABDOmega renderiza en el plugin.
- **Positivo**: Eliminación de errores de desbordamiento de contenedores gracias a las restricciones espaciales.
- **Negativo**: Mayor complejidad en el cálculo de colisiones y drag-and-drop, que se abordará en futuras optimizaciones de UX.

---
*Documento generado para completar la genealogía técnica del proyecto OMEGA.*
