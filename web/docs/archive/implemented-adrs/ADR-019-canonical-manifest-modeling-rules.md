# ADR-019: Regla de Modelado Canónico del Manifiesto OMEGA

## Estado
Aceptado

## Contexto
Durante la evolución de la arquitectura del manifiesto de OMEGA, se ha debatido sobre la representación de los controles y elementos visuales (como knobs, botones, sliders, vumeters o LEDs) y su relación con el modelo subyacente. Se requiere clarificar si estos elementos deben ser concebidos como unidades aisladas con una identidad visual fija y plana, o si su naturaleza es una consecuencia de un modelo de composición jerárquico basado en *cells*.

## Decisión
Se establece formalmente la siguiente **Regla de Modelado OMEGA**:

**El manifiesto canónico debe modelarse siempre como un árbol de *cells* compuesto, no como una lista plana de controles. Cada elemento debe representar una entidad funcional con un rol claro, y su comportamiento visual o interactivo debe emerger de su posición en la jerarquía, sus puertos y su relación con el subárbol que lo contiene.**

### Principios Fundamentales
1. **Unidad Mínima**: La unidad mínima arquitectónica es una *leaf cell*: una entidad funcional indivisible en el modelo canónico.
2. **Proyección Visual**: Un componente visual final (como un knob, button, slider, vumeter o LED) es estrictamente una proyección interpretada de esa *leaf cell* dentro de un contexto estructural y semántico mayor, basándose en sus puertos y rol.
3. **Propósito de los Composites**: Los *composites* (células de mayor rango) existen para agrupar, organizar y gobernar subárboles en cascada, nunca para duplicar estado ni mantener representaciones paralelas.
4. **Verdad Estructural**: La semántica de un elemento no debe depender de una proyección plana paralela en el manifiesto si ya existe una representación canónica en el árbol de nodos (`nodes`).
5. **Deprecación del Modelo Plano**: La entidad plana (`ManifestEntity`) solo tiene permitido existir como un puente temporal o como una salida de compatibilidad durante fases de migración. Bajo ninguna circunstancia debe ser considerada como la fuente de verdad del sistema.

### Consecuencias Prácticas para el Desarrollo
* **Uso imperativo de OmegaNode**: Si un elemento u operador puede expresarse jerárquicamente como `OmegaNode`, debe modelarse obligatoriamente como `OmegaNode`.
* **Ubicación del Comportamiento**: Si un comportamiento o lógica depende de la relación entre diferentes nodos, dicha relación debe modelarse y vivir dentro de la jerarquía del árbol, nunca en arrays auxiliares o diccionarios planos.
* **Limpieza Continua**: Si una propiedad existe única y exclusivamente para traducir información entre un modelo plano legado y el modelo canónico jerárquico, debe programarse su eliminación en el momento en que deje de ser estrictamente necesaria por retrocompatibilidad.

## Resumen Normativo (TL;DR)
> **OMEGA modela la UI como un árbol de cells jerárquicas. La forma final de cada control emerge de su rol funcional, sus puertos y su posición dentro del subárbol. No se mantiene una proyección plana como modelo principal cuando existe representación canónica en nodes. Lo visual no define la verdad del modelo; la estructura canónica sí.**
