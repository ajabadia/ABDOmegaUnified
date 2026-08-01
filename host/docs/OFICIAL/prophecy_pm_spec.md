# [SPEC] Korg Prophecy PM Models (MOSS)

## 🎸 Descripción
Modelos de síntesis por modelado físico (Physical Modeling) basados en la arquitectura MOSS (Multi-Oscillator Synthesis System) del Korg Prophecy.

## 🧪 Modelos Implementados
### 1. Plucked String (OSC-PM-005)
- **Algoritmo**: Karplus-Strong con Digital Waveguide.
- **Control**: Excitation Type, Body Resonance, Loss Filter.
- **Fidelidad**: Interpolación fraccional para afinación perfecta.

### 2. Brass Model (OSC-PM-006)
- **Algoritmo**: Modelo de labios y tubo acústico.
- **Control**: Lip Tension, Breath Pressure, Tube Length.
- **Fidelidad**: Non-linear excitation similar al hardware original.

### 3. Reed/Woodwind (OSC-PM-007)
- **Algoritmo**: Excitador de caña (Reed) acoplado a cilindro/cono.
- **Control**: Reed Stiffness, Breath Pressure, Hole Opening.

### 4. VPM (OSC-PM-008)
- **Algoritmo**: Variable Phase Modulation (FM lineal con feedback).
- **Control**: Modulator Depth, Frequency Ratio, Wave Shaper.

## 🎛 Master Macros
Sistema de control orgánico unificado en `ProphecyMacroContext`:
- **Energy**: Brillo y ganancia de armónicos.
- **Movement**: LFOs y cambios tímbricos dinámicos.
- **Air**: Componente de ruido y soplido (Breath noise).
- **Expressivity**: Sensibilidad al Aftertouch y Ribbon.

---
*Status: Active | Implementación: ABD-IA (2026-03-21)*
