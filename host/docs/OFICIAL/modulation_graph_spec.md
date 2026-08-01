# ModulationGraph Specification

The **ModulationGraph** is OMEGA's central nervous system, replacing traditional modulation matrices with a flexible, high-performance signal routing graph.

## Architecture
- **Grafo Dirigido**: 32 nodos máx., 64 conexiones máx.
- **Audio-Rate Ready**: Soporte para señales de control (bloque) y audio (per-sample).
- **Feedback Loop**: Soporte para ciclos mediante nodos de delay de 1 sample.
- **Topological Compilation**: El grafo se compila en una estructura plana (`ModulationRuntime`) para ejecución lock-free en el audio thread.

## Signal Types
| Tipo | Rango | Rate | Uso |
|------|-------|------|-----|
| **Control** | 0.0 .. 1.0 | Bloque (interpolado) | Knobs, sliders, LFOs lentos |
| **Audio** | -1.0 .. 1.0 | Audio (per-sample) | FM, AM, LFOs rápidos |
| **Trigger** | 0 o 1 | Audio (edge detection) | Gates, resets, S&H |
| **Pitch** | Semitonos | Bloque | V/Oct, Pitch Bend |
| **Phase** | 0.0 .. 2π | Audio | Sync de osciladores, Phase Mod |

## Node Categories
1. **Sources**: Envelopes, LFOs, MIDI (Velocity, Pressure), Macros.
2. **Processors**: Mix (Sum), Scale (Mult), Curve (Shaper), Quantize, Delay1.
3. **Sinks**: Target Parameters (Cutoff, Detune), Voice Global (Pitch, Gain).

## Thread Safety
- **Message Thread**: Construcción, validación de ciclos (Kahn's Algorithm), compilación a Runtime.
- **Audio Thread**: Ejecución del `ModulationRuntime` compilado. Inmutable durante el proceso del bloque.

## API Preview
```cpp
auto lfo = graph->addLfo(LFOShape::Sine, 5.0f);
auto pitch = graph->addSink("Osc1.pitch");
graph->connect(lfo, pitch, 0.5f); // 50% depth
```
