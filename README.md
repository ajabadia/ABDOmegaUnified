# OMEGA Unified (Era 8)

Plataforma unificada de síntesis modular basada en un motor C++ agnóstico compilado a WebAssembly (WASM) y una interfaz web única en Next.js.

---

## 🏗️ Arquitectura de 3 Cajas Aisladas

```
ABDOmegaUnified/
├── engine/                # 📦 CAJA 1: MOTOR DSP C++
│   ├── include/           # Cabeceras core (OmegaConstants + macros de contrato ACE)
│   └── bindings/          # Compatibilidad Emscripten (wasm_compat.h)
│
├── modules/               # 📦 CAJA 2: ESTANTERÍA DE MÓDULOS
│   └── <modulo>/          # Carpeta por módulo (código .cpp + manifiesto .acemm)
│
├── web/                   # 📦 CAJA 3: APLICACIÓN WEB (Next.js 16 + React 19)
│   ├── src/app/player/    #   - Sintetizador Modular (ABDOmega Rack)
│   ├── src/app/editor/    #   - Diseñador Visual (ABDOmega Editor)
│   └── src/app/studio/    #   - Laboratorio de Módulos (Cell Studio)
│
└── scripts/               # 🛠️ PIPELINES DE COMPILACIÓN
    └── build_wasm.bat     # Script de compilación C++ -> WASM
```

---

## 🚀 Guía Rápida

1. **Compilar el Motor a WASM**: `.\scripts\build_wasm.bat`
2. **Iniciar la App Web**: `cd web && npm run dev`
3. **Acceso a Rutas**:
   - Player: `http://localhost:3000/player`
   - Editor: `http://localhost:3000/editor`
   - Studio: `http://localhost:3000/studio`
