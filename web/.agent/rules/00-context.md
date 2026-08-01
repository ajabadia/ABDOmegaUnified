---
trigger: always_on
---

# 00-context.md: Visión y Ecosistema de Diseño

Este módulo define la identidad del proyecto y los principios estéticos innegociables para mantener la calidad premium de la marca ABD.

## 🎯 LA VISIÓN "TECH-NOIR"

ABDSynthsWeb no es un e-commerce de software; es una vitrina de ingeniería. El diseño debe evocar la sensación de interactuar con hardware de estudio de alta gama en un entorno digital oscuro y preciso.

### Principios de Diseño:
1. **Precisión Quirúrgica**: Los bordes deben ser nítidos (sharp), los espaciados consistentes y la tipografía clara.
2. **Funcionalidad Visual**: Los elementos visuales (visualizadores, knobs) deben parecer funcionales, incluso si son simulaciones.
3. **Contraste Industrial**: Uso de negros profundos (`#0e0e0f`) con acentos de color eléctrico (`#00f0ff`).

## 🎨 ESTÁNDAR UNCODIXFY (MODIFICADO)

Aplicamos la skill `Uncodixfy` para evitar el "look de IA", pero adaptada al alma de los sintetizadores:

- **Bordes**: Máximo `8px` de radio de curvatura. No a las burbujas.
- **Vidrio (Glass)**: Permitido pero con alto nivel de desenfoque (`blur > 20px`) y opacidad muy baja (`< 5%`). Debe parecer cristal de laboratorio, no plástico.
- **Sombras**: Casi inexistentes o muy sutiles (`spread < 4px`). El contraste se logra con bordes de 1px de color sólido o gradientes de "metal cepillado".
- **Gradientes**: Prohibidos los gradientes suaves de fondo. Permitidos solo en elementos circulares (knobs) imitando texturas metálicas (conic-gradients).

## 🗂️ ESTRUCTURA DE ARCHIVOS

- `src/app`: Rutas y Server Components.
- `src/components/ui`: Componentes atómicos (Boutique Style).
- `src/components/visualizers`: Componentes de visualización técnica (SVG/Canvas).
- `src/lib`: Utilidades y lógica de procesamiento de audio.
- `.brain`: Cerebro del proyecto (Specs, Planes, Logs).

---
**Era 1.0** - Precision Design Rigor
