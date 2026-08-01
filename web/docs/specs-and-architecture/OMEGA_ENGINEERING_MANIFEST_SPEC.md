# OMEGA Engineering Manifest Specification (Era 7.2.3)

Este documento detalla las especificaciones técnicas para la construcción de módulos industriales bajo el estándar **OMEGA Era 7.2.3 (Structural Integrity)**.

## 1. The Rack (Global Container)
El Rack define las dimensiones físicas y el estilo visual del módulo.

| Propiedad | Tipo | Opciones / Rango | Descripción |
| :--- | :--- | :--- | :--- |
| `hp` | Number | 4, 6, 8, 12, 16, 24... | Ancho industrial en HP. 1 HP ≈ 15px en este motor. |
| `dimensions` | Object | `{ width, height }` | Definición de píxeles reales. Autoridad sobre `hp` en el renderizado. |
| `skin` | Enum | `carbon`, `industrial`, `glass`, `minimal` | Estética del panel frontal. |
| `layout` | Object | `containers[]`, `gridSnap` | [NUEVO 7.2.3] Estructura arquitectónica con validación espacial. |

---

## OMEGA Manifest Engineering Specification (Era 7.2.3)
**Standard: Aseptic Industrial & Architectural Integrity**

## 1. Architectural Integrity (v7.2.1 - v7.2.3)
### 1.1 Container Authority
Containers (Groups) now exert total authority over their children. 
- **Spatial Entrapment**: Every Cell must reside within the physical boundaries of its assigned container.
- **Out of Bounds (OOB)**: Elements outside the Rack (Max Width based on HP) or their container will trigger a `CRITICAL_INTEGRITY_FAIL`.

### 1.2 Architectural Planes (Tabs)
Containers now support the `tab` property.
- **Visibility Logic**: Elements only render if their parent container's tab is active.
- **Global Containers**: Containers without a `tab` are visible in all planes.

## 2. Aesthetic & Activity Systems (v7.2.3)
### 2.1 Unified Skin System
Four canonical skins are defined for industrial parity:
- `industrial`: Metal dark/cyan standard.
- `carbon`: High-tech carbon fiber micro-texture.
- `glass`: Real-time glassmorphism (backdrop-blur: 12px).
- `minimal`: Clean technical wireframe aesthetic.

### 2.2 Activity Heatmap (Reactive Bubbling)
- **Activity Pulses**: Interaction with any control triggers a visual pulse in the parent container.
- **Decay System**: Activity levels fade organically after 2 seconds of inactivity.

## 3. Cryptographic Integrity (v7.2.3)
### 3.1 Firmware Fingerprint (SHA-256)
All manifests must generate a SHA-256 hash for binary reconciliation.
- **Normalization**: Hashing requires recursive alphabetical key sorting and minification.
- **Binary Sync**: The manifest fingerprint must match the `firmwareHash` provided by the engine's technical contract.

## 4. Compliance Handshake
### 4.1 Detailed Inspection Log
The audit engine provides a "Cartilla de Inspección" including:
- **GOV**: Governance & Mandatory Roles.
- **INT**: Structural & Spatial Integrity.
- **TECH**: Schema & Binding Validity.
- **STYLE**: Aesthetic & Identity Parity.

---

## 2. Layout Architecture (Era 7.2.3)
Los contenedores son las entidades de autoridad sobre la estructura visual, lógica y **espacial**.

### 2.1 Containers & Architectural Planes
Cada contenedor puede estar vinculado a una pestaña específica o ser global.

### 2.2 Container Authority (Jerarquía)
Jerarquía de gobernanza estricta: **Rack > Contenedor > Cell > Elemento/Attachment**.

### 2.3 Structural Integrity (Validación Espacial)
La versión 7.2.3 introduce el cumplimiento obligatorio de los límites físicos:
- **Rack Bounds**: Ningún contenedor ni Cell puede existir fuera de las dimensiones definidas por el HP y la altura del rack.
- **Container Entrapment**: Si una Cell está anclada a un contenedor, sus coordenadas físicas DEBEN estar dentro del área del contenedor. 
- **Enforcement**: Las violaciones de integridad estructural bloquean la certificación "Production Ready" del módulo.
    - `header`: Cabecera cian con tipografía industrial expandida.
    - `section`: Divisor con borde izquierdo grueso (enfocado a flujo de señal).
    - `panel`: Área elevada para agrupaciones funcionales.
    - `inset`: Zona hundida con sombras internas para I/O.
    - `minimal`: Marco invisible, solo etiqueta técnica.

### 2.2 Anchoring
Los componentes se anclan a un contenedor mediante el campo `presentation.container`.
- **Global Coordinates**: Las posiciones de las Cells siguen siendo absolutas respecto al rack (SOT), pero su pertenencia visual es gobernada por el ID del contenedor.

---

## 3. The Cells (Registry Entities)
Las Cells son las entidades registradas en el motor.

### Roles del Registry (Era 4)
- `control`: Input de usuario (Knobs, Sliders, Switches).
- `telemetry`: Feedback visual (LEDs, Displays pasivos).
- `stream`: Datos de audio o CV de alta velocidad (Ports). Soporta hasta 8 puertos de entrada externos (`system.audio.in.0-7`).
- `mod_target`: Destino de modulación explícito.

### Mapping Estético (Era 7.2)
- **`container`**: ID del contenedor arquitectónico de la Era 7.2.
- **`group`**: *Deprecated*. Usado solo para retrocompatibilidad con Era 7.1.

---

## 4. Attachments (Visual Fragments)
Los Attachments son accesorios visuales con **Precisión Dual (X/Y)**.

- **`offsetX / offsetY`**: Desplazamiento fino en píxeles relativo al Core.
- **`type: label`**: Serigrafía técnica con soporte de `role: unit`.
- **`type: led`**: Indicadores de estado vinculados a telemetría.

---

## 5. Technical Handshake (Contract Sync)
- **`bind`**: Debe coincidir exactamente con los IDs exportados por el hook `omega_get_contract` del binario.
- **`precision`**: El motor industrial utiliza por defecto 6 decimales para cálculos internos.
- **Source of Truth (SOT)**: El archivo `.acemm` es la autoridad estética, mientras que el binario `.wasm` es la autoridad lógica.

---

## 6. Universal Cell Architecture (UCA) - Direction of Travel
La arquitectura objetivo de OMEGA es un arbol visual recursivo donde Rack, Face, Container, Cell y Layer comparten una misma base conceptual.

### 6.1 Jerarquia Objetivo
```text
Rack
  Face / Plane
    Container / Group
      Cell
        Cell / Layer / Asset
```

### 6.2 Frontera con el SDK
UCA organiza la interfaz visual, pero no sustituye el contrato tecnico del plugin.
- **`.wasm`**: Autoridad logica. Expone parametros, puertos y telemetria mediante `omega_get_contract()`.
- **`.acemm`**: Autoridad visual. Describe caras, grupos, Cells, estilo, layout y bindings.
- **`bind`**: Puente estricto entre una Cell interactiva y un ID exportado por el contrato WASM.
- **`.acepack`**: Paquete autocontenido con `.wasm`, `.acemm`, assets, fuentes, estilos y templates usados.

### 6.3 Templates vs Instancias
- **CellTemplate**: Definicion reutilizable de catalogo, por ejemplo un knob tipo Roland con filmstrip y label.
- **OmegaNode / Cell instance**: Uso concreto dentro de un Rack, con posicion, overrides visuales y `bind`.

Durante la migracion, los arrays actuales `ui.layout.containers`, `ui.controls`, `ui.jacks` y `presentation.attachments` pueden seguir existiendo como formato plano de interoperabilidad, pero deben poder proyectarse a un arbol UCA sin perdida semantica.

---

## 7. Governance ERA 4 (Hardening)
- **Strictly Typed**: No se permiten campos "ad-hoc" fuera de la especificación.
- **Architectural Integrity**: Todo componente debe preferiblemente estar anclado a un contenedor para obtener el scoring de "Industrial Compliance".
- **Registry Validated**: Todo componente sin un `role` válido será marcado como `orphan`.

---
*OMEGA — Engineering Standard V7.2 — Industrial Governance ERA 4 — SYS_READY*
