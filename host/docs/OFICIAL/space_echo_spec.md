# [SPEC] FX-DL-002: Space Echo (Roland RE-201)

## 📼 Descripción
Emulación de alta fidelidad del legendario eco de cinta Roland RE-201. Combina un sistema multi-cabezal con un tanque de reverberación de muelles y saturación analógica.

## 🛠 Arquitectura DSP
### 1. Sistema de Cabezales (Tape Delay)
- **Cabezal 1**: 1.0x (Delay base)
- **Cabezal 2**: 1.9x
- **Cabezal 3**: 2.9x
- **Interpolación**: Hermite/Lineal para cambios de velocidad suaves.
- **Saturación**: Modelo magnético basado en `tanh` asimétrico en el lazo de realimentación (Intensity).

### 2. Spring Reverb Tank
- **Modelo**: 3 líneas de retardo en paralelo con longitudes decoherentes (33ms, 38ms, 47ms).
- **Smear**: Filtro All-pass post-tanque para dispersión de fase.

### 3. Mechanical Instability
- **Wow**: 0.8 Hz (Deriva del motor).
- **Flutter**: 15 Hz (Jitter mecánico).
- **Grosor**: Simulación de ruido de fondo (Hiss) dependiente de la velocidad.

## 🎛 Parámetros ACE
| ID | Nombre | Rango | Descripción |
|----|--------|-------|-------------|
| speed | Repeat Rate | 0.0 - 1.0 | Velocidad de la cinta. |
| intensity | Intensity | 0.0 - 1.0 | Feedback de la cinta. |
| echo_vol | Echo Volume | 0.0 - 1.0 | Nivel de la señal de eco. |
| reverb_vol | Reverb Volume | 0.0 - 1.0 | Nivel de la señal de muelle. |
| mode | Mode Selector | 1 - 12 | Combinación de cabezales activa. |
| wow_flutter | Wow & Flutter | 0.0 - 1.0 | Antigüedad/Condición de la cinta. |
| drive | Tape Drive | 0.0 - 1.0 | Ganancia de entrada a la cinta (Saturation). |

## 🔗 Integración
- **Motor Core**: `VirtualAnalogEngine.h`
- **DSP Component**: `SpaceEchoProcessor.h`
- **ACE Catalog**: `FX-DL-002` en `ace_fx_dl_roland.yaml`

---
*Status: Active | Implementación: ABD-IA (2026-03-21)*
