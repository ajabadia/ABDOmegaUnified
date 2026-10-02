# Cómo medir una recarga real en el navegador (y no perder 40 minutos persiguiendo un fantasma)

Guía operativa para cualquier persona o agente que necesite comprobar **qué sobrevive a un
recargado de página** en este editor. Existe porque durante la Fase de persistencia se
"descubrió" una pérdida de documentos que no existía, y el artefacto del montaje de medición
—no el producto— era el culpable.

---

## La trampa: recargar por la herramienta equivale a perder los datos

Cuando se maneja el navegador desde las herramientas de agente, **no uses la acción de recarga
de la herramienta**. En el panel de vista previa esa acción navega a un contexto de
almacenamiento **recién creado**: la partición del navegador donde vive el estado de la sesión
se descarta y empieza vacía.

El síntoma es indistinguible de un bug real y muy convincente:

1. Escribes tres documentos desde el propio editor.
2. Recargas "la página".
3. El editor arranca con un solo documento y el panel de pestañas muestra uno solo.
4. Conclusión aparente: *la bóveda perdió datos al recargar*.

Y no: la bóveda estaba perfectamente. Lo que se vació fue el sitio desde el que se estaba
midiendo.

### Cómo se detectó el artefacto

Plantando una clave canario que el editor no toca:

```js
localStorage.setItem('__reload_probe__', String(Date.now()))
```

y comparando su valor antes y después de cada estrategia de recarga. Resultado medido: tras la
recarga por la herramienta la clave valía `null` — es decir, el almacenamiento ni siquiera
pertenecía a la misma sesión. Esa comprobación es la que refuta el bug; repítela siempre antes
de informar de una pérdida de datos.

---

## La receta correcta

```js
// preview_evaluate: la recarga ocurre dentro del propio contexto de la página,
// así que la partición de almacenamiento sobrevive.
window.location.reload()
```

Después, lo que hay que mirar, en este orden:

1. **La línea `HYDRATE`.** Log del arranque con la lista de ids recuperados. Si los ids están
   todos, los documentos estaban en la bóveda.
2. **Las pestañas.** Deben coincidir con los ids hidratados, y la activa con la que estaba
   activa antes.
3. **El guard `hydrated`** de `useSessionPersistence`. Devuelve `false` hasta que termina la
   lectura inicial de la bóveda, y mientras tanto **bloquea toda escritura**. Por eso hay una
   ventana en la que un volcado no habría persistido nada: no es pérdida, es orden correcto.

### Medición de referencia (por qué ahora sabemos que no hay bug)

Con una recarga hecha así, 2942 bytes escritos por el propio editor:

- `HYDRATE ids=["primary","r1","r2"]`
- 3 pestañas presentes
- pestaña activa restaurada a la que lo estaba antes
- guard de hidratación activo hasta el final

Los tres documentos sobreviven. La sesión está sana y no hay trabajo pendiente aquí.

---

## Otras trampas de medición parecidas

- **Escribir el estado desde fuera para "ayudar" al editor.** Si siembras la bóveda a mano
  desde `preview_evaluate`, estás probando tu propia siembra, no la persistencia del producto.
  Deja que sea el editor quien escriba.
- **Confundir una sesión vacía con una sesión dañada.** Una clave `null` significa "nunca se
  escribió", no "se perdió". El editor distingue los dos casos y avisa de forma distinta; esa
  distinción es justo lo que un montaje mal construido borra.
- **Probar la persistencia en un perfil distinto del que se usa para escribir.** IndexedDB y
  `localStorage` están particionados por origen y por perfil. El editor es una SPA con
  enrutado por locale: comprobar `http://localhost:3411/es` no dice nada sobre
  `http://localhost:3411/en`.
- **Contar como "tests" una medición manual.** La cobertura permanente de esto es la suite de
  persistencia (`useSessionPersistence` y la sesión perdida extremo a extremo), que sí simula
  la reapertura de bóveda de forma determinista. Manual sirve para confirmar; para evitar
  regresiones, test.

---

## Referencia rápida

| Qué quieres comprobar | Cómo |
| --- | --- |
| Qué sobrevive a un F5 | `preview_evaluate` → `window.location.reload()` |
| Si el almacenamiento es el mismo contexto | clave canario antes/después |
| Qué se rehidrató | línea `HYDRATE` en la consola del arranque |
| Que no se escribe antes de hidratar | guard `vaultRef.current.hydrated` |
| Regresión permanente | suite de jest de `manifest-editor` |

Archivos útiles:
[`useSessionPersistence.ts`](../../src/features/manifest-editor/hooks/orchestrator/useSessionPersistence.ts)
· [`sessionVaultDb.ts`](../../src/features/manifest-editor/utils/sessionVaultDb.ts)
· [`README_E2E.md`](./README_E2E.md)