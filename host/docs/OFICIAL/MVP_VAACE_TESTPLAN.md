# OMEGA – Test Plan MVP VA/ACE 0.1

## 1. Información general

- Alcance: Validar el MVP Virtual Analog + ACE reducido (Roland/Korg) con 3 presets clave.
- Objetivo: Garantizar estabilidad básica, correcta integración ACE → EngineConfig → DSP, y funcionamiento de la WebUI sobre la capa de servicios.

---

## 2. Matriz de tests automáticos

| ID   | Área             | Caso                                                         | Detalle esperado                                                                    | Estado |
|------|------------------|--------------------------------------------------------------|-------------------------------------------------------------------------------------|--------|
| A-01 | AceCatalog       | Carga desde `aceindex.yaml`                                  | `AceCatalog::createFromResources` devuelve instancia válida, sin excepciones.      | [ ]    |
| A-02 | AceCatalog       | Lookup de componentes VA                                     | `OSC-VA-001/002/004`, `FLT-VA-001/003`, `ENV-ADSR-GEN`, `LFO-001`, `FX-CH-001` OK. | [ ]    |
| A-03 | AceCatalog       | Fallback genérico                                            | Id inexistente → `nullptr`; fallback por familia/engine devuelve genérico.         | [ ]    |
| A-04 | AceValidator     | Preset Juno -> OK                                            | Validación `ValidationStatus::Ok`, sin `issues`.                                   | [ ]    |
| A-05 | AceValidator     | Preset MS20 -> OK                                            | Igual que A-04, pero para preset MS-20.                                            | [ ]    |
| A-06 | AceValidator     | Preset híbrido -> OK                                         | Igual que A-04, pero para preset híbrido.                                          | [ ]    |
| A-07 | AceValidator     | Falta FX Juno -> Degraded + fallback                         | `status == Degraded`, issue `UnknownComponent`, uso de `FX-CH-GENERIC`.           | [ ]    |
| A-08 | OmegaPreset      | `createDefaultVirtualAnalog`                                 | Crea árbol con Global/Layers/Metadata y al menos Layer A válida.                   | [ ]    |
| A-09 | OmegaPreset      | `fromYaml` / `toYaml` idempotentes                           | Serializar y deserializar mantiene campos clave del preset simple.                 | [ ]    |
| A-10 | EngineConfigMgr  | Juno preset -> EngineConfig 1 layer                          | 1 layer VA con osc/filtro/FX configurados, sin punteros nulos.                     | [ ]    |
| A-11 | EngineConfigMgr  | Híbrido -> EngineConfig 2 layers                             | 2 layers válidas, swap atómico de snapshot sin crash.                              | [ ]    |
| A-12 | OmegaInput       | NoteOn/Off básicos                                           | `Midi1InputAdapter` actualiza `InputState` de forma coherente.                     | [ ]    |
| A-13 | PerformanceMon   | Sin allocs en loop de prueba                                 | Bucle de medición en test DSP sin nuevas asignaciones en audio thread.             | [ ]    |

---

## 3. Matriz de tests manuales – Funcionales

### 3.1 Carga básica y estabilidad

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| M-01 | Arranque y cambio de buffer     | Abrir plugin/standalone. Probar 64 / 512 / 2048 samples y 44.1 / 48 / 96 kHz.    | Sin crashes, sin glitches audibles, audio continuo.                 | [ ]    |
| M-02 | Sesión prolongada               | Tocar con cualquier preset MVP durante 10 min.                                   | Estabilidad total, sin artefactos ni fugas de CPU.                  | [ ]    |

### 3.2 Preset Juno puro (Roland)

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| M-10 | Carga preset Juno               | Cargar preset “Juno Pad” desde UI/host.                                          | Sonido VA suave tipo Juno, sin clipping inesperado.                 | [ ]    |
| M-11 | Controles filtro/chorus         | Mover cutoff, resonance y chorus mix en WebUI.                                   | Cambios suaves, sin pops/clicks; carácter típico Juno.              | [ ]    |
| M-12 | Respuesta a velocidad           | Tocar notas suaves/fuertes.                                                      | Diferencias claras en nivel/ataque, sin comportamiento errático.    | [ ]    |

### 3.3 Preset MS‑20 puro (Korg)

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| M-20 | Carga preset MS‑20              | Cargar preset “MS20 Lead/Bass”.                                                  | Sonido agresivo, con cuerpo en medios y graves.                     | [ ]    |
| M-21 | Resonancia y drive              | Subir resonance y drive casi al máximo.                                          | Sonido MS‑20 “chillón” pero estable, sin explosiones de ganancia.   | [ ]    |
| M-22 | Modulación LFO cutoff/pitch     | Activar LFO a cutoff y pitch moderados.                                          | Vibrato y wah controlados, sin aliasing evidente.                   | [ ]    |

### 3.4 Preset híbrido MS‑20 + JP Supersaw

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| M-30 | Carga preset híbrido            | Cargar “Hybrid MS20 JP Supersaw Pad”.                                            | Sonido ancho, con layer JP y layer MS‑20 claramente perceptibles.   | [ ]    |
| M-31 | Detune/spread supersaw          | Subir/bajar detune y spread al extremo.                                          | Cambios en anchura y “chorus interno”, sin inestabilidades.         | [ ]    |
| M-32 | Interacción filtros              | Cambiar entre filtro Juno/MS‑20 en layers (si expuesto en UI).                   | Diferencias claras de carácter, sin inconsistencias.                | [ ]    |

---

## 4. Matriz de tests manuales – Integración ACE / WebUI

### 4.1 Fallbacks

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| I-01 | FX ausente → fallback           | Quitar `FX-CH-001` del catálogo, recargar preset híbrido.                        | Sonido con FX genérico, preset marcado como Degraded (no Invalid).  | [ ]    |

### 4.2 OmegaUiBridge / RPC

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| I-10 | `setParam` desde WebUI          | Mover cutoff/resonancia/chorus en UI con logging RPC activado.                  | Llamadas `setParam(id, value)` con ids coherentes y sin errores.    | [ ]    |
| I-11 | Automatización host → motor     | Automatizar cutoff global desde DAW.                                            | Sonido sigue la automatización sin saltos; sin xruns.               | [ ]    |
| I-12 | Reflejo host → UI (si aplica)   | Cambiar parámetro desde host y observar UI.                                     | UI actualiza valor o al menos no se desincroniza severamente.      | [ ]    |

---

## 5. Matriz de tests manuales – Rendimiento y voz

### 5.1 Polifonía y robo de voces

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| P-01 | Acordes rápidos 16 voces        | Ajustar polifonía alta (p.ej. 16). Tocar acordes rápidos con sustain.           | Robos de voz sin clicks; cola musicalmente razonable.               | [ ]    |
| P-02 | Layer híbrido con polifonía     | Usar preset híbrido con acordes densos.                                         | CPU estable, sin xruns ni caídas.                                  | [ ]    |

### 5.2 PerformanceMonitor

| ID   | Caso                            | Pasos                                                                            | Resultado esperado                                                  | Estado |
|------|---------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------|--------|
| P-10 | Latencia `VirtualAnalogEngine`  | Activar vista/log de PerformanceMonitor, tocar con 3 presets MVP.               | Tiempos por bloque muy por debajo de la duración del bloque.        | [ ]    |
| P-11 | Latencia `ModulationRuntime`    | Igual que P-10, centrado en sección de modulación.                              | Sin picos anómalos ante cambios de preset o mod rutas.              | [ ]    |

---

## 6. Criterios de aceptación MVP VA/ACE

El MVP VA/ACE 0.1 se considera **aceptado** cuando:

- 100 % de los tests automáticos A‑01..A‑13 están en estado “Pass”.
- Al menos el 95 % de los tests manuales M‑xx, I‑xx y P‑xx están en “Pass”, sin fallos críticos (crash, glitch severo, desincronización grave UI/motor).
- Cualquier fallo restante está documentado con ID de issue y workaround claro.
