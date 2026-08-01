# ADR: Phase 7 - Multi-Document Architecture & Industrial Persistence

## Status
Accepted & Certified (SYS_READY_FOR_PHASE_8_CERTIFIED)
Last Audit: 2026-05-11

## Context
Tras la industrialización de la robustez en la Fase 6, el OMEGA Manifest Editor requería evolucionar hacia un flujo de trabajo profesional multi-tarea. La Fase 7 introduce una arquitectura multi-documento que permite la edición simultánea de múltiples manifiestos con aislamiento de estado, persistencia de sesión de alta fidelidad y utilidades de transferencia entre documentos (Clipboard Industrial).

## Decisiones Arquitectónicas

### 1. Document Orchestrator (Canonical Hub)
Se abandonó el modelo de estado único global en favor de un orquestador centralizado (`useDocumentOrchestrator.ts`).
- **Isolation by ID**: Cada documento mantiene su propio `OMEGA_Manifest`, buffer WASM y estado de `dirty`, aislados por un ID único.
- **Active Document Governance**: Un puntero global determina qué documento es el destinatario de las acciones de edición, sincronizando automáticamente las vistas de Rack, Orbital y Source.

### 2. Industrial Persistence & Session Restore
Se implementó una capa de persistencia bifurcada para garantizar la continuidad del trabajo tras reinicios o refrescos de navegador.
- **`omega_session_docs`**: Almacena el contenido raw de todos los documentos abiertos.
- **`omega_workbench_session`**: Almacena el estado de la interfaz de usuario (tabs abiertos, división de paneles, ratio de layout y documento activo por pestaña).
- **Hydration Safety**: Se adoptó un patrón de hidratación diferida (Client-Side Only) para evitar errores de paridad servidor/cliente (Hydration Mismatch) en Next.js, asegurando un primer renderizado estable.

### 3. Cross-Document Clipboard (Strategic Insertion)
Evolución del portapapeles hacia un sistema inteligente y consciente del contexto.
- **ID Regeneration**: Al pegar entidades entre documentos, el sistema regenera automáticamente los IDs (ej: `knob1` -> `knob1_p`) para evitar colisiones y mantener la integridad del direccionamiento.
- **UCA-Native Strategy**: El sistema detecta si el destino utiliza arquitectura UCA o Legacy, insertando la entidad en el árbol jerárquico o en los arrays planos según corresponda, manteniendo siempre la coherencia del manifiesto.

### 4. Stability & Audit Resilience
Refuerzo de los motores de auditoría para soportar el dinamismo de la arquitectura multi-documento.
- **Safety Guards**: Se inyectaron guardianes contra nulos en `StructuralAuditor.ts` e `IndustrialRules.ts`, permitiendo que el sistema permanezca estable incluso cuando los elementos están en estados de transición estructural (ej: durante un pegado o carga parcial).
- **Asset Manager Hardening**: El gestor de recursos se blindó contra cargas de sesión vacías, garantizando un arranque de workbench "Zero-Crash".

### 5. Multi-Tab Workflow Integration
Sincronización bidireccional entre el sistema de pestañas y el orquestador.
- **Document Binding**: Cada pestaña (`WorkbenchTab`) está vinculada a un documento específico mediante su `payload.documentId`.
- **Auto-Switching**: Al cambiar de pestaña, el orquestador actualiza automáticamente el documento activo global, asegurando que los inspectores visuales siempre reflejen la fuente de verdad correcta.

## Consecuencias
- **Positivo (Flujo Profesional)**: Permite comparar y transferir componentes entre manifiestos sin cerrar el editor.
- **Positivo (Resiliencia)**: La persistencia total elimina el miedo a la pérdida de datos por refresco accidental.
- **Positivo (Arquitectura Limpia)**: Se desactivó y tombstoneó el legado de `useManifestState.ts`, quedando pendiente su eliminación física para cierre de higiene total, consolidando una arquitectura escalable para el motor de historia.
- **Negativo**: Incremento en la complejidad del sistema de pestañas para manejar documentos dinámicos.

## Riesgos Mitigados
- **Colisiones de ID**: Mitigado mediante la lógica recursiva de regeneración de IDs en el `pasteEntity`.
- **Desincronización de Vistas**: Mitigado mediante el efecto de sincronización en `WorkbenchContainer` que vincula el documento activo al foco de la pestaña.

---
*Documento que formaliza la transición a la arquitectura Multi-Documento de OMEGA Era 7.2.3.*
