# OMEGA Architectural Precedence Policy
**Era 7.2.3 Industrial Governance**

This policy formalizes the separation of structural authority within the OMEGA Manifest Editor and Runtime. It prevents architectural coupling by defining a clear hierarchy of responsibility between the Inventory, Intent, and Instance layers.

## 1. Hierarchy of Authority

| Layer | Role | Authority Level | Outcome |
| :--- | :--- | :--- | :--- |
| **1. elementCatalog** | **Inventory & Discovery** | **Soft Suggestion** | Provides hints, icons, and "suggested" compatible fragments for UI/UX. |
| **2. Blueprint** | **Intent & Constraint** | **Domain Authority** | Defines the strict rules and allowed compositions for a specific module/cell. |
| **3. UCA Tree** | **Materialized Instance** | **Ground Truth** | Holds the actual data structure currently active in the manifest. |
| **4. CellRenderer** | **Runtime Execution** | **Visual Compliance** | Renders exactly what is in the UCA Tree, regardless of catalog metadata. |

---

## 2. Layer Definitions

### 2.1 elementCatalog (The Librarian)
*   **Responsibility:** Maintains the "dictionary" of available components.
*   **Allowed Logic:** Aesthetic capabilities (what properties exist), suggested fragments (`allowedFragments`), and taxonomy.
*   **Constraint Rule:** Must NEVER block the rendering of a node that exists in the manifest but is not "officially" supported in the catalog.

### 2.2 Blueprint (The Architect)
*   **Responsibility:** Defines how templates and units are combined for a specific tool.
*   **Allowed Logic:** Slot definitions, mandatory fragments, and strict parent/child rules.
*   **Constraint Rule:** Blueprints can override catalog suggestions to create specialized industrial compositions.

### 2.3 UCA Tree / OmegaNode (The Reality)
*   **Responsibility:** Represents the "As-Built" state of the manifest.
*   **Allowed Logic:** Coordinates, property overrides, and explicit children.
*   **Constraint Rule:** If it's in the tree, it's valid for state persistence and auditing.

---

## 3. Operational Rules

### Rule A: The "allowedFragments" Caveat
The `allowedFragments` property in `elementCatalog` is a **UX Helper**. 
*   **In Editor:** Used to filter the "+ Add" menus for a better user experience.
*   **In Runtime:** Ignored. The renderer follows the tree hierarchy, not the catalog suggestions.
*   **Precedence:** `allowedFragments` in `elementCatalog` is a soft UX suggestion and must not override Blueprint-defined composition or UCA-materialized structure.

### Rule B: Capability-Based Rendering
The `CellRenderer` should prioritize the **Presence of Data** over the **Catalog Definition**.
*   If a node has a `glowColor` property but the catalog doesn't list it as a capability for that type, the renderer **SHOULD** still attempt to apply it if the visual skin supports it.

### Rule C: Evolution without Mutation
Expanding the system (adding new ways to use old components) should only require updating a **Blueprint** or creating a new **CellTemplate**, never modifying the `elementCatalog` unless the component gains new fundamental aesthetic capabilities.

---


---

# ADR-014: Precedencia arquitectónica de `elementCatalog`

**Estado:** Accepted  
**Fecha:** 2026-05-12

## Contexto

`elementCatalog` contiene metadatos útiles para descubrimiento, capacidades y ayuda a la UX. Sin embargo, su propiedad `allowedFragments` puede interpretarse erróneamente como una restricción estructural de runtime, generando acoplamiento entre inventario, composición e instancia.

## Decisión

`elementCatalog` se mantiene como inventario de capacidades y sugerencias de autoría. `allowedFragments` debe tratarse como una guía suave para la UX del editor, no como autoridad de composición. La autoridad estructural real corresponde a `Blueprint` y al árbol UCA materializado.

## Consecuencias positivas

- El editor puede usar el catálogo para filtrar, sugerir y orientar al usuario sin bloquear composiciones válidas.
- Los Blueprints mantienen el control de la intención y de las restricciones duras del módulo.
- UCA conserva la soberanía sobre la instancia viva y su persistencia.

## Consecuencias negativas

- Se introduce una dependencia de disciplina documental: los desarrolladores deben recordar que el catálogo no manda sobre el runtime.
- Ciertas validaciones de autoría pasan a vivir fuera del catálogo, en Blueprints o en capas de validación específicas.

## Regla operativa

`allowedFragments` in `elementCatalog` is advisory only. It may guide editor UX, but it must not override Blueprint-defined composition or UCA-materialized structure.

## Resumen

El catálogo informa; el Blueprint decide; el UCA materializa.
