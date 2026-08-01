# Skill: Clean Architecture & SOLID
name: clean-architecture-solid
version: 1.0

## 🎯 Objetivo
Garantizar un código profesional, mantenible y escalable basado en principios de arquitectura moderna.

## ⚖️ Leyes de Hierro (Iron Laws)
1. **English-Only Mandate**: Toda la lógica interna (variables, funciones, comentarios técnicos) DEBE estar en inglés.
2. **Single Responsibility**: Una clase, función o componente hace una sola cosa.
3. **Strict Typing**: Uso obligatorio de interfaces de TypeScript y validación de schemas (ej. Zod) para datos externos.
4. **Dependency Inversion**: Depender de abstracciones, no de implementaciones concretas.
5. **Memory Hygiene**: Limpieza rigurosa de estados y efectos al desmontar componentes.

## 🛠️ Workflow
1. **Auditoría Estructural**: Verificar SRP y modularidad.
2. **SOLID Check**: Evaluación de los 5 principios.
3. **Clean Code**: Nombres descriptivos, funciones cortas, eliminación de código muerto.
4. **DRY Check**: Abstracción de utilidades repetidas.

## 📋 Checklist
- [ ] ¿Está el código 100% en inglés técnico?
- [ ] ¿Se han evitado los `any` en la lógica de negocio?
- [ ] ¿Cada función tiene una responsabilidad clara y única?
