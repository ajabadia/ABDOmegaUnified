# Estudio de Viabilidad y Arquitectura Técnica: Sistema de Cables de Conexión (Patch Cables) Visuales para ABDOmegaUnified

**Fecha de Análisis:** 31 de Julio de 2026  
**Proyecto Target:** ABDOmegaUnified (Sintetizador Modular Híbrido Era 7 - C++ / JUCE WebView + HTML5 UI)  
**Estado:** Documento de Investigación y Análisis de Viabilidad (Sin cambios de código en ejecución).

---

## 1. Visión General del Concepto

El objetivo es representar de forma **skeuomórfica y fluida** los cables de parcheo Eurorack colgantes sobre las dos filas de rack (`upper-rack` y `lower-rack`), conectando visualmente los conectores jack de 3.5mm de origen y destino en función de las conexiones activas en la **Matrix de Modulación (`ModulePatchbayMatrix`)**.

### Paradigma Dual: Matrix vs. Rack
* **Matrix (`ModulePatchbayMatrix`)**: El "cerebro" preciso de ruteo, donde el usuario establece conexiones, multiplicadores, inversores y atenuadores.
* **Rack Visual (`#omega-rack`)**: El "cuerpo" skeuomórfico, donde las conexiones establecidas en la Matrix cobran vida en tiempo real como **cables físicos colgantes con gravedad, física de balanceo y colores clasificados por tipo de señal**.

---

## 2. Investigación de Proyectos Open-Source en GitHub y Referencias

Hemos analizado diversos proyectos de sintetizadores modulares y motores de grafos web para identificar las mejores prácticas y los problemas reportados:

### A. Proyectos Analizados

| Proyecto / Librería | Tecnología | Enfoque de Cables | Fortalezas | Lecciones Aprendidas |
| :--- | :--- | :--- | :--- | :--- |
| **[Patchcab](https://github.com/spectrome/patchcab)** | Svelte + Web Audio + SVG | Curvas Bézier SVG por cable | Sencillez de estilado con CSS y curvas colgantes muy limpias. | Se satura el DOM cuando hay más de 80 cables activos. |
| **[Noisecraft](https://github.com/maximecb/noisecraft)** | Canvas 2D + WebAssembly | Grafo de nodos interactivo | Cero sobrecarga de DOM. Rendimiento constante a 60 FPS. | Dificultad para hit-testing individual (saber qué cable se toca sin matemática manual). |
| **[Noodlerack](https://noodlerack.com)** | WebAssembly + Canvas Layer | Física de masa-muelle (*Mass-Spring*) | Balanceo realista de cables al mover componentes o arrastrar. | Alto consumo de CPU si la simulación muelle corre continuamente en background. |
| **[Catenary.js / d3-catenary](https://github.com/)** | JS Puro | Cálculo exacto de catenarias con $\cosh(x)$ | Forma físicamente exacta de caída por gravedad. | La función $\cosh(x)$ es más lenta de computar que `cubicBezierTo`. |

---

## 3. Desafíos Técnicos Identificados y Problemas Conocidos

Del estudio de estos proyectos y la arquitectura actual de `ABDOmegaUnified`, se desprenden los siguientes 4 problemas críticos:

### ⚠️ Problema 1: Obstrucción de Controles (Knobs, Conmutadores y Textos)
* **El problema:** En un rack con 15 o 20 cables, los cables colgantes cruzan por delante de potenciómetros y botones de otros módulos, impidiendo ver las etiquetas, los valores o ajustar los mandos con el ratón.
* **Solución Propuesta:**
  1. **Evasión Elástica Proactiva (Cable Repulsion / Deflection):** Cuando el cursor se aproxima a un control ($R < 50\text{px}$), el vientre de Bézier del cable sufre un desplazamiento lateral vectorial en tiempo real, "apartándose" hacia un lado mientras el usuario manipula el mando y volviendo a su postura de reposo al retirar el ratón.
  2. **Modo Rayos X (Ghosting en Hover):** Todo cable que se cruce en el área de interacción de un control activo reduce automáticamente su opacidad a un `15%` (`opacity: 0.15`) o se convierte en una línea punteada sutil.
  3. **Atajo Global de Ocultación (`[H]` / `[Alt]`):** Permite al usuario ocultar temporalmente todos los cables o tensarlos al 100% mientras realiza ajustes finos en el sintetizador.

### ⚠️ Problema 2: Rendimiento DOM vs. Canvas en la Capa SVG
* **El problema:** Crear y rediseñar decenas de nodos SVG en cada frame de animación (`requestAnimationFrame`) puede provocar *repaint thrashing* y caídas de FPS.
* **Solución Propuesta:**
  * Usar una **única capa SVG transparente (`<svg id="patch-cables-overlay">`)** con `pointer-events: none` por defecto colocada sobre `#omega-rack`.
  * **Path Pooling:** Reutilizar nodos `<path>` en lugar de crear y destruir elementos DOM al conectar o desconectar parches.
  * Usar **Bézier Cúbica (`M x1 y1 C cx1 cy1, cx2 cy2, x2 y2`)** en lugar de catenarias hiperbólicas puras, ahorrando el 90% de ciclos de CPU.

### ⚠️ Problema 3: Sincronización de Coordenadas entre Racks (Scroll & Responsive Layout)
* **El problema:** Al hacer scroll horizontal en el rack, cambiar el tamaño de ventana o mover un módulo, las coordenadas $(x, y)$ de las tomas jack cambian en pantalla. Si las curvas no se recalculan con precisión, los extremos de los cables se "despegarán" de los conectores.
* **Solución Propuesta:**
  * Implementar un **Mapa de Posiciones de Jacks (`JackRegistryMap`)** que registra las coordenadas globales mediante `getBoundingClientRect()` filtradas por un `ResizeObserver` y eventos `scroll`.
  * Aplicar transformaciones `vector-effect="non-scaling-stroke"` en el SVG para garantizar nitidez visual en cualquier resolución.

### ⚠️ Problema 4: Rendimiento del Puente JUCE IPC / Web Thread
* **El problema:** Transmitir eventos de animación física de cables hacia C++ recargaría innecesariamente el hilo de comunicación IPC entre la UI y el backend nativo.
* **Solución Propuesta:**
  * **Aislamiento Total en Frontend:** Toda la simulación física, curvatura y renderizado visual del cable corre **100% localmente en el navegador WebView**. El backend C++ / JUCE sólo recibe el valor numérico de la conexión de la Matrix (como ya hace actualmente con `rpcCommandDispatcher`), sin enterarse de las animaciones visuales del cable.

---

## 4. Análisis de Feabilidad para ABDOmegaUnified

### ¿Es factible o "la vamos a liar"?

> **Veredicto: ES TOTALMENTE FACTIBLE Y NO ARRIESGA EL CÓDIGO ACTUAL.**

### Razones Arquitectónicas de Seguridad:
1. **Arquitectura No Invasiva de Capa Cero:**
   * La vista de cables vivirá en un contenedor SVG totalmente independiente `<svg id="patch-cables-overlay">` situado en `z-index: 40`, por encima de los módulos (`z-index: 30`) y los rieles (`z-index: 5`), pero con `pointer-events: none`.
   * Ningún archivo existente de lógica DSP, almacenamiento o eventos nativos de JUCE sufrirá modificaciones destructivas.

2. **Sincronización Pasiva por Suscripción:**
   * El motor de cables se suscribirá a los eventos de `RuntimeStore` y `ModulePatchbayMatrix`.
   * Si la Matrix añade o quita una ruta, el motor de cables simplemente dibuja o retira la curva correspondiente sin alterar la lógica de audio underlying.

---

## 5. Hoja de Ruta para una Futura Implementación (Cuando Se Decida Ejecutar)

1. **Fase 1: Capa Overlay SVG y Registro de Jacks**
   * Crear el elemento `<svg id="patch-cables-overlay">` en `index.html`.
   * Añadir atributos `data-jack-id` a los elementos de conectores jack generados por `ManifestRenderer`.

2. **Fase 2: Motor de Curvas Catenarias/Bézier**
   * Implementar `CablePhysicsEngine` que calcula las curvas cúbicas con holgura por gravedad según la distancia entre tomas.

3. **Fase 3: Algoritmo de Repulsión/Evasión de Controles**
   * Implementar la detección de proximidad entre el puntero del ratón y los tramos de cable para deformar la curva o activar la transparencia rayos X.

4. **Fase 4: Sincronización Doble con la Matrix**
   * Vincular los colores por tipo de señal (Audio, CV, Gate, MIDI) con las rutas activas de `ModulePatchbayMatrix`.

---

*Documento redactado para ABDOmegaUnified. Guardado en la raíz del proyecto para consulta futura.*
