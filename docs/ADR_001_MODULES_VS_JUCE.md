# ADR 001: Módulos OMEGA vs arquitectura JUCE 8

**Estado**: Aprobada
**Fecha original**: 2026-05-05
**Revisada**: 2026-10-04 (cifras de tamaño actualizadas con medidas reales)

---

## Contexto

El motor principal **ABDOmega** está construido sobre **JUCE 8** para aprovechar su potencia en gestión de audio nativo, MIDI y renderizado gráfico acelerado. Surge la duda de si los módulos individuales (WASM) deberían también utilizar JUCE para su desarrollo.

## Decisión

Se prohíbe el uso de JUCE dentro de los módulos WASM de OMEGA. El desarrollo de módulos se realiza con **C++ puro** (estándar C++20/23) y las cabeceras del **SDK de OMEGA** (`engine/include/Core/Ace/`).

## Justificación

### 1. Tamaño del binario

La estimación original era de 10 KB a 100 KB por módulo, frente a 5-10 MB con JUCE estático. **Medido hoy, los binarios reales son bastante más pequeños** (todos los `.wasm` de `modules/`):

| Módulo | Bytes |
| :--- | ---: |
| `midi_in` | 864 |
| `midi_trigger` | 1.718 |
| `440demo` | 2.372 |
| `vca` | 2.379 |
| `lfo` | 2.664 |
| `adsr` | 3.255 |
| `omega_lab_monitor` | 3.385 |
| `midi_2_cv` | 3.391 |
| `vco` | 5.718 |
| `vcf` | 5.959 |

El rango real es **864 B – 6 KB**, tres órdenes de magnitud por debajo de la cota estimada en su día. La decisión se sostiene con holgura; la cifra original era simplemente conservadora.

### 2. Aislamiento del entorno (sandbox)

Los módulos corren en un entorno WebAssembly restringido (nostdlib). JUCE requiere acceso a hilos de sistema, periféricos y APIs de ventana que no están disponibles —ni son seguros— dentro de la arquitectura aislada de OMEGA.

### 3. Responsabilidad del host

El host (ABDOmega) ya gestiona JUCE 8. Su responsabilidad es traducir las peticiones del módulo —vía macros de contrato— a componentes reales de JUCE.

- Un `OMEGA_PARAM` se convierte en un parámetro real del `AudioProcessorValueTreeState` del host.
- Una llamada a `omega_process` ocurre dentro del hilo de audio de alta prioridad gestionado por JUCE.

### 4. Determinismo y rendimiento

El uso de C++ puro garantiza que el código del módulo sea predecible y optimizado por el compilador para WASM, sin el *overhead* de las clases complejas de JUCE.

## Consecuencias

- **Positivas**: carga instantánea, consumo de memoria mínimo, portabilidad total entre plataformas.
- **Negativas**: los desarrolladores no pueden usar directamente las clases de filtros u osciladores de JUCE dentro del módulo; deben implementar el algoritmo o usar librerías DSP ligeras compatibles con WASM.

## Nota

El mismo criterio se aplica a los **renderers**: la UI no dibuja con JUCE, sino con el design system propio de `web/src/omega-ui-core/` (TypeScript + CSS), que el host consume por junction para que ambas caras pinten lo mismo.

---

*Status: Approved · Date: 2026-05-05 · Revisada 2026-10-04 · Author: ABD-IA Engineering*