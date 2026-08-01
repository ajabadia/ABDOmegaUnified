# Especificación Técnica: OMEGA Rack Renderer (Era 7.2.3 Compliance)

Para garantizar la coherencia absoluta entre el editor de manifiestos y el motor de renderizado de OMEGA, el equipo de desarrollo debe implementar los siguientes estándares arquitectónicos e industriales.

## 1. Geometría y Unidades (Industrial Standard)
El motor debe utilizar el sistema de medida Horizontal Pitch (HP) como unidad base:

*   **Relación de Escala**: 1 HP = 15px.
*   **Escala de Visualización**: El renderizado final en el rack debe aplicar un factor de escala de 1.5x sobre las coordenadas del manifiesto para una legibilidad óptima.
*   **Alturas Estándar**:
    *   **Main Rack (3U)**: Altura fija de 420px. Slot: `main` o `lower`.
    *   **Utility Strip (1U)**: Altura fija de 140px. Slot: `top` u `upper`. `height_mode`: `compact`.

## 2. Jerarquía y Planos Arquitectónicos
El renderizado debe seguir una estructura jerárquica estricta para respetar el z-index y la visibilidad:

1.  **Rack Frame**: Chasis con tornillos en las esquinas y sombras internas.
2.  **Containers (Layout)**: Marcos visuales con variantes (`header`, `inset`, `panel`, `section`).
    *   Deben soportar el estado `collapsed`.
    *   Deben filtrar elementos por tab (`MAIN`, `FX`, `MIDI`, `PATCHING`).
3.  **Cables de Modulación**: Capa dinámica que une puertos basándose en el array `modulations`.
4.  **Entities (Cells)**: Knobs, Jacks, LEDs y Sliders.

## 3. El "Zen de la Alineación" (Regla de los 5px)
Para evitar el "visual jitter" y asegurar un look profesional, el renderer debe:

*   Forzar (o validar) que todos los componentes estén alineados a una cuadrícula de **5px**.
*   Los centros de los Knobs y Jacks deben calcularse siempre sobre múltiplos de 5 para garantizar simetría en el faceplate.

## 4. Normalización de Puertos (Color Coding)
Los puertos (jacks) deben renderizarse con anillos de color basados en el campo `color` del manifiesto o inferidos por su tipo:

*   **Audio/Pitch**: `B_cyan` (Cian industrial).
*   **CV/Modulación**: `neon_amber` (Ámbar).
*   **Gate/Trigger**: `white` (Blanco puro).
*   **MIDI**: `orange` (Naranja intenso).

## 5. Sistema de Attachments (Micro-UI)
Cada componente no es solo un gráfico; es un sistema de accesorios:

*   **Labels**: Renderizados fuera del cuerpo del control (habitualmente `position: bottom`).
*   **Displays/ValueBoxes**: Cuadros de texto dinámicos que muestran el valor y la unidad (`unit`).
*   **Steppers**: Botones +/- integrados en el cuerpo de controles tipo `select`.

## 6. Design Tokens (Theme-Aware)
El renderer **NUNCA** debe usar colores hexadecimales fijos. Debe consumir los tokens CSS del sistema:

*   `wb-text`: Color de etiquetas y fuentes.
*   `wb-surface`: Fondo de contenedores y paneles.
*   `wb-accent`: Color para estados activos o detalles de marca.
*   `wb-outline`: Bordes y separadores.

## 7. Handshake Contract-UI
El renderer debe ser capaz de:

1.  Ingerir un binario `.wasm` y su `.acemm`.
2.  Validar que los binds de la UI existen en el contrato (`omega_get_contract`).
3.  Reflejar la telemetría en tiempo real (`omega_publish_telemetry`) vinculando el `telemetryIndex` con el componente correspondiente.

> [!IMPORTANT]
> El cumplimiento de la **Regla de Identidad Unívoca** (sufijos `_knob`, `_cv`) es obligatorio para evitar colisiones de señales en el motor de renderizado.
