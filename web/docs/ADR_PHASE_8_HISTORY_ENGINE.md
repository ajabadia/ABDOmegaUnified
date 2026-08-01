# ADR: Phase 8 - History Engine (Undo/Redo)

## Status
Accepted & Certified (SYS_READY_FOR_PHASE_8_CERTIFIED)
Last Audit: 2026-05-11

## Context
Tras la consolidación de la arquitectura multi-documento en la Fase 7, el OMEGA Manifest Editor requería un motor de reversibilidad profesional para garantizar la seguridad en el diseño experimental. La Fase 8 introduce el **History Engine**, un sistema de Undo/Redo basado en el patrón Command y snapshots de estado, optimizado para flujos de trabajo industriales de alta frecuencia.

## Decisiones Arquitectónicas

### 1. Per-Document History Stacks (Isolated Reversibility)
Se decidió integrar la pila de historia directamente en el estado de cada documento dentro del orquestador (`DocumentState`).
- **Isolation**: Cada documento mantiene sus propios stacks `past` y `future`. Deshacer una acción en el Documento A no afecta el estado ni la pila del Documento B.
- **Volatilidad Intencional**: El historial se mantiene exclusivamente en memoria (volátil). No se persiste en `localStorage` para evitar la saturación de cuota y garantizar que cada sesión de edición comience desde un estado de verdad estable (Last Stable Hash).

### 2. Snapshot-Based Command Pattern
Para garantizar el determinismo absoluto en la compleja jerarquía UCA (Universal Cell Architecture), se optó por snapshots completos del manifiesto en cada entrada de historial (`HistoryEntry`).
- **Determinismo**: Elimina la necesidad de calcular deltas complejos o parches (patches) inversos, asegurando que `undo` siempre restaure una estructura válida certificada por el auditor.
- **Payload**: Cada entrada incluye el manifiesto serializado, un timestamp y una etiqueta descriptiva (label) para depuración y trazabilidad.

### 3. Action Coalescing (Interaction Smoothing)
Para evitar la saturación de la pila durante ajustes continuos (ej: arrastrar un slider o escribir en el inspector), se implementó una ventana de coalescencia de **1 segundo**.
- **Temporal Window**: Acciones con la misma etiqueta dentro del margen de 1000ms actualizan el estado actual pero no generan una nueva entrada en `past`. Esto permite deshacer un "ajuste de posición" como una unidad lógica, en lugar de cientos de micro-pasos.

### 4. Global Hotkeys & Focus Guards
Se integraron atajos de teclado (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`) a nivel de `WorkbenchContainer`.
- **Aseptic Input Protection**: Se implementaron "Focus Guards" inteligentes. El motor de historia global cede el control cuando el foco está en elementos `<input>`, `<textarea>`, `<select>` o el **Monaco Source Editor**. Esto permite que la edición de texto mantenga su comportamiento nativo de undo/redo local.

### 5. Undoable System Actions
Se extendió la capacidad de reversibilidad a acciones sistémicas destructivas.
- **Undoable Reset**: La operación "Reset Document" ahora realiza un snapshot preventivo antes de limpiar el manifiesto, permitiendo recuperar el trabajo en caso de ejecución accidental.
- **CRUD Operations**: Todas las operaciones de creación, duplicación y eliminación de entidades (Entities, Modulations, Containers) inyectan automáticamente etiquetas descriptivas en el historial.

## Consecuencias
- **Positivo (Seguridad de Autoría)**: Los ingenieros pueden experimentar con layouts complejos y configuraciones de síntesis sin miedo a pérdidas irreversibles.
- **Positivo (Eficiencia)**: El coalescing mantiene una pila de historia limpia y significativa, facilitando la navegación hacia atrás.
- **Positivo (Integridad)**: El uso de snapshots garantiza que el sistema nunca regrese a un estado estructuralmente inconsistente.
- **Neutral (Memoria)**: El almacenamiento de snapshots completos incrementa el uso de RAM por documento, aunque está dentro de los márgenes industriales para manifiestos de hasta 1MB.

## Riesgos Mitigados
- **Hydration Mismatch**: Se resolvió el parpadeo y errores de hidratación en indicadores visuales (Active Tab Line) mediante guardas de montaje asíncronas (`mounted` state).
- **Temporal Dead Zone (TDZ)**: Se reestructuró `useManifestEditor.ts` para asegurar que las dependencias de auditoría y log están disponibles antes de la inicialización de los setters con historial.

---
*Documento que formaliza el motor de reversibilidad industrial de OMEGA Era 7.2.3.*
