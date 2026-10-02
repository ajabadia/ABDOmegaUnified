# Estado de la aplicación — 2 de octubre de 2026

Este documento está pensado para alguien que **no**_programa. Explica qué funciona,
qué no, y qué hay que hacer. Nada de aquí requiere leer código para actuar.

---

## 1. Lo que arreglé en esta sesión

Todo lo de esta lista está **arreglado, probado y guardado en el historial de Git**
(6 commits). Antes estaba roto; ahora hay una prueba automática que lo vigila.

### Cosas que mentían y ahora dicen la verdad

| Qué | Antes | Ahora |
|---|---|---|
| Las rutas de la web | Con un tipo de letra mal escrito, casi ninguna página respondía. La web devolvía errores en sitios raros sin dar ninguna pista. | Funciona. Hay 608 casos generados automáticamente que lo comprueban. |
| Los módulos de sonido | Si un módulo no se encontraba, la aplicación decía "este módulo está mal formado". Mentía: el fichero sencillamente no estaba. | Dice el nombre del módulo y el fichero que falta. |
| Botón "Rehacer" | El rótulo decía `Ctrl+Shift+Z`. **Ese atajo no hacía nada.** El bueno es `Ctrl+Y`. | Dice la verdad. |
| Atajos en general | Los atajos se repartían en dos sitios distintos, y parte de la configuración era código que nunca se ejecutaba. | Un solo sitio. |

### Cosas que estaban en rojo sin que nadie lo supiera

- **20 pruebas automáticas de la web estaban fallando** desde hacía tiempo. El motivo no era
  que las funciones estuvieran rotas: las pruebas estaban mirando la página equivocada.
  Arreglado: **ahora pasan**.
- **La aplicación no se podía construir para internet.** Un fichero a medio hacer
  bloqueaba la compilación entera. Arreglado.

---

## 2. Cómo está el proyecto ahora

| Comprobación | Resultado |
|---|---|
| Pruebas automáticas (1640 en total) | **Todas pasan** |
| Tipos y compilación | **Correcto** |
| Compilación para producción | **Correcta** |
| Pruebas en navegador real | Las que he ejecutado, pasan |

Sobre esas últimas: he ejecutado **6 de las 15 pruebas de navegador**. Las otras 9 las
he tocado o revisado **sin llegar a ejecutarlas todas**. Es el punto flaco que
conozco con certeza.

---

## 3. Lo que está roto y NO he arreglado

Lo digo claro porque prefiero que lo sepas.

### 3.1 La publicación en internet (Vercel) — lo más urgente

La web **no se publica**. Vercel pide un ajuste de una casilla y, además, hay una razón
de fondo que un ajuste no arregla:

Cuatro carpetas que la aplicación necesita (`modules`, `fonts`, `host-ui`, `omega-ui-core`)
están en tu ordenador como **enlaces a carpetas de Windows**, no como archivos de verdad.
Esos enlaces solo existen en tu máquina. En cualquier otro ordenador —y en el servidor de
Vercel— **no existen**.

Consecuencia: la aplicación se abriría, pero **sin ningún módulo de sonido**, sin las
tipografías y sin el reproductor.

**Lo que tienes que hacer tú** (son 2 clics, no puedo hacerlo yo):

1. Entra en [vercel.com](https://vercel.com) → proyecto `abd-omega-editor`.
2. Pestaña **Settings** → **General** → campo **Root Directory** → escribe `web` y guarda.
3. Vuelve a desplegar.

Eso quita el error que recibiste. Pero **no** quita el problema de las carpetas.

**Para el problema de las carpetas hay dos caminos**, y el segundo es el que recomiendo:

- **Copiar** los archivos de verdad al repositorio. Simple, pero el repositorio crece
  mucho y estas carpetas se duplicarían en varios sitios.
- **Pegar un paso automático de compilación** que copie esas carpetas antes de compilar.
  Es lo que recomiendo: mantiene el repositorio ligero y funciona en cualquier
  ordenador. **Puedo hacerlo yo**, es mi trabajo, no tuyo.

### 3.2 Tres pruebas que "pasan" sin comprobar nada

Hay tres pruebas que dan verde aunque la función esté rota. Cuando no encuentran lo que
buscan, anotan un mensaje en vez de fallar.

Investigué la más importante y **no la terminé**. Lo que averigüé:

- El indicador de "cambios sin guardar" **nunca aparece**, ni tras 12 segundos.
- Pero la sonda no pudo ni escribir en el editor de texto para probarlo de verdad.
- El editor de texto **no aparece** al cambiar a la vista de código. Sospecho (sin
  confirmarlo) que se descarga desde internet y aquí no está disponible.

Es decir: **o hay un fallo real, o las pruebas miran donde no deben.** No lo sé todavía.
Es lo primero que debería atacar, porque un test que no puede fallar es peor que no
tener test.

### 3.3 Tres pruebas en rojo en la barra de herramientas

Fallan al pedir que aparezcan cosas en un módulo vacío. **Ya no son un error de
navegación** (eso lo arreglé), ahora son comportamiento real sin investigar.

### 3.4 Una prueba en rojo en el rack

Verifiqué que **ya fallaba antes de mis cambios**. No lo caused yo, y lo dejo dicho para
que no se me atribuya.

---

## 4. Trabajo de otras sesiones que sigue sin guardarse

Hay **66 ficheros** modificados que pertenecen a otras sesiones de trabajo (el
motor de audio, el historial, el guardado de sesión, el reproductor). **No los he
guardado** porque no son míos y no quiero mezclar trabajo a medio terminar.

Consecuencia práctica: **una copia nueva del proyecto, descargada de internet, no
tendría todo lo que tiene tu ordenador ahora mismo.** Si pierdes el disco, pierdes eso.

---

## 5. Lo que propongo hacer ahora, por orden

1. **El paso automático de compilación** para las carpetas que faltan. Es lo que
   desbloquea publicar en internet. Es mío, no tuyo.
2. **Investigar el editor de texto que no aparece.** Probablemente esté relacionado con
   la 3.2, y puede ser un fallo real que afecta al uso diario.
3. **Convertir las tres pruebas que no pueden fallar** en pruebas de verdad, o marcarlas
   como "pendiente" con el motivo escrito. Para que nunca más den un falso verde.
4. **Ejecutar las 9 pruebas de navegador que no he ejecutado**, para cerrar el punto flaco
   del punto 2.

---

## 6. Una nota sobre cómo trabajo

En esta sesión **tres veces estuve a punto de comunicarte un problema que no existía**:
un fallo de Next.js que no era de Next.js, un módulo que sí se importaba, y un atajo
 equivocado que era un error mío al leer la lista.

En los tres casos lo detectó medir en vez de suponer. Por eso este documento distingue
siempre entre **"comprobado"** y **"sospechado"**. Si en algún punto de este documento
leo "sospecho", es porque no lo he verificado, y no quiero que lo tomes por otra cosa.

## 7. Cómo puedes comprobar que esto es cierto

No hace falta que te fíes de mí. Cada afirmación comprobada tiene una forma de
revisarla:

- **"Todas las pruebas pasan"** → en la carpeta `web`, ejecutar:
  `npx jest src/lib src/features/manifest-editor src/services/history.test.ts src/omega-ui-core`
 Debe salir `80 passed`.

- **"Compila bien"** → en `web`: `npx next build`. Debe terminar sin errores.

- **"Los atajos no mienten"** → en `web`:
  `npx jest menuShortcutHints footerShortcutHints`. Aquí se comprueba, atajo por atajo,
  que lo que la interfaz anuncia es lo que hace.

- **"Las rutas web no se rompen en silencio"** → en `web`:
  `npx jest middlewareMatcher`. Prueba 608 rutas generadas.

- **"Los módulos dicen la verdad cuando faltan"** → en `web`:
  `npx jest sharedModuleCatalog`.

Si alguno de esos cinco falla, este documento está equivocado y quiero saberlo antes que
nadie.