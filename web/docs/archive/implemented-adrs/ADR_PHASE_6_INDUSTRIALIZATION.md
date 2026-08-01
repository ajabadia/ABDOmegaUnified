# ADR: Phase 6 - Industrialization: Diagnostics, Persistence & Safety

## Status
Accepted & Validated (Phase 6.x + Consolidation Phase)
Last Audit: 2026-05-11 (Certified SYS_READY)

## Context
Tras consolidar el motor de orquestación de la Fase 5, el OMEGA Manifest Editor requería una capa de industrialización para garantizar la integridad de los datos, la seguridad del flujo de trabajo y una experiencia de diagnóstico de primer nivel ("Zero-Noise"). La Fase 6.3 extiende esta visión hacia diagnósticos globales que trascienden el editor de código.

## Decisiones Arquitectónicas

### 1. Semantic Dirty State Tracking
Se implementó un sistema de detección de cambios basado en hashing canónico (`IntegrityService.ts`).
- **Canonical Hashing**: Los objetos se normalizan (ordenación recursiva de claves y eliminación de `undefined`) antes de ser hasheados. Se excluyen campos de metadatos como `id`, `hash` y `firmwareHash` para garantizar que el tracking sea puramente estructural.
- **Race Condition Protection**: Se introdujo un periodo de asentamiento ("settle period") de 3s tras la carga inicial y una guarda de estado `isInitializing`. Esto bloquea el tracking de cambios hasta que el sistema ha capturado un baseline estable, eliminando el error "Dirty on Load".

### 2. High-Fidelity Diagnostics Surface
Integración profunda entre el motor de validación y la interfaz de usuario.
- **Unified Diagnostic Engine (6.3)**: Se abstrajo el sistema de diagnósticos en un motor de agregación (`mergeDiagnostics`) que unifica múltiples fuentes.
- **Monaco Marker Extraction**: Los errores y advertencias detectados por el motor JSON/Schema de Monaco se extraen y propagan.
- **Structural Auditing**: Se implementó el `StructuralAuditor.ts` para detectar errores semánticos globales (ID Collisions, Broken Binds, Invalid Coordinates) que el esquema JSON no puede capturar por sí solo.

### 3. Safety Guards & Ergonomics
Protección contra pérdida accidental de datos y acciones destructivas.
- **Browser Exit Guard**: Implementación de `beforeunload` para advertir al usuario si intenta cerrar la pestaña con cambios sin persistir.
- **Interactive Badges (Focus-to-Source)**: Las insignias de diagnóstico actúan como enlaces profundos. Al hacer clic, el sistema navega automáticamente a la pestaña 'Source' y enfoca la línea o entidad causante del error.

### 4. Selection -> Source Synchronization
Restauración y mejora de la conexión semántica entre la vista visual y el código.
- **Monaco Decorations**: Uso de `deltaDecorations` para resaltar dinámicamente el bloque de código correspondiente a la entidad seleccionada en el Rack u Orbital.

### 5. Performance & Industrial Validation (Consolidation)
Se sometió la arquitectura a una auditoría de latencia y estrés para certificar su robustez antes de la Fase 7.
- **Zero-Overhead Hashing**: Validación de <4ms para 500 controles, confirmando que el tracking semántico no penaliza el main thread.
- **Industrial E2E Framework**: Implementación de una suite de pruebas (Playwright) que automatiza la validación de los safety guards y el ciclo de vida del dirty state, eliminando regresiones en flujos críticos.
- **Diagnostic Efficiency**: Confirmación de latencia de agregación <1ms, validando la arquitectura lineal O(n) del motor de diagnósticos.

## Consecuencias
- **Positivo (Diagnósticos Unificados)**: Una sola superficie de badges para múltiples fuentes (Monaco + Structural).
- **Positivo (Extensibilidad)**: La arquitectura permite añadir validadores de Rack o Inspector sin modificar el agregador core.
- **Positivo (Productividad)**: Ciclo de corrección instantáneo mediante deep-linking interactivo (Badge -> Código).
- **Positivo (Mantenibilidad)**: Cumplimiento estricto de "Zero-Noise" mediante tipos fuertes, eliminando regresiones silenciosas.
- **Positivo (Rendimiento Certificado)**: El overhead de agregación es técnicamente despreciable (< 1ms), validando la eficiencia de la arquitectura O(n).
- **Neutral**: Mayor densidad de información en tooltips.

## Riesgos Mitigados
- **Falsos Positivos**: El Structural Auditor utiliza lógica determinista; se puede extender con whitelists si el esquema OMEGA evoluciona.
- **Conflictos de Prioridad**: La lógica de `mergeDiagnostics` asegura que los errores críticos de sintaxis siempre tengan prioridad visual.

---
*Documento que formaliza la capa de robustez industrial de OMEGA Era 7.2.3.*
