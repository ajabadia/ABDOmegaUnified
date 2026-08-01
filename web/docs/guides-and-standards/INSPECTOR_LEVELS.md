# Guía de Niveles del Inspector (Inspector Levels)

El sistema de niveles del **Inspector de Propiedades** (PropertyPanel) sigue una arquitectura progresiva (en cascada) para garantizar una experiencia de usuario limpia y escalable. A medida que se aumenta el nivel, se descubren herramientas de mayor complejidad técnica sin perder de vista las esenciales.

La ubicación del selector para el usuario es: `View > Inspector Level`.

---

## 🟢 Nivel 1: Simple (Essential)
**Target:** Diseñadores rápidos, compositores visuales o usuarios que simplemente buscan organizar componentes sin sumergirse en detalles técnicos.

**Criterio:** Únicamente las propiedades vitales para la identificación, aspecto general y emulación básica.
* **Identidad Esencial:** Nombres, IDs de nodos, firmas de módulo y previsualización.
* **Branding y Taxonomía:** Metadatos visuales, categorías (tags), e información de marca (branding).
* **Emulación Física y Skin Global:** Dimensiones mecánicas base, opacidades globales y colores primarios del Skin.
* **Simulación:** Herramientas orientadas a "Dry-Run" (ej. inyección de LFO local) para probar la cinemática de los controles visuales de forma rápida.

---

## 🟡 Nivel 2: Medium (Por defecto)
**Target:** Constructores de Sintetizadores (Makers), creadores de módulos funcionales completos.

**Criterio:** Se añaden las propiedades lógicas y el control estético preciso. 
*Incluye todo lo del nivel Simple, más:*
* **Diseño y Estética Detallada (Aesthetics Elements/Globals):** Glassmorphism avanzado, inyección SVG manual, manipulación de DOM profunda de los nodos (filtros, bordes asimétricos, variables CSS a medida).
* **Lógica, Puertos y Arquitectura:** Rangos operacionales de los controles (`min`, `max`, `step`), vinculación a puertos DSP/C++ (Binding), gestión de configuración MIDI y definición estricta de jerarquías modulares.

---

## 🔴 Nivel 3: Advanced (Diagnostics)
**Target:** Ingenieros de UCA, depuradores de motor y mantenimiento core.

**Criterio:** Destapa los diagnósticos crudos y el rol de bajo nivel que juega el componente dentro del árbol. Se usa exclusivamente para depuración o resolución de conflictos arquitectónicos.
*Incluye todo lo del nivel Medium, más:*
* **Low-Level Registry Role (EngineeringSection):** Configuración raw de JSON, hooks de ciclo de vida del framework, identificadores opacos.
* **Layout Governance:** Información semántica estricta que dictamina si un componente está siendo secuestrado por una directiva superior (ej. un `z-index` forzado o dependencias cíclicas en el layout del Virtual Rack).

---

## Directrices para nuevos Componentes
Si añades nuevas propiedades o sub-paneles al `PropertyPanel`:
1. **Evalúa el público:** ¿Un usuario casual que monta un sintetizador pre-hecho necesitaría ver esta propiedad? Si la respuesta es NO, entonces pertenece a `Medium` o `Advanced`.
2. **Prioriza el diseño funcional (Medium):** Cualquier cosa relacionada con *Bindings de audio/DSP* pertenece al nivel `Medium`.
3. **Reserva Advanced para Debug:** Cualquier propiedad que exponga el funcionamiento interno de React o de OMEGA Engine, que rompa la inmersión del diseñador, va estrictamente en `Advanced` (Diagnostics).
