# [SPEC] Korg MS-20 External Signal Processor (ESP)

## 📡 Descripción
Implementación fiel del procesador externo del MS-20, permitiendo procesar audio externo (o interno) para extraer voltajes de control de Pitch y Envolvente.

## 🛠 Bloques Funcionales
1. **Signal In / Pre-Amp**: Ganancia de entrada con saturación suave.
2. **Band Pass Filter**: Filtros de corte ajustables (BPF) para aislar la frecuencia fundamental.
3. **Frequency-to-Voltage (Pitch Tracker)**: Algoritmo de Zero-Crossing optimizado para señales monofónicas.
4. **Envelope Follower**: Rectificador y filtro de suavizado para extraer la amplitud.
5. **Threshold / Trigger Out**: Generación de compuertas (Gates) basadas en el nivel de entrada.

## 🔗 Integración en ModGraph
El ESP expone las siguientes fuentes en `ModulationRuntime`:
- `EspPitch`: Frecuencia detectada (mapeable a VCO Pitch).
- `EspEnvelope`: Amplitud detectada (mapeable a VCF Cutoff).
- `EspTrigger`: Señal binaria de disparo.

## 🎛 Parámetros ACE (FLT-VA-003 Sub-component)
- **Low Cut**: Frecuencia de corte inferior del BPF.
- **High Cut**: Frecuencia de corte superior del BPF.
- **CV Adjust**: Escalado de la señal de pitch.
- **Threshold**: Nivel para el disparo del trigger.

---
*Status: Active | Implementación: ABD-IA (2026-03-21)*
