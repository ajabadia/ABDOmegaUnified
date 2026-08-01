# OMEGA Module: MIDI TRIGGER
## Era 7.2.3 — Industrial MIDI Note Generator

### 1. Overview
El módulo **MIDI TRIGGER** es una herramienta de interpretación diseñada para disparar eventos MIDI con precisión quirúrgica. Optimizado para el estándar industrial de 1U, separa la capa de rendimiento de la capa de configuración técnica.

### 2. Interface Design (VPC Compliance)

#### MAIN Page (Performance)
*   **Trigger Button**: Pulsador industrial de alta sensibilidad (Variante A). Envía `Note On` al pulsar y `Note Off` al soltar.
*   **Note Display**: Visualizador OLED cian que muestra la nota y octava actual (ej. "C4").
*   **Velocity Display**: Visualizador OLED naranja que muestra el valor de velocidad actual.
*   **MIDI Out**: Puerto de salida MIDI estándar (Naranja).

#### SETUP Page (Configuration)
*   **Note Selector**: Stepper para seleccionar la nota base (C, C#, D...).
*   **Octave Selector**: Stepper para desplazar la octava (-1 a 9).
*   **Velocity Selector**: Stepper para ajustar la intensidad del disparo (0-127).

### 3. Technical Contract
*   **ID**: `midi_trigger`
*   **Family**: `midi`
*   **Form Factor**: 1U (Compact)
*   **Parameters**:
    1. `trigger`: Momentary state (0/1).
    2. `note_idx`: Note index within octave (0-11).
    3. `octave`: Octave shift (Default 4).
    4. `velocity`: Trigger intensity (Default 0.945 / 120).

### 4. Compilation & Deployment
Para compilar y utilizar este módulo en el ecosistema OMEGA:

1.  Asegúrate de que `midi_trigger.cpp` y `midi_trigger.acemm` estén en `D:\desarrollos\ABDOmega plugins\modules\midi_trigger\`.
2.  Ejecuta `build_plugins.bat` en la raíz de la carpeta de plugins.
3.  Copia la carpeta completa a `Resources/modules/` en tu proyecto de motor (**ABDOmega**).
4.  El módulo aparecerá automáticamente en el **Module Registry** del sintetizador.

---
*ABD-SynthEngine Industrial Standards — 2026*
