# OMEGA Standard Theme 4.1: Referencia de Componentes

Este documento define las capacidades estéticas del **Tema por Defecto** de OMEGA Era 4.1. El tema sigue una arquitectura semántica donde el diseño se adapta a la intención declarada en el manifiesto ACE del módulo.

## 1. Filosofía de Diseño
*   **Asepsia**: Diseño limpio, profesional y preparado para el entorno DAW.
*   **Profundidad**: Uso de sombras internas (`inset shadows`) y degradados radiales para simular hardware real ("Middle Point").
*   **Responsividad Semántica**: El ruteo visual es la prioridad; los colores de los pins son inamovibles.

---

## 2. Catálogo de Controles

### 2.1 Perillas (Knobs)
| Control | Variantes | Descripción |
| :--- | :--- | :--- |
| `knob` | `variant-A` | **Grande (48px)**. Estilo Moog, ideal para CUTOFF o parámetros maestros. |
| `knob` | `variant-B` | **Medio (32px)**. Estándar, configuración por defecto. |
| `knob` | `variant-C` | **Pequeño (20px)**. Para utilidades o parámetros secundarios. |

### 2.2 Pantallas (Displays)
Utilizadas para listas (`list`) o lecturas de telemetría.
| Look | Variantes | Estilo Visual |
| :--- | :--- | :--- |
| `display` | `variant-A` | **OLED**. Fondo negro, texto Cian brillante (Predeterminado). |
| `display` | `variant-B` | **LCD Retro**. Fondo verde/grisáceo con rejilla de píxeles ("GameBoy style"). |
| `display` | `variant-C` | **LED 7-Seg**. Fondo cristal rojo oscuro, texto segmento ultra-brillante. |

### 2.3 Deslizadores (Sliders)
Soportan orientación automática según el `look` sugerido.
| Look | Orientación | Aplicación |
| :--- | :--- | :--- |
| `slider-v` | Vertical | Envolventes ADSR, Mixers. |
| `slider-h` | Horizontal | Panorámica, Fine-tuning. |

### 2.4 Indicadores LED
| Control | Variantes | Comportamiento |
| :--- | :--- | :--- |
| `led` | `variant-A` | **Redondo Estándar (14px)**. |
| `led` | `variant-B` | **Mini LED (8px)**. |
| `led` | `variant-C` | **Rectangular (16x6px)**. |

**Colores Disponibles (`color`):**
`red`, `green`, `blue`, `yellow`, `white`, `orange` (Default), `cyan`.

---

## 3. Sistema de Parcheo (Ports)
Los Jacks de parcheo aplican colores **automáticamente** según el tipo de puerto definido en el manifiesto.

| Tipo (port.type) | Color Visual | Protocolo de Señal |
| :--- | :--- | :--- |
| `voltage` | **Azul** | Señal DSP / Audio / CV |
| `midi` | **Amarillo** | Eventos MIDI |
| `list` | **Verde** | Selección de menús / Estados |
| `float` | **Cian** | Parámetros GUI continuos |
| `text` | **Rojo** | Datos de texto / Etiquetas |
| `bool` | **Negro** | Lógica Binaria (Glow blanco) |

---

## 4. Ejemplo de Implementación (YAML)

Para usar este estándar en un módulo, define tus items en el YAML ACE:

```yaml
# Ejemplo: Oscilador con controles mixtos
parameters:
  - id: coarse_tune
    control: knob
    variant: "A"  # Perilla grande
    
  - id: waveform
    control: stepper # Renderiza un < display >
    look: display
    variant: "B"     # Pantalla LCD Verde
    
  - id: sync_led
    control: led
    color: "cyan"
    variant: "C"     # LED Rectangular Cian
```

---

## 5. Reglas de Fallback
Si un módulo solicita una variante que no existe (ej. `variant: "Z"`), el sistema revertirá automáticamente a la **Variante B (Estándar)** para asegurar que la interfaz siempre sea funcional y profesional.
