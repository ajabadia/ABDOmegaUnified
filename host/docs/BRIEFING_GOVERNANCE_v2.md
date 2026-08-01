# 📥 Briefing Técnico v2: Gobernanza Agresiva y Bloqueos (Era 7.2.3)

Este documento detalla los requisitos críticos de seguridad y gobernanza para el motor de renderizado de **ABDOmega** tras la actualización a la Era 7.2.3.

## 1. Nuevo Nivel de Severidad: `CRITICAL`
El motor de auditoría (`IndustrialRules`) ha sido endurecido. Ahora existen fallos que devuelven el estado `severity: 'critical'`.

- **Acción Requerida**: Cualquier sistema de empaquetado (.acepack) o exportación en el host DEBE bloquearse si existen issues de severidad `critical`. 
- **Puntuación**: Un error crítico resulta en una puntuación automática de **Score 0 / Certificación Fallida**.

## 2. Verificación Obligatoria de Assets
La portabilidad de activos es ahora una ley del ecosistema.

- **Fallo Crítico**: La ausencia de `module_logo.svg` (o cualquier asset referenciado en el catálogo) disparará el estado `critical`.
- **Hazard Pulse**: Si un asset no es resoluble localmente, el host debe aplicar la clase `.illustration-missing` (proporcionada en `illustration.css`), la cual activará un parpadeo agresivo rojo/negro.

## 3. Soporte para `assetUrl` Directa
El `CellRenderer` ahora soporta rutas directas además de IDs del catálogo.

- **Lógica de Resolución**: El host debe ser capaz de resolver rutas relativas (ej: `./mi_logo.png`) buscando en la raíz del paquete del módulo.
- **Sincronización**: Asegúrate de que `ABDOmega/ui/omega-ui-core/renderers/CellRenderer.ts` esté actualizado con la versión que soporta `directUrl`.

---
**Certificación OMEGA — Era 7.2.3**
