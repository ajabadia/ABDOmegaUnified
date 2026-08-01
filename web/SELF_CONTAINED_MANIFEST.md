# Self-Contained Manifest — Modelo Definitivo

> **Fecha:** 2026-06-12
> **Estado:** ✅ Completado e Implementado
> **Filosofía:** El manifiesto debe ser 100% autocontenido. Omega (sintetizador C++/JUCE) no tiene skins, temas, CSS ni `ColorResolver.ts`. Todos los parámetros visuales que necesita un elemento deben estar explícitamente definidos dentro del manifiesto.

---

## 1. Filosofía General

- **Sin skins ni temas en el sintetizador.** El concepto de "skin" (`industrial`, `carbon`, `glass`, `minimal`) existe solo en el editor como ayuda visual transitoria para arrancar un proyecto.
- **Colores globales por token.** Todos los colores se definen en una paleta central (`manifest.ui.palette`). Los elementos no guardan hexes — referencian tokens por nombre.
- **Estilos por tipo de componente.** Cada tipo de componente (`knob`, `slider`, `led`, `port`, `switch`, `button`, `display`, `label`, `container`, `rack`) tiene su propia sección de estilos en `manifest.ui.styles`.
- **Variantes.** Un componente elige una variante (`"default"`, `"warning"`, `"accent"`). La variante define qué token de la paleta usar para cada propiedad visual.
- **Tamaños también por token (ui.sizes).** Los tamaños de componentes ("A", "B", "C") se definen en `ui.sizes`, paralelo a `ui.palette`. Así un componente dice `"size": "A"` y el lector busca `ui.sizes["A"] = 24` para obtener el valor en píxeles.
- **Libertad organizada, no absoluta.** No puedes poner un hex arbitrario en un nodo — eliges una variante de las definidas globalmente. Pero puedes crear las variantes que necesites.

---

## 2. Estructura del Manifiesto

### 2.1 Paleta de Colores (`manifest.ui.palette`)

```json
{
  "ui": {
    "palette": {
      "primary": "#00f2ff",
      "secondary": "#ff8c00",
      "utility": "#a0a0a0",
      "feedback": "#32cd32",
      "hardware": "#777777",
      "chassis": "#1a1a1a",
      "glow": "#00f2ff",
      "glass": "rgba(255,255,255,0.05)",
      "warning": "#ff3300",
      "highlight": "#ffffff",
      "surface": "#1a1c1e",
      "text": "#ffffff",
      "weak": "#555555"
    }
  }
}
```

**Regla:** La paleta es el único lugar donde se escriben valores hex/rgba. En ningún otro sitio del manifiesto hay colores literales (excepto assets de imagen, que no son colores funcionales).

### 2.2 Paleta de Tamaños (`manifest.ui.sizes`)

```json
{
  "ui": {
    "sizes": {
      "A": 24,
      "B": 36,
      "C": 48,
      "D": 64
    }
  }
}
```

**Regla:** Los tamaños por letra (`"size": "A"`) se resuelven contra `ui.sizes`, de forma análoga a como los colores se resuelven contra `ui.palette`. Esto mantiene el manifiesto 100% autocontenido — Omega no necesita saber que "A" significa 24px.

### 2.3 Estilos por Componente (`manifest.ui.styles`)

```json
{
  "ui": {
    "palette": { "...": "..." },
    "styles": {
      "knob": [
        {
          "id": "default",
          "label": "Standard",
          "aesthetics": {
            "color": "primary",
            "indicatorColor": "primary",
            "font": "Inter",
            "fontSize": 9,
            "opacity": 1.0,
            "rounding": 0
          }
        },
        {
          "id": "warning",
          "label": "Warning",
          "aesthetics": {
            "color": "warning",
            "indicatorColor": "warning",
            "font": "Inter",
            "fontSize": 9,
            "opacity": 1.0
          }
        }
      ],
      "slider": [
        {
          "id": "default",
          "aesthetics": {
            "color": "secondary",
            "indicatorColor": "secondary",
            "opacity": 1.0
          }
        }
      ],
      "port": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary",
            "size": "A"
          }
        }
      ],
      "led": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary",
            "size": "A"
          }
        }
      ],
      "switch": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary",
            "indicatorColor": "primary"
          }
        }
      ],
      "button": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary"
          }
        }
      ],
      "display": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary",
            "glassColor": "glass",
            "font": "Inter",
            "fontSize": 10
          }
        }
      ],
      "label": [
        {
          "id": "default",
          "aesthetics": {
            "font": "Inter",
            "fontSize": 9,
            "fontColor": "text"
          }
        }
      ],
      "container": [
        {
          "id": "default",
          "aesthetics": {
            "color": "chassis",
            "indicatorColor": "primary",
            "rounding": 4,
            "borderWidth": 1,
            "opacity": 1.0,
            "font": "Inter",
            "fontSize": 10,
            "fontColor": "text"
          }
        }
      ],
      "rack": [
        {
          "id": "default",
          "aesthetics": {
            "color": "chassis",
            "rounding": 0,
            "borderWidth": 0
          }
        }
      ]
    }
  }
}
```

**Reglas:**
- Los valores en `aesthetics` usan **nombres de tokens de la paleta** (ej: `"primary"`, `"chassis"`), no hexes.
- Solo se incluyen los tipos de componente que realmente existen en el árbol. Si no hay sliders, no se incluye `"slider"`.
- Un componente puede tener múltiples variantes (`"default"`, `"warning"`, `"accent"`, etc.)

### 2.4 Nodo con Variante (sin style explícito)

```json
{
  "id": "cutoff_knob",
  "kind": "cell",
  "cellRef": "knob",
  "bind": "cutoff",
  "layout": { "pos": { "x": 10, "y": 10 }, "size": { "width": 60, "height": 60 } },
  "style": {
    "variant": "default"
  }
}
```

**Regla:** Si el nodo omite `style`, se asume `variant: "default"` para su tipo.

### 2.5 Nodo con Variante Diferente (solo desviación)

```json
{
  "id": "resonance_knob",
  "kind": "cell",
  "cellRef": "knob",
  "bind": "resonance",
  "layout": { "pos": { "x": 80, "y": 10 }, "size": { "width": 60, "height": 60 } },
  "style": {
    "variant": "warning"
  }
}
```

---

## 3. Cadena de Resolución (Render Time)

Cuando el renderer necesita un valor visual para un nodo:

```
1. ¿Nodo tiene style.variant?
   │
   ├── Sí → buscar en manifest.ui.styles[cellRef][variant].aesthetics[prop]
   │
   └── No → usar manifest.ui.styles[cellRef]["default"].aesthetics[prop]
            |
            └── Si no existe "default" → siguiente nivel
                         
2. ¿El valor contiene un token de color (ej: "primary")?
   │
   ├── Sí → resolver contra manifest.ui.palette[token]
   │        └── Si el token no existe en palette → fallback
   │
   └── No (es hex directo) → usarlo tal cual

3. Fallback: OMEGA_THEMES[skin]
   Si el editor está en un skin concreto y el manifiesto no tiene el estilo,
   usar el valor del tema seleccionado (solo en edición, nunca se escribe)

4. Fallback final: ColorResolver.defaults (hardcodeados en JS)
   Solo para compatibilidad con manifiestos legacy
```

**Importante:** Los niveles 3 y 4 solo existen durante la **edición**. Al guardar en modo "definitivo", todo se aplana a los niveles 1 y 2.

---

## 4. Assets e Imágenes

### 4.1 Assets Globales y Deduplicados

Los assets (imágenes de fondo, filmstrips, SVG) se guardan en `resources.assets[]`:

```json
{
  "resources": {
    "assets": [
      { "id": "sha256_abc123...", "url": "asset://bg_texture.png", "type": "image" },
      { "id": "sha256_def456...", "url": "asset://knob_strip.png", "type": "filmstrip", "frames": 64, "orientation": "v" }
    ]
  }
}
```

**Regla de deduplicación:** Al inyectar un blueprint o importar un asset:
1. **El hash SHA-256 se calcula en el momento de importar el asset al Editor**, no al guardar. Se almacena como `id` del asset (o en un campo `digest`).
2. Al guardar/exportar/inyectar, la deduplicación es una comparación síncrona de strings (los hashes ya están calculados).
3. Buscar en `resources.assets[]` si existe un asset con ese hash.
4. Si existe → reutilizar. El nodo referenciará el ID existente.
5. Si no existe → añadir.

**Estructura del asset:**
- `id`: SHA-256 del contenido binario (para dedup)
- `url`: Ruta relativa o `asset://` URI (para compatibilidad en disco)
- `type`: `"image"`, `"filmstrip"`, `"svg"`
- `frames`, `orientation`: Solo para filmstrips

### 4.2 Blueprint y Assets

Cuando se exporta un blueprint, este debe incluir SOLO los assets que sus nodos usan. Al inyectar, se fusionan con `resources.assets[]` del destino deduplicando por hash.

---

## 5. Blueprints

### 5.1 Estructura de Blueprint

Un blueprint elige **variantes**, no define colores. Pero puede traer sus propias variantes si las necesita.

```json
{
  "blueprintId": "my_custom_vcf",
  "version": "1.0.0",
  "name": "Custom VCF",
  "origin": "user",
  "ui": {
    "styles": {
      "knob": [
        { "id": "default", "aesthetics": { "color": "primary", "indicatorColor": "primary" } }
      ],
      "port": [
        { "id": "default", "aesthetics": { "color": "primary" } }
      ]
    }
  },
  "rootNode": {
    "id": "vcf_root",
    "kind": "container",
    "children": [
      { "id": "freq", "kind": "cell", "cellRef": "knob", "bind": "freq" },
      { "id": "res", "kind": "cell", "cellRef": "knob", "bind": "res", "style": { "variant": "warning" } }
    ]
  }
}
```

### 5.2 Reglas de Fusión al Inyectar

Al inyectar un blueprint en un manifiesto:

1. **Estilos**: Para cada entrada en `blueprint.ui.styles[type]`:
   - Si el manifiesto destino ya tiene una variante con el mismo **id** y los mismos **valores de aesthetics** → no se añade, se reusa
   - Si el manifiesto destino tiene una variante con el mismo **id** pero diferentes valores → la variante del blueprint se renombra (ej: `"default"` → `"default_imported"`) y se añade
   - Si el manifiesto destino no tiene esa variante → se añade tal cual

2. **Assets**: Se fusionan deduplicando por hash (ver sección 4.1)

3. **Nodos**: Se insertan en el árbol con regeneración de IDs.
4. **Re-escritura de variantes renombradas**: Si una variante colisionó y fue renombrada (ej: `"default"` → `"default_imported"`), se debe hacer una **travesía recursiva de todos los nodos del blueprint** para reescribir `node.style.variant` de aquellos que apuntaban a la variante renombrada. No basta con cambiar el objeto de estilo — hay que actualizar las referencias en los nodos.

### 5.3 Blueprint Autocontenido

Un blueprint guardado a disco debe incluir:
- Su propia sección `ui.styles` con las variantes que necesita
- Sus propios assets (deduplicables por hash)
- Suficiente información para renderizarse sin el manifiesto padre

---

## 6. Modos de Guardado

### 6.1 Modo Trabajo (Save)

- Guarda TODO: árbol completo, estilos definidos, assets, historial, guías
- No poda, no contrae, no pregunta
- Destinado a edición diaria y sesiones de trabajo
- Rápido, sin procesamiento adicional

### 6.2 Modo Definitivo (Export / Distill)

Pipeline de transformación al guardar:

```
1. INSPECCIONAR ÁRBOL
   Recorrer todos los nodos → recolectar:
   - cellRefs usados (knob, slider, led, port...)
   - variants referenciadas (default, warning...)
   - asset IDs referenciados

2. PODAR manifest.ui.styles
   Eliminar:
   - Tipos de componente no usados (si no hay sliders, quitar "slider")
   - Variantes no referenciadas por ningún nodo

3. CONTRACCIÓN DE NODOS
   Para cada nodo:
   - Si style.variant es "default" (o no tiene style):
     → Quitar style del nodo (ahorra espacio, la herencia lo resuelve)
   - Si style.variant NO es "default":
     → Mantener style.variant
  
4. **(NO) APLANAR TOKENS → HEX — DECISIÓN: MANTENER TOKENS**
   Los tokens NO se aplanan a hex. La paleta `manifest.ui.palette` forma parte
   del manifiesto, por lo que mantener tokens es 100% autocontenido:
   - Menos bytes ("primary" vs "#00f2ff")
   - Semántica preservada (sabes qué significa cada color)
   - Si Omega implementa lookup en palette[token], funciona sin depender
     de nada externo al manifiesto
   
   Los únicos valores que SÍ se aplanan son los que vienen de niveles
   externos (OMEGA_THEMES o ColorResolver.defaults) — esos se convierten
   a sus valores concretos porque son dependencias externas al manifiesto.

5. DEDUPLICAR ASSETS
   - Si dos assets tienen el mismo contenido (hash), fusionarlos
   - Reasignar referencias al asset que se conserva

6. PREGUNTAR AL USUARIO (opcional)
   - "Se encontraron N variantes de estilo no referenciadas. ¿Eliminarlas?"
   - "Se encontraron M assets no utilizados. ¿Eliminarlos?"
   - "Se eliminaron D assets duplicados."

7. GUARDAR
```

---

## 7. Integración con el Editor

### 7.1 Al Seleccionar un Tema (Skin)

Cuando el usuario selecciona `industrial`, `carbon`, `glass` o `minimal` en el editor:

1. El editor toma los valores de `OMEGA_THEMES[skin]` (que están en `src/constants/manifest-editor/themes.ts`)
2. **No copia todo** — solo marca el skin como activo para la sesión de edición
3. Los renderers usan `OMEGA_THEMES[skin]` como fallback para los niveles 3-4 de la cadena de resolución
4. Si el usuario modifica algún color en `ThemePaletteGovernance`, se escribe en `manifest.ui.palette`
5. Si el usuario crea/modifica variantes en el "Elements Library" (`ModuleStyleLibrary`), se escribe en `manifest.ui.styles`
6. Al guardar en modo trabajo, `manifest.ui.skin` se conserva como metadato (no funcional para Omega)
7. Al guardar en modo definitivo, `manifest.ui.skin` se elimina (Omega no lo necesita)

### 7.2 Al Cargar un Manifiesto Legacy

Si un manifiesto cargado NO tiene `manifest.ui.styles` ni `manifest.ui.palette`:

1. Se detecta como manifiesto legacy
2. Se aplican defaults del skin activo en el editor
3. **Migración automática en memoria**: El Editor ejecuta un migrador que **popula inmediatamente** `ui.palette`, `ui.sizes` y `ui.styles` con los valores del tema activo (`OMEGA_THEMES[skin]`). Así, el resto de la aplicación (renderers, inspectores) solo consume el formato moderno, eliminando por completo las ramas condicionales legacy en la UI.
4. No se escribe nada en el archivo original — la migración es solo en memoria. El usuario debe guardar explícitamente (modo trabajo o definitivo) para persistir el nuevo formato.
5. El usuario puede "fosilizar" explícitamente: botón "Convertir a nuevo formato" que persiste `ui.styles`, `ui.sizes` y `ui.palette` a partir de los valores actuales.

---

## 8. Auditoría del Código Actual

> **Auditoría completa disponible en:** [`docs/leak_audit_results.md`](docs/leak_audit_results.md)
> **5 categorías de fugas identificadas:** F1 (ColorResolver.defaults), F2 (isCustom Gate), F3 (RADIUS_MAP + CSS sizes), F4 (CSS color classes), F5 (TypographyInheritance)

### 8.1 Lo que YA EXISTE (y hay que mantener)

| Componente | Archivo | Estado |
|---|---|---|
| `manifest.ui.palette` | Tipo `OMEGA_Manifest` | ✅ Existe |
| `manifest.ui.colors` | Tipo `OMEGA_Manifest` | ✅ Existe |
| `ThemePaletteGovernance` | `.../aesthetic/governance/ThemePaletteGovernance.tsx` | ✅ 10 color pickers funcionales |
| `useDesignTokens.resolveColor` | `.../hooks/useDesignTokens.ts` | ✅ Resuelve token → hex desde palette/colors |
| `CustomSkinSection` | `.../sections/CustomSkinSection.tsx` | ✅ UI con pestañas Globals + Elements Library |
| `ModuleStyleLibrary` | `.../aesthetic/styles/ModuleStyleLibrary.tsx` | ✅ Editor de estilos por elemento |
| `OMEGA_THEMES` | `src/constants/manifest-editor/themes.ts` | ✅ 4 temas con valores de color/lighting/typography |
| `manifest.ui.styles` | Tipo `OMEGA_Manifest` | ✅ Tipo existe pero infrautilizado |
| `ColorResolver.resolve()` | `src/omega-ui-core/utils/ColorResolver.ts` | ✅ Resuelve tokens con fallback a defaults |

### 8.2 Lo que hay que CREAR o MODIFICAR (Estado: ✅ Todos Completados)

| Componente | Acción | Estado |
|---|---|---|
| **ColorResolver.defaults** | **Deprecar gradualmente**: eliminar los 13 defaults y dejar local fallbacks de seguridad. | ✅ Completado |
| **CellRenderer COMP_RENDERER_MAP** | Extender el patrón `genetics` (estilo global) a todos los tipos: knob, slider, led, port, etc. | ✅ Completado |
| **Resolvedor de 3 niveles** | Implementar función `resolveNodeStyle(node, manifest)` que siga la cadena de resolución | ✅ Completado |
| **Expansión en carga** | Al cargar un manifiesto, expandir estilos en cada nodo | ✅ Completado |
| **Contracción al guardar** | Al guardar, contraer nodos que usan la variante default | ✅ Completado |
| **Poda de estilos no usados** | En modo definitivo, eliminar estilos de tipos no presentes en el árbol | ✅ Completado |
| **Aplanar fallbacks legacy** | En modo definitivo, resolver a hex solo los valores legacy. Mantener tokens de palette. | ✅ Completado |
| **Deduplicación de assets por hash** | SHA-256 de contenido; fusión al inyectar blueprints | ✅ Completado |
| **Fusión de estilos de blueprint** | Al inyectar, detectar colisiones y renombrar/ fusionar variantes | ✅ Completado |
| **Gate `isCustom` en CellRenderer** | Eliminar el gate; la resolución de colores debe ocurrir siempre | ✅ Completado |
| **Dos modos de guardado** | UI para elegir "Trabajo" vs "Definitivo" al exportar | ✅ Completado |
| **Preguntas al usuario al destilar** | Diálogo de confirmación antes de borrar estilos/assets no referenciados | ✅ Completado |

---

## 9. Ejemplo Completo

### 9.1 Manifiesto en Edición (modo trabajo)

```json
{
  "schemaVersion": "7.2",
  "metadata": {
    "name": "My Filter",
    "version": "1.0.0",
    "family": "filter"
  },
  "ui": {
    "skin": "industrial",
    "palette": {
      "primary": "#00f2ff",
      "warning": "#ff3300"
    },
    "styles": {
      "knob": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary",
            "indicatorColor": "primary",
            "fontSize": 9
          }
        },
        {
          "id": "warning",
          "aesthetics": {
            "color": "warning",
            "indicatorColor": "warning",
            "fontSize": 9
          }
        }
      ],
      "port": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary"
          }
        }
      ]
    }
  },
  "tree": {
    "id": "rack_root",
    "kind": "container",
    "children": [
      {
        "id": "cutoff",
        "kind": "cell",
        "cellRef": "knob",
        "bind": "cutoff",
        "layout": { "pos": { "x": 10, "y": 10 }, "size": { "width": 60, "height": 60 } },
        "style": { "variant": "default" }
      },
      {
        "id": "resonance",
        "kind": "cell",
        "cellRef": "knob",
        "bind": "resonance",
        "layout": { "pos": { "x": 80, "y": 10 }, "size": { "width": 60, "height": 60 } },
        "style": { "variant": "warning" }
      },
      {
        "id": "input_port",
        "kind": "cell",
        "cellRef": "port",
        "bind": "audio_in",
        "layout": { "pos": { "x": 0, "y": 80 }, "size": { "width": 30, "height": 30 } }
      }
    ]
  }
}
```

### 9.2 Manifiesto Definitivo (exportado, destilado)

```json
{
  "schemaVersion": "7.2",
  "metadata": {
    "name": "My Filter",
    "version": "1.0.0",
    "family": "filter"
  },
  "ui": {
    "palette": {
      "primary": "#00f2ff",
      "warning": "#ff3300"
    },
    "styles": {
      "knob": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary",
            "indicatorColor": "primary",
            "fontSize": 9
          }
        },
        {
          "id": "warning",
          "aesthetics": {
            "color": "warning",
            "indicatorColor": "warning",
            "fontSize": 9
          }
        }
      ],
      "port": [
        {
          "id": "default",
          "aesthetics": {
            "color": "primary"
          }
        }
      ]
    }
  },
  "tree": {
    "id": "rack_root",
    "kind": "container",
    "children": [
      {
        "id": "cutoff",
        "kind": "cell",
        "cellRef": "knob",
        "bind": "cutoff",
        "layout": { "pos": { "x": 10, "y": 10 }, "size": { "width": 60, "height": 60 } }
      },
      {
        "id": "resonance",
        "kind": "cell",
        "cellRef": "knob",
        "bind": "resonance",
        "layout": { "pos": { "x": 80, "y": 10 }, "size": { "width": 60, "height": 60 } },
        "style": { "variant": "warning" }
      },
      {
        "id": "input_port",
        "kind": "cell",
        "cellRef": "port",
        "bind": "audio_in",
        "layout": { "pos": { "x": 0, "y": 80 }, "size": { "width": 30, "height": 30 } }
      }
    ]
  }
}
```

**Diferencias con el modo trabajo:**
- `ui.skin` eliminado (Omega no lo necesita)
- `cutoff` no tiene `style` (hereda `default` de `styles.knob`)
- No hay slider styles (no hay sliders en el árbol)
- No hay assets (no hay assets en este ejemplo)

---

## 10. Elementos No Cubiertos (Futuras Extensiones)

### 10.1 Lighting y Typography Globales

`manifest.ui.lighting` y `manifest.ui.typography` ya existen como tipos pero no se ha definido su lugar exacto en el modelo autocontenido. Son parámetros globales del módulo (no por componente). Propuesta para más adelante:

- **Lighting** (`shadowAngle`, `shadowColor`, `ambientIntensity`, `specularIntensity`, `globalBlur`): Global del módulo, en `manifest.ui.lighting`
- **Typography** (`defaultFont`, `definitions[]`): Global del módulo, en `manifest.ui.typography`
- Ambos se incluirían en el modo definitivo si existen, se podarían si no

### 10.2 Tamaños por Letra ("size": "A")

**Resuelto por `manifest.ui.sizes`.** Los tamaños por letra (`"size": "A"`) se resuelven contra `ui.sizes` (ver sección 2.2), de forma análoga a como los colores se resuelven contra `ui.palette`. Esto mantiene el manifiesto autocontenido sin que C++ necesite constantes predefinidas.

---

## 11. Preguntas Abiertas / Decisiones Pendientes

### Decisiones Tomadas

1. **Límite máximo de elementos**: Soft-limit de **256 elementos** por módulo/rack. Previene problemas de memoria al parsear JSON tanto en JS como en C++, y garantiza que la interfaz mantenga un diseño ergonómico.
2. **Nombrado automático de variantes importadas**: Prefijo de procedencia (ej: `"default_from_vcf"`, `"accent_imported_env"`). Evita números planos como `default_1` que dificultan saber de dónde vino el estilo.
3. **Asset dedup**: Usar SHA-256 como `id` del asset (para deduplicación binaria) + campo `url` para la ruta relativa en disco. Al importar un blueprint, solo se importan binarios si sus hashes no existen ya.

### Pendiente de Decidir

4. **`resources.styles` legacy**: El tipo `OMEGA_Manifest` tiene estilos en dos sitios (`resources.styles` legacy y `ui.styles` moderno). Pendiente decidir si eliminar `resources.styles` del tipado para evitar confusión.

---

*OMEGA — Engineering Standard v9.2.0-dev — Self-Contained Manifest Design — 2026-06-11*
