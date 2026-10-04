# Especificación Técnica: OMEGA Rack Renderer

Estándares arquitectónicos del renderizador, derivados de `web/src/omega-ui-core/` (fuente única del design system, compartida con el host por junction).

> [!NOTE]
> Documento heredado del repositorio `ABDOmega plugins`. **Las cifras y los nombres de API se han verificado contra el código actual.** Las secciones 3 y 4 describían estándares aspiracionales que el renderer nunca implementó; se marcan como tales en lugar de presentarlos como vigentes.

---

## 1. Geometría y unidades

Constantes reales en `web/src/omega-ui-core/uca/panelGeometry.ts`:

| Constante | Valor | Significado |
| :--- | :--- | :--- |
| `RACK_HP_WIDTH_PX` | `15` | 1 HP = 15 px (5,08 mm a escala de edición). |
| `RACK_UNIT_HEIGHT_PX` | `48` | Altura de una unidad de tiling Eurorack. |
| `DEFAULT_RACK_HP` | `12` | Anchura por defecto cuando el manifiesto no declara `rack.hp`. |
| `DEFAULT_PANEL_HEIGHT` | `420` | Alto por defecto si no hay `ui.dimensions.height`. |

### Alturas por unidades

| Unidades | Pixels | Cálculo |
| :--- | ---: | :--- |
| 1U | 144 | `48 * 3` |
| 2U | 192 | `48 * 4` |
| 3U | 432 | `48 * 9` |
| 4U | 576 | `48 * 12` |
| 5U | 720 | `48 * 15` |
| 6U | 864 | `48 * 18` |

> [!IMPORTANT]
> La documentación anterior decía **3U = 420 px y 1U = 140 px**. Las medidas reales son **432 px y 144 px**. La confusion viene de que `DEFAULT_PANEL_HEIGHT = 420` solo aplica cuando el manifiesto **no** declara altura; cuando sí la declara, manda la tabla de unidades.

### Escala de visualización

> [!WARNING]
> El antiguo briefing exigía aplicar un factor **1.5x** sobre las coordenadas del manifiesto. **Ese factor no existe en el código actual.** Buscar `1.5` en el design system solo devuelve una coordenada dentro de un SVG de conectores DIN-5. Las coordenadas del manifiesto se usan tal cual, a escala 1:1, convertidas a px por la tabla de arriba.

---

## 2. Jerarquía y planos

El render sigue esta estructura:

1. **Rack Frame** — chasis con tornillos en las esquinas y sombras internas (`chassisRenderer.ts`).
2. **Containers** — marcos visuales con variantes (`header`, `inset`, `panel`, `section`) y soporte de `collapsed`.
3. **Cables de modulación** — capa que une puertos a partir del array `modulations` (`ConnectionOverlay.tsx`).
4. **Cells** — knobs, jacks, LEDs, sliders (`CellRenderer.ts`).
5. **Visualizadores** — scopes y terminales (`ScopeRenderer.ts`, `TerminalRenderer.ts`).

### Límite conocido de la capa 3

> [!IMPORTANT]
> La capa de cables **se dibuja pero no enruta audio**. El array `modulations` se persiste en el manifiesto y se usa para pintar las curvas SVG, pero ningún consumidor en el navegador lo lee: el `AudioWorklet` ejecuta un grafo fijo. Los cables CV, gate y MIDI tampoco entran en el grafo de compilación, que hoy solo acepta pares audio→audio. Ver la sección 9.

---

## 3. Alineación a rejilla

> [!WARNING]
> La antigua "regla de los 5 px" **nunca se implementó**. El renderer no alinea nada a múltiplos de 5 de forma automática.

Lo que sí existe es `snapToGrid(pos, config)` en `web/src/omega-ui-core/uca/spatialConstraints.ts`, que **redondea según la configuración de rejilla que elija el usuario** (`GridConfig.spacingX` / `spacingY`), no según una constante fija. Se usa al arrastrar elementos (`useUCADrag`) y al previsualizar.

Si se quiere la rejilla de 5 px, hoy se consigue activando `grid.enabled` con `spacingX = spacingY = 5` en el manifiesto. Convertirlo en un estándar obligatorio es trabajo pendiente.

---

## 4. Color de puertos

Los puertos se colorean por **inferencia sobre el id y la etiqueta**, no por un campo `color` en el manifiesto. La lógica está en `inferPortSignalColor` (`PortRenderer.ts`):

| Señal | Token |
| :--- | :--- |
| Contiene `midi` | `--signal-midi` |
| Contiene `gate` o `trig` | `--signal-gate` |
| Contiene `cv` o `mod` | `--signal-cv` |
| Contiene `pitch`, `freq`, `out`, `in` | `--signal-audio` |
| Sin coincidencia | `--wb-primary` |

Existe además un **color explícito** por variante de estilo: si el nodo trae `style.color`, se respeta y tiene prioridad sobre la inferencia.

> [!IMPORTANT]
> Los identificadores `B_cyan` y `neon_amber` **sí existen**, como variantes de estilo (el default de `CellRenderer` es `B_cyan`, y `VariantParser` lo traduce a un token CSS). No son "colores de jack" como sugería el texto antiguo: son nombres de variante del skin. Se pueden escribir en `style.variant`.

---

## 5. Design tokens

> [!IMPORTANT]
> Este punto **se cumple**. El renderer no usa hexadecimales fijos: consume los tokens CSS definidos en `web/src/omega-ui-core/tokens/vars.css`.

| Token | Rol |
| :--- | :--- |
| `--wb-surface` | Fondo de contenedores y paneles. |
| `--wb-text` | Etiquetas y tipografía. |
| `--wb-accent` | Estados activos y detalles de marca. |
| `--wb-outline` | Bordes y separadores. |
| `--wb-primary` | Color primario del skin. |

`vars.css` define además el tema claro, así que el mismo componente se adapta sin ramas en el código.

---

## 6. Sistema de attachments

Cada componente admite accesorios declarados en `attachments`:

- **Labels** — fuera del cuerpo del control, habitualmente `position: bottom`.
- **Displays** — cuadros de texto con el valor y su `unit`.
- **Steppers** — botones `+/-` integrados en los controles tipo `select`.

---

## 7. Handshake contrato ↔ UI

El enlace entre el `.acemm` y el `.wasm` se verifica en dos puntos:

1. **En build** — `node scripts/review_module_contracts.mjs` cruza cada `bind` de `ui.controls` contra los `OMEGA_PARAM`/`OMEGA_PORT` del `.cpp`, y exige que todo parámetro del contrato tenga un `bind` en el manifiesto.
2. **En runtime** — `omega_get_contract()` se lee del binario ya cargado y sus parámetros alimentan los controles (así lo hace el Rack Player, que construye los sliders desde el contrato que devuelve el worklet, no desde el manifiesto).

> [!WARNING]
> La sección 7 del briefing original describía tres vías de telemetría que **no existen con esos nombres**: `telemetryIndex`, `window.omega_get_scope_buffer(bindId)` y el evento `omega:TERMINALLOG`. No hay ninguna coincidencia en `omega-ui-core`. El scope actual se implementa en [ScopeRenderer.ts](../web/src/omega-ui-core/renderers/ScopeRenderer.ts) y el terminal en [TerminalRenderer.ts](../web/src/omega-ui-core/renderers/TerminalRenderer.ts).

---

## 8. Visualizadores

- **Scope** — se renderiza sobre `<canvas>` (`<canvas class="scope-canvas">`). La persistencia de fósforo y el refresco a 60 fps con `requestAnimationFrame` **no están implementados**: el renderer emite el markup del canvas, sin ciclo de dibujo.
- **Terminal** — buffer circular de texto con tipografía monoespaciada. `SequenceRenderer.ts` cubre el caso de secuencias animadas.

---

## 9. Deuda técnica documentada

Resumen honesto de lo que el briefing pedía y el código no hace. Cada punto es trabajo real, no speculation:

| # | Expectativa antigua | Realidad |
| :--- | :--- | :--- |
| 1 | Factor de escala 1.5x | No existe. Coordenadas 1:1. |
| 2 | Alineación obligatoria a 5 px | Solo si el usuario activa la rejilla a 5 px. |
| 3 | `jacks:` con campo `color` | `ports:` con `type:`; el color se infiere. |
| 4 | Colores de jack `B_cyan` / `neon_amber` | Existen, pero como variantes de skin, no como tipos de jack. |
| 5 | `telemetryIndex`, `omega_get_scope_buffer`, `omega:TERMINALLOG` | No existen con esos nombres. |
| 6 | Fósforo y refresco a 60 fps del scope | No implementados. |
| 7 | Los cables enrutan audio | Se dibujan; el audio usa un grafo fijo. |

---

*Especificación técnica · Verificado en ABDOmegaUnified, 2026-10-04.*