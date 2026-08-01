/**
 * @purpose Proporciona y exporta secciones relacionadas con los desarrolladores para la documentación de ayuda del editor de manifesto OMEGA.
 * @purpose_en Defines and exports developer-related sections for the OMEGA manifest editor's help documentation.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:mgun1l
 * @lastUpdated 2026-06-19T18:47:57.901Z
 */

import type { HelpSection } from './helpDataTypes';

export const DEVELOPER_SECTIONS: HelpSection[] = [
  {
    id: 'binary_truth',
    title: 'Binary Truth (Descubrimiento)',
    icon: '💎',
    category: 'developer',
    content: 'En la Era 7, el binario WASM es la Fuente de Verdad (SOT).',
    subsections: [
      {
        id: 'discovery_flow',
        title: 'Flujo de Descubrimiento',
        content: '1. El Host busca el archivo .acemm.\\\\n2. Si no existe, invoca omega_get_contract() del .wasm.\\\\n3. El sistema autogenera el contrato técnico basándose en el binario.',
        category: 'professional'
      }
    ]
  },
  {
    id: 'governance',
    title: 'Gobernanza Industrial',
    icon: '🛡️',
    category: 'developer',
    content: 'Reglas críticas para garantizar la estabilidad. **ESTADO: SYS_READY**. El motor OMEGA ya implementa estas reglas de forma nativa.',
    subsections: [
      {
        id: 'golden_rules',
        title: 'Las 6 Reglas de Oro',
        content: '1. **Identidad Unívoca**: Usa sufijos (_knob, _cv) para evitar el error de "Double Identity".\\\\n2. **Separación Registry-UI**: El Registry define la señal, la UI el aspecto.\\\\n3. **Triángulo del Patchbay**: Sin role ni label, el puerto no aparecerá en la Matrix.\\\\n4. **Coherencia de Tipos**: No mezcles Audio (48kHz), CV y MIDI.\\\\n5. **Escala 1.5x**: Respeta los límites físicos y deja aire para los cables.\\\\n6. **Compliance Primero**: No ignores los avisos del motor de auditoría.',
        technical_params: ['snake_case', 'unit', 'bind_sync']
      },
      {
        id: 'overview_standards',
        title: 'Geometría y Diseño Industrial',
        content: 'Para garantizar la coherencia en el rack, OMEGA sigue reglas estéticas estrictas:\\\\n• **Geometría**: La unidad base es el **HP (Horizontal Pitch)**. 1 HP = 15px.\\\\n• **Alineación**: Todos los componentes deben alinearse a una cuadrícula de **5px** (Regla del Zen).\\\\n• **Altura**: El chasis estándar (3U) mide **420px**. El modo compacto (1U) mide **140px**.',
        category: 'professional'
      },
      {
        id: 'port_colors',
        title: 'Código de Colores (Ports)',
        content: 'Usa estas variantes para identificar el tipo de señal:\\\\n• **Cian (B_cyan)**: Audio y Pitch (V/Oct).\\\\n• **Ámbar (neon_amber)**: Modulación y CV.\\\\n• **Blanco (white)**: Gates y Triggers.\\\\n• **Naranja (orange)**: Datos MIDI e impulsos de reloj.',
        category: 'professional'
      },
      {
        id: 'advanced_audit',
        title: 'Auditoría Avanzada',
        content: '• **Orphan Binds**: Vinculaciones a IDs que no existen en el contrato.\\\\n• **Telemetry Collision**: Duplicidad de telemetryIndex.\\\\n• **Out of Bounds**: Elementos fuera de las dimensiones HP/3U.\\\\n• **Tab Chaos**: Referencias a pestañas no definidas en el layout.\\\\n• **Incoherencia Rol-Dirección**: Marcar como output algo que tiene rol input.',
        technical_params: ['telemetryIndex', 'hp_multiples', 'role_coherence']
      },
      {
        id: 'inspection_report',
        title: 'Reporte de Inspección Detallado',
        content: 'La herramienta de auditoría genera una "Cartilla de Inspección" que desglosa los fallos en tres dominios:\\\\n• **Technical**: Integridad de IDs y vínculos WASM.\\\\n• **Spatial**: Colisiones físicas y desbordamientos del panel.\\\\n• **Governance**: Estándares de color, unidades y paridad de HP.\\\\nCada fallo incluye una recomendación técnica específica para alcanzar la certificación.',
        technical_params: ['InspectionCard', 'Compliance domains', 'Technical Recommendations']
      },
      {
        id: 'port_normalization',
        title: 'Normalización de Puertos',
        content: 'OMEGA utiliza un código de colores universal para facilitar el parcheado:\\\\n• **Audio (Cyan)**: Señales de alta frecuencia.\\\\n• **CV (Ámbar)**: Modulaciones y control.\\\\n• **Gate/Trigger (Blanco)**: Eventos binarios.\\\\n• **MIDI (Naranja)**: Datos de protocolo.',
        technical_params: ['color: B_cyan | neon_amber | white | orange']
      },
      {
        id: 'rule_5px',
        title: 'Regla de los 5px',
        content: 'La perfección industrial requiere alineación. El motor de renderizado OMEGA ahora aplica automáticamente este redondeo para garantizar un acabado profesional.\\\\n• **X**: Centrado en el HP.\\\\n• **Y**: Alineado a la cuadrícula de montaje.',
        technical_params: ['RENDER_SCALE: 1.5', 'Snap: 5px']
      },
      {
        id: 'theme_contrast',
        title: 'Zen del Contraste',
        content: 'Nunca uses colores fijos (#000). Los módulos deben ser "Theme-Aware".\\\\n• Usa **wb-text** para etiquetas.\\\\n• Usa **wb-surface** para fondos.\\\\n• Usa **wb-accent** para detalles de marca.',
        technical_params: ['uiTheme: dark | light', 'tokens']
      },
      {
        id: 'pro_master',
        title: 'Nivel Pro-Master',
        content: '• **Unidades Obligatorias**: Define Hz, dB, ms en cada parámetro.\\\\n• **Attachments**: Evita colisiones de etiquetas entre módulos vecinos.\\\\n• **Tokens de Tema**: Prohibido usar Hex (#FF0000). Usa tokens como red_3mm o neon_amber.\\\\n• **Gobernanza de Versión**: Si cambias un ID en el Registry, sube la versión del manifiesto (7.0 -> 7.1).\\\\n• **Ancho Estándar**: Usa siempre anchos pares (4, 6, 8, 12 HP) para una rack limpia.',
        technical_params: ['version_bump', 'theme_tokens', 'even_hp']
      },
      {
        id: 'port_colors_pro',
        title: 'Código de Colores Pro',
        content: 'OMEGA usa un código de colores universal para los cables virtuales:\\\\n• **Audio**: Cyan / Blanco (Señales de alta fidelidad).\\\\n• **CV (Modulación)**: Ámbar / Neón (Señales de control).\\\\n• **Gate/Trigger**: Rojo / Magenta (Señales de disparo).\\\\n• **MIDI**: Verde (Streams de datos).',
        technical_params: ['type: audio | cv | gate | midi']
      },
      {
        id: 'theme_zen_advanced',
        title: 'Zen del Contraste (Avanzado)',
        content: 'Los tokens de tema (ej: `outline`, `surface`) se adaptan automáticamente al modo Light/Dark. Nunca uses colores fijos para las etiquetas si quieres que tu módulo sea legible bajo cualquier condición de iluminación de la rack.',
        technical_params: ['uiTheme: light | dark']
      },
      {
        id: 'aseptic_encapsulation',
        title: 'Aseptic Encapsulation (v7.2.3)',
        content: 'Directiva Crítica: "Identidad en el Módulo, Física en el Core".\\\\n• **Identidad**: Los colores específicos y assets viajan dentro del .acemm.\\\\n• **Física**: Las sombras y la iluminación global son impuestas por el Host via variables CSS (`--omega-global-shadow-*`). Esto garantiza que el módulo sea autoportante pero visualmente coherente en el rack.',
        technical_params: ['--omega-global-shadow-x', '--omega-global-shadow-y', '--omega-global-shadow-blur']
      }
    ]
  },
  // --- SDK CORE ---
  {
    id: 'sdk_core',
    title: 'WASM ABI & Core',
    icon: '⚙️',
    category: 'developer',
    content: 'Especificaciones técnicas para el desarrollo de binarios DSP compatibles con OMEGA.',
    subsections: [
      {
        id: 'abi_handshake',
        title: 'The Handshake (Exports)',
        content: 'El binario es la **Fuente de Verdad**. Debes exportar estas funciones para que OMEGA pueda instanciar tu código:',
        technical_params: [
          'omega_get_contract(): Retorna el JSON del contrato.',
          'omega_init(float sampleRate): Inicialización de buffers.',
          'omega_process(const float* buffer, int len): Procesamiento DSP.',
          'omega_on_param(int paramId, float value): Cambio de parámetro.',
          'omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2): Hook para eventos MIDI entrantes.'
        ]
      },
      {
        id: 'abi_handshake_detail',
        title: 'Detalle: omega_on_midi',
        content: 'Permite al módulo reaccionar a eventos MIDI externos (Teclado, DAW). Los parámetros siguen el estándar MIDI de 3 bytes:\\\\n• **status**: Byte de estado (ej: 0x90 para Note On).\\\\n• **d1**: Data 1 (ej: Número de nota 0-127).\\\\n• **d2**: Data 2 (ej: Velocidad 0-127).',
        category: 'professional'
      },
      {
        id: 'abi_imports',
        title: 'Host Imports (Namespace: env)',
        content: 'Funciones que tu plugin puede importar desde el host OMEGA para interactuar con el motor:',
        technical_params: [
          'omega_publish_telemetry(float): Envío de datos (0-1) para visualizadores (LEDs, Meter, Scopes).',
          'omega_publish_midi(uint32_t p, uint8_t s, uint8_t d1, uint8_t d2): Envía MIDI al Host.',
          'omega_log_terminal(const char* bindId, const char* msg): Escribe texto en una primitiva Terminal.',
          'omega_get_system_buffer(const char* id): Acceso a buffers de sistema (main_l, main_r).',
          'omega_get_sample_rate(): Devuelve la frecuencia de muestreo actual.',
          'omega_get_block_size(): Devuelve el tamaño de buffer del motor.',
          'omega_log(const char*): Depuración en consola host (LOG).'
        ]
      },
      {
        id: 'abi_specs',
        title: 'Especificaciones Industriales',
        content: 'Límites recomendados para garantizar la estabilidad en tiempo real:',
        technical_params: [
          'Stack Size: 128 KB',
          'Heap Size: 64 KB',
          'Standard: OMEGA-ABI-7.2.3-INDUSTRIAL'
        ]
      },
      {
        id: 'abi_lifecycle',
        title: 'Ciclo de Vida (Lifecycle)',
        content: '1. **omega_get_contract**: Llamada única al cargar para definir parámetros.\\\\n2. **omega_init**: Llamada única para reservar memoria fija.\\\\n3. **omega_process**: Llamada de alta prioridad (Audio Thread) en bloques de 32/64 samples.\\\\n4. **omega_on_param / on_midi**: Llamadas asíncronas (UI Thread) que interrumpen el proceso de forma segura.',
        technical_params: ['thread_safety', 'atomic_updates']
      },
      {
        id: 'abi_constraints',
        title: 'Límites WASM (Nostdlib)',
        content: 'Para mantener el rendimiento, no uses la librería estándar completa. Evita: `std::vector` dinámico (usa arrays fijos), `std::cout` (usa `omega_log`) y cualquier operación de archivo (I/O). El binario debe ser puramente determinista.',
        technical_params: ['determinism', 'fixed_memory']
      },
      {
        id: 'adr_001_no_juce',
        title: 'ADR 001: Pure C++ vs JUCE',
        content: '**Decisión Estratégica**: Se prohíbe el uso de JUCE dentro de los módulos WASM. Los módulos deben ser "Pure C++" (std 20/23).\\\\n\\\\n**Justificación**:\\\\n1. **Tamaño**: Un módulo JUCE pesaría >5MB. Un módulo OMEGA pesa <100KB.\\\\n2. **Seguridad**: JUCE requiere acceso a hilos y APIs de sistema prohibidas en el Sandbox WASM.\\\\n3. **Host Responsibility**: El motor (ABDOmega) ya usa JUCE 8 y gestiona el audio/MIDI por ti.',
        category: 'professional'
      },
      {
        id: 'abi_debugging',
        title: 'Depuración y Logs',
        content: 'Usa `omega_log("Mensaje")` para enviar texto al host. Estos mensajes aparecerán en la Consola de Depuración de OMEGA. Para logs persistentes en el panel frontal del instrumento, utiliza `omega_log_terminal` vinculado a un componente `terminal`.',
        technical_params: ['omega_log', 'omega_log_terminal']
      },
      {
        id: 'sdk_structure',
        title: 'Estructura del Entorno (SDK)',
        content: 'El repositorio de desarrollo está organizado para facilitar la ingeniería industrial:\\\\n• `/include`: Cabeceras oficiales (`Core/Ace/OmegaContract.h`).\\\\n• `/modules`: Directorio de trabajo para el código fuente .cpp.\\\\n• `/scripts`: Herramientas de automatización (`build_plugins.bat`).\\\\n• `/toolchain`: Compilador LLVM preconfigurado.',
        category: 'professional'
      },
      {
        id: 'build_pipeline',
        title: 'Build System (Clang/LLVM)',
        content: 'El motor utiliza clang++ (LLVM 22.1.4) para generar binarios ultra-ligeros optimizados para DSP. El comando exacto es:',
        code: `clang++ --target=wasm32 -O3 -nostdlib \\\\\n  -I../include -fno-exceptions -fno-rtti \\\\\n  -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined \\\\\n  -o plugin.wasm source.cpp`
      },
      {
        id: 'build_flags',
        title: 'Desglose de Flags',
        content: '• -O3: Optimización máxima para audio en tiempo real.\\\\n• -nostdlib: Evita la librería estándar para mantener el binario ligero.\\\\n• -Wl,--export-all: Garantiza que omega_process y omega_on_midi sean visibles por el host.'
      },
      {
        id: 'build_contract',
        title: 'Extracción del Contrato',
        content: 'Tras la compilación, se debe extraer el contrato técnico llamando a omega_get_contract():',
        code: `node extract_contract.js modulo.wasm`
      },
      {
        id: 'build_bat',
        title: '🚀 Cómo lanzarlo',
        content: 'Simplemente ejecuta el script automatizado desde la carpeta de herramientas:',
        code: `.\\\\scripts\\\\build_plugins.bat`
      },
      {
        id: 'build_aot',
        title: 'Optimización AOT (Pro)',
        content: 'Si tienes wamrc instalado, el sistema generará código máquina nativo:',
        code: `wamrc --target=x86_64 --format=aot -o module.aot module.wasm`
      },
      {
        id: 'build_script_ref',
        title: 'Referencia del Script (.bat)',
        content: 'Contenido del script de automatización optimizado para la estructura Era 7:',
        code: `@echo off\nsetlocal enabledelayedexpansion\necho [OMEGA] Building Plugins...\n\nset \"BASE_DIR=%~dp0\"\nset \"PROJECT_ROOT=%BASE_DIR%..\\\\\"\nset \"MODULE_DIR=%PROJECT_ROOT%modules\"\nset \"CLANG_PATH=%PROJECT_ROOT%toolchain\\\\clang+llvm-22.1.4-x86_64-pc-windows-msvc\\\\bin\"\n\nfor /r \"%MODULE_DIR%\" %%f in (*.cpp) do (\n    set \"TARGET_DIR=%%~dpf\"\n    set \"FILENAME=%%~nf\"\n    echo [OMEGA] Compiling !FILENAME!...\n    \n    \"%CLANG_PATH%\\\\clang++.exe\" --target=wasm32 -O3 -nostdlib \\\\\n    -I\"%PROJECT_ROOT%include\" -fno-exceptions -fno-rtti \\\\\n    -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined \\\\\n    -o \"!TARGET_DIR!!FILENAME!.wasm\" \"%%f\"\n\n    if exist \"!TARGET_DIR!!FILENAME!.wasm\" (\n        echo [SUCCESS] !FILENAME! built.\n        node \"%BASE_DIR%extract_contract.js\" \"!TARGET_DIR!!FILENAME!.wasm\"\n    )\n)\necho [OMEGA] Build Process Finished.`
      },
      {
        id: 'asset_bridge',
        title: 'Asset Bridge (Fase 13)',
        content: 'Permite inyectar recursos visuales externos (PNG, SVG) en el rack.\\\\n• **Protocolo**: Usa `asset://nombre_archivo.png` para referenciar archivos incluidos en el paquete.\\\\n• **Filmstrips**: Para Knobs/Sliders con texturas, el PNG debe contener todos los frames en una tira (vertical u horizontal). El motor calculará el `background-position` automáticamente basado en el valor (0.0 - 1.0) y el número de `frames` declarado.',
        technical_params: ['resources.assets[]', 'frames', 'orientation: v | h']
      }
    ]
  },
  // --- SDK FILES ---
  {
    id: 'sdk_files',
    title: 'Archivos del Starter Kit',
    icon: '📦',
    category: 'developer',
    content: 'Código fuente íntegro para el inicio rápido de nuevos módulos.',
    subsections: [
      {
        id: 'sdk_header',
        title: 'Core Headers (SDK)',
        content: 'Usa las cabeceras estándar de OMEGA para definir el contrato y acceder a constantes:',
        code: `#include <Core/Ace/OmegaContract.h>\n#include <Core/Ace/OmegaConstants.h>\n\n// Macros disponibles:\n// BEGIN_OMEGA_PARAMETERS(id, name)\n// OMEGA_PARAM(id, label, min, max, default, unit)\n// BEGIN_OMEGA_PORTS / OMEGA_PORT(id, label, dir, type)\n// END_OMEGA_PARAMETERS`
      },
      {
        id: 'sdk_cpp',
        title: 'minimal_osc.cpp (Código)',
        content: 'Implementación industrial de un oscilador con el sistema de macros de la Era 7:',
        code: `#include <Core/Ace/OmegaContract.h>\n#include <Core/Ace/OmegaConstants.h>\n#include <math.h>\n\nusing namespace Omega::Constants;\n\n// 1. Definición del Contrato Técnico\nBEGIN_OMEGA_PARAMETERS(\"min_osc\", \"Minimal Oscillator\")\n    OMEGA_FAMILY(\"oscillator\")\n    OMEGA_PARAM(freq, \"Frequency\", 20, 20000, 440, \"Hz\")\n    OMEGA_PARAM(gain, \"Gain\", 0, 1, 0.5, \"amp\")\nEND_OMEGA_PARAMETERS\n\n// 2. Lógica del Plugin\nfloat phase = 0.0f;\nfloat frequency = 440.0f;\nfloat gain = 0.5f;\n\nextern \"C\" {\n    EMSCRIPTEN_KEEPALIVE void omega_on_param(int id, float val) {\n        if (id == 0) frequency = val;\n        if (id == 1) gain = val;\n    }\n\n    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int len) {\n        float phaseDelta = frequency / DEFAULT_SAMPLE_RATE;\n        for (int i=0; i<len; ++i) {\n            // Lógica DSP aquí...\n        }\n    }\n}`
      },
      {
        id: 'sdk_acemm',
        title: 'minimal_osc.acemm (Manifiesto)',
        content: 'Estructura de panel (4HP) para el oscilador de ejemplo:',
        code: `schemaVersion: '7.2.3'\nid: minimal_osc\nmetadata:\n  name: MINIMAL SAW\n  family: oscillator\n  rack: { hp: 4 }\nui:\n  dimensions: { width: 60, height: 420 }\n  skin: industrial\n  layout:\n    containers:\n      - id: MAIN_PANEL\n        label: Engine\n        pos: { x: 0, y: 40 }\n        size: { w: \"full\", h: 200 }\n        variant: panel\n  controls:\n    - id: k_freq\n      bind: freq\n      pos: { x: 30, y: 80 }\n      presentation: { container: MAIN_PANEL, component: knob }\nresources:\n  wasm: minimal_osc.wasm`
      }
    ]
  }
];
