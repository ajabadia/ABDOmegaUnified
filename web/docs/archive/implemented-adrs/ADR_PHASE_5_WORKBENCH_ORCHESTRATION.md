# ADR: Phase 5 - Industrial Workbench Orchestration

## Status
Accepted (Phase 5.5 & 5.6)

## Context
Con la llegada de la Fase 5, el OMEGA Manifest Editor necesitaba evolucionar de una vista única a un entorno de autoría tipo IDE capaz de manejar múltiples contextos simultáneos (Diseño Visual, Código Fuente, Inspección y Auditoría) sin pérdida de flujo de trabajo.

## Decisiones Arquitectónicas

### 1. Multi-Pane Workspace Engine
Se implementó un sistema de gestión de paneles (`WorkbenchContainer.tsx`) basado en el patrón de "Editor Groups" de VS Code.
- **Pane Splitting**: Soporte para dividir el espacio de trabajo en paneles `primary` y `secondary`.
- **Dynamic Resizing**: Un divisor (`SplitDivider`) permite ajustar el ratio de los paneles en tiempo real, persistiendo este valor en el estado global.

### 2. Multi-Tab Governance
Cada panel actúa como un contenedor independiente de pestañas.
- **Tab Focus & Movement**: Lógica para abrir, cerrar y enfocar pestañas entre paneles.
- **Smart Docking**: Automatización para mover vistas auxiliares (como el Inspector) al panel secundario al activar el modo split.

### 3. Persistencia de Estado Visual (ViewState)
Introducción de `WorkbenchTabViewState` para garantizar una experiencia sin fricciones.
- **Persistence Snapshots**: El sistema captura el estado visual (scroll, cursor, zoom) de cada pestaña antes de que sea desmontada o desenfocada.
- **Restauración Automática**: Al volver a una pestaña, se restaura su estado exacto, permitiendo flujos de trabajo "interrupt-free".

### 4. Integración de Monaco Editor (Agnostic SourceView)
Sustitución del placeholder de código por una instancia real de Monaco Editor.
- **Model-Based Architecture**: Uso de `ITextModel` para gestionar múltiples archivos de forma eficiente.
- **JSON Schema Injection**: Validación en tiempo real del estándar OMEGA/ACEMM directamente en el editor.
- **Hot-Sync**: Sincronización bidireccional (debounced) entre el editor de código y el árbol de manifiesto del workbench.

## Consecuencias
- **Positivo**: Incremento drástico en la productividad al permitir edición side-by-side (ej. Rack vs Source).
- **Positivo**: Robustez técnica gracias a la separación de la lógica de layout de la lógica de renderizado de contenido.
- **Negativo**: Mayor carga cognitiva en el manejo del estado global (`useWorkbenchState.ts`), mitigada mediante un patrón Reducer estricto.

---
*Documento que formaliza la arquitectura del espacio de trabajo industrial de OMEGA.*
