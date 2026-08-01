---
name: react-best-practices
description: Estándar de ingeniería de Vercel (2026) adaptado para ABDSynths.
---

# React & Next.js Best Practices (ABD Standard)

## ⚖️ Leyes de Hierro
1. **GUERRA AL WATERFALL**: Usa `Promise.all()` para fetches independientes.
2. **ZERO BARREL IMPORT**: Importa directamente del archivo fuente.
3. **SECURITY FIRST**: Valida inputs en cada `Server Action`.
4. **COMPONENTES GRANULARES**: Mantén los componentes de UI pequeños y puros.

## 🛠️ Workflow de Optimización
- Usa `next/image` para todos los assets de Stitch.
- Implementa `next/dynamic` para visualizadores pesados (Canvas/SVG).
- Minimiza el uso de `"use client"`.
