# METADATA AUDIT MATRIX (100% ALIGNED - ERA 6.3)

| Grupo | Metadato | Tipo | Core (C++) | Editor (Schema) | Editor (Frontal) | Notas |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Root** | `id` | string | ✅ | ✅ | ✅ | Editable en DNA Identity |
| **Root** | `name` | string | ✅ | ✅ | ✅ | Editable en DNA Identity |
| **Root** | `tags` | list | ✅ | ✅ | ✅ | Editable (CSV) |
| **Root** | `layout.hp` | number | ✅ | ✅ | ✅ | Editable en Layout Hints |
| **Root** | `layout.rack` | enum | ✅ | ✅ | ✅ | Editable (Upper/Lower) |
| **Root** | `version` | string | ✅ | ✅ | ✅ | Editable (Execution Engine) |
| **Registry** | `id` | string | ✅ | ✅ | ✅ | Editable (Technical ID) |
| **Registry** | `label` | string | ✅ | ✅ | ✅ | Editable |
| **Registry** | `front` | bool | ✅ | ✅ | ✅ | Toggle **FRONT** (Cian) |
| **Registry** | `back` | bool | ✅ | ✅ | ✅ | Toggle **BACK** (Ámbar) |
| **Registry** | `unit` | string | ✅ | ✅ | ✅ | Editable en Contract |
| **Registry** | `precision` | number | ✅ | ✅ | ✅ | Editable (DSP Precision) |
| **Registry** | `ui_precision` | number | ✅ | ✅ | ✅ | Editable (UI Precision) |
| **Registry** | `roles` | list | ✅ | ✅ | ✅ | Editable (Role Pills) |
| **Presentation**| `tab` | enum | ✅ | ✅ | ✅ | Editable (Visibility Tab) |
| **Presentation**| `group` | string | ✅ | ✅ | ✅ | **CLOSED GAP**: Editable |
| **Presentation**| `order` | int | ✅ | ✅ | ✅ | **CLOSED GAP**: Editable |
| **Presentation**| `cell` | string | ✅ | ✅ | ✅ | **CLOSED GAP**: Physical Binding |
| **Presentation**| `ui.component`| enum | ✅ | ✅ | ✅ | Editable (SVG Mapping) |
| **Presentation**| `ui.variant` | string | ✅ | ✅ | ✅ | Editable |
| **Presentation**| `ui.size` | enum | ✅ | ✅ | ✅ | Editable |
| **Attachments** | `type` | enum | ✅ | ✅ | ✅ | Editable |
| **Attachments** | `position` | enum | ✅ | ✅ | ✅ | Editable |
| **Attachments** | `color` | hex/str | ✅ | ✅ | ✅ | Editable |
| **Attachments** | `bind` | string | ✅ | ✅ | ✅ | Editable |

---
**Certificación de Alineamiento**: 14 de Abril, 2026.
Toda la cadena de transmisión de metadatos (Motor ⇄ Schema ⇄ UI) está sincronizada al 100%.
