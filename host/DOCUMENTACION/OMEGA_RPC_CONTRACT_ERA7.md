# OMEGA RPC Contract: Era 7 (Industrial)

## 1. Filosofía: Document-Driven Communication

En la **Era 7**, la comunicación entre la WebUI y el Host C++ abandona la manipulación de estados parciales dispersos. Todo el estado del sintetizador se centraliza en el **PatchDocument**, que es la única fuente de verdad (SOT).

### Reglas de Oro
1. **Numeric Authority**: Se prefiere el direccionamiento por IDs numéricos (`instanceId`, `paramId`) sobre strings.
2. **Atomic Handshake**: Ninguna operación es válida hasta que el handshake de conexión se completa.
3. **Idempotencia**: Toda re-compilación del patch genera un snapshot inmutable en el motor.

---

## 2. El Handshake de Conexión

Para eliminar errores de "Bridge not ready", la UI implementa la secuencia `ensureReady`:

1. **Wait for Native**: UI espera a que el objeto global del bridge sea inyectado.
2. **Ping / Initial State**: UI llama a `getState()`.
3. **State Validation**: El Host devuelve el `PatchDocument` actual con `schemaVersion: "7.0"`.
4. **Ready**: Solo tras recibir el documento, la UI activa sus controles.

---

## 3. Comandos Core (Era 7)

### A. `getState`
Solicita el documento completo de la sesión actual.
- **Respuesta (Payload):**
```json
{
  "schemaVersion": "7.0",
  "patch": {
    "name": "Init Patch",
    "author": "Omega Team",
    "masterGainDb": -6.0,
    "modules": [
      {
        "instanceId": 101,
        "typeId": 1,
        "params": {
          "50": 0.5,
          "51": 0.2
        }
      }
    ]
  }
}
```

### B. `setParameter` (Numeric)
Actualiza un parámetro de forma directa.
- **Payload:**
```json
{
  "instanceId": 101,
  "paramId": 50,
  "value": 0.75
}
```
*Nota: Si `instanceId` es 0, se direcciona a la tabla de parámetros globales.*

---

## 4. Eventos Autoritativos (Push)

### A. `onStateUpdate`
Emitido por el Host cada vez que el documento cambia significativamente (ej: carga de preset, adición de módulos). Contiene el `PatchDocument` completo.

### B. `PARAMCHANGE` (Legacy Bridge)
Sigue usándose para actualizaciones de baja latencia de parámetros individuales, pero la UI debe sincronizar periódicamente con el documento para asegurar integridad estructural.

---

## 5. Telemetría y Pins

La telemetría sigue indexada por strings para compatibilidad con los visualizadores actuales, pero se planea su migración a **TelemetryPins** numéricos en la fase final de la Era 7.

---
## 6. Módulos Autodescriptivos (Binary Truth)

A partir de la **Era 7**, los módulos WASM dejan de depender exclusivamente de archivos `.acemm` externos para su definición técnica básica. El binario se convierte en la fuente de verdad.

### A. El Hook `omega_get_contract`
Todo binario compatible con la Era 7 exporta una función que devuelve un JSON estático con su contrato:
- **Firma:** `extern "C" const char* omega_get_contract()`
- **Contenido:** Define IDs, nombres, rangos de parámetros y unidades.

### B. Flujo de Descubrimiento
1. **Local**: El Host OMEGA intenta cargar el `.acemm`. Si no existe, invoca `omega_get_contract()` del `.wasm` para registrar el componente.
2. **Web**: El Portal **ABDSynthsWeb** instancia el WASM en el navegador y autogenera el editor de manifiestos basándose en este contrato.

### C. Beneficios Industriales
- **Zero Configuration**: Arrastrar y soltar el binario es suficiente para que el sistema lo entienda.
- **Sincronización Total**: Es imposible que el código y sus parámetros no coincidan, ya que viajan en el mismo archivo.

---
## 7. Componentes de UI Estándar (Era 7)

Para garantizar la consistencia industrial, el motor de renderizado de la Era 7 reconoce los siguientes identificadores de componente en el bloque `presentation.ui.component`:

| ID | Descripción | Comportamiento |
| :--- | :--- | :--- |
| `knob` | Control giratorio analógico | Mapeo continuo de 0.0 a 1.0. |
| `display` | Pantalla digital con Stepper | Incluye botones `+` / `-` integrados para ajustes de precisión. |
| `select` | Selector de lista / Menú | Utiliza la tabla `lookup` o `options` del parámetro. |
| `slider-v` | Deslizador Vertical | Ideal para faders de volumen o envolventes. |
| `slider-h` | Deslizador Horizontal | Útil para balances de mezcla o panorámicos. |
| `switch` | Interruptor binario | Alterna entre 0 y 1 con feedback visual de estado. |
| `button` | Pulsador momentáneo | Envía un pulso (1) mientras se mantiene presionado. |
| `port` | Jack de señal (I/O) | Representación física de un punto de parcheo. |
| `led` | Indicador luminoso | Visualizador de estado basado en umbrales de señal. |

---
## 8. Especificación de Racks y Layout (Mecánica)

Para garantizar que los módulos se posicionen y escalen correctamente en la interfaz, el motor de la Era 7 sigue estas métricas industriales:

### A. Racks Disponibles
| Nombre | ID (slot) | Altura Estándar | Propósito |
| :--- | :--- | :--- | :--- |
| **Main Rack** | `lower` / `main` | 420 px (3U) | Módulos de síntesis, efectos y generadores. |
| **Aux Rack** | `upper` / `top` | 140 px (1U) | Utilidades, puentes MIDI, osciloscopios y monitoreo. |

### B. Modos de Altura (`height_mode`)
- **`full`**: El módulo ocupa la altura completa de la rack de 3U (420px).
- **`compact`**: El módulo se escala para la rack de 1U (140px). **Obligatorio para módulos en el slot `upper`**.

### C. Escala de Ancho (HP)
La unidad de medida horizontal es el **HP** (Horizontal Pitch).
- **Relación**: 1 HP = 15 píxeles reales.
- **Ancho Mínimo**: 4 HP (60px).
- **Alineación**: Se recomienda que los módulos tengan anchos en múltiplos de 2 o 4 HP para evitar huecos en la rack.

---
*OMEGA — Especificación de Protocolo Era 7 Industrial*
