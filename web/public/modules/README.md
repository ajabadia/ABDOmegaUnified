# 📦 Estantería de Módulos (ABDOmega Modules)

Esta carpeta contiene todos los módulos individuales del sintetizador OMEGA.

## Estructura de cada Módulo

Cada módulo vive en su propio subdirectorio y se compone de **dos archivos principales**:

```
modules/
├── vco/
│   ├── vco.cpp            # 1. Receta C++ del motor DSP (Sonido)
│   └── vco.acemm          # 2. Manifiesto visual del panel (UI & Bindings)
│
├── vcf/
│   ├── vcf.cpp
│   └── vcf.acemm
│
└── vca/
    ├── vca.cpp
    └── vca.acemm
```

---

## Reglas de Desarrollo

1. **Aislamiento**: El código C++ de un módulo solo depende del SDK base de `/engine/include`.
2. **Rejilla Visual de 5px**: Todos los controles del manifiesto `.acemm` se alinean a múltiplos de 5px.
3. **Contrato de Puertos**:
   * Audio / Pitch: Cyan
   * CV / Modulación: Ámbar
   * Gate / Trigger: Blanco
   * MIDI: Naranja
