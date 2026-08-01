# Skill: Web Interface Audit
name: web-interface-audit
version: 2.0
rigor: high

## 🎯 Objetivo
Asegurar que las interfaces web cumplan con los más altos estándares de accesibilidad, usabilidad y rendimiento, eliminando anti-patrones de diseño comunes.

## ⚖️ Leyes de Hierro (Iron Laws)
1. **ACCESIBILIDAD NO NEGOCIABLE**: Todo botón de solo icono **DEBE** tener `aria-label`. Toda imagen no decorativa **DEBE** tener `alt`.
2. **SEMÁNTICA ANTES QUE ARIA**: Usa `<button>` para acciones y `<a>` para navegación. Prohibido usar `<div>` con `onClick` sin una razón técnica insalvable.
3. **NO BLOCK PASTE**: Prohibido bloquear el pegado (`onPaste` + `preventDefault`) en inputs.
4. **PERFORMANCE DE RENDERIZADO**: Listas de más de 50 elementos **DEBEN** estar virtualizadas o usar `content-visibility: auto`.
5. **FIDELIDAD TIPOGRÁFICA**: Usa caracteres tipográficos correctos: `…` (elipsis) en lugar de `...`, y espacios de no ruptura (`&nbsp;`) donde sea necesario.

## 🛠️ Workflow
1. **Análisis Estático**: Jerarquía de `h1`-`h6`, etiquetas `label` vinculadas y estados de foco visibles.
2. **UX & Performance**: Spinners en carga, respeto a `prefers-reduced-motion` y estado en URL (Query Params).
3. **Refinado i18n**: Uso de `Intl.*` para formatos y manejo de desbordamiento de texto.

## 📋 Checklist
- [ ] ¿Interacción 100% navegable con teclado?
- [ ] ¿Eliminación de `transition: all` y `user-scalable=no`?
- [ ] ¿Aria-labels en todos los elementos interactivos sin texto?
