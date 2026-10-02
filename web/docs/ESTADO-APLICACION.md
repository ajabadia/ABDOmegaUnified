# Estado de la aplicación — 2 de octubre de 2026

Este documento está pensado para alguien que **no**_programa. Explica qué funciona,
qué no, y qué hay que hacer. Nada de aquí requiere leer código para actuar.

---

## 1. Lo que arreglé en esta sesión

Todo lo de esta lista está **arreglado, probado y guardado en el historial de Git**
(8 commits). Antes estaba roto; ahora hay una prueba automática que lo vigila.

### Cosas que mentían y ahora dicen la verdad

| Qué | Antes | Ahora |
|---|---|---|
| Las rutas de la web | Con un tipo de letra mal escrito, casi ninguna página respondía. La web devolvía errores en sitios raros sin dar ninguna pista. | Funciona. Hay 608 casos generados automáticamente que lo comprueban. |
| Los módulos de sonido | Si un módulo no se encontraba, la aplicación decía "este módulo está mal formado". Mentía: el fichero sencillamente no estaba. | Dice el nombre del módulo y el fichero que falta. |
| Botón "Rehacer" | El rótulo decía `Ctrl+Shift+Z`. **Ese atajo no hacía nada.** El bueno es `Ctrl+Y`. | Dice la verdad. |
| Atajos en general | Los atajos se repartían en dos sitios distintos, y parte de la configuración era código que nunca se ejecutaba. | Un solo sitio. |
| Las carpetas que se publican | Cuatro carpetas necesarias eran **enlaces a carpetas de tu disco**, que solo existen en tu ordenador. En un servidor no existen. | Se reconstruyen solas al compilar, en cualquier ordenador. |

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

**Lo primero, y es lo importante: Vercel está publicando OTRO proyecto.**

Tu proyecto en Vercel se llama `abd-omega-editor`, y está conectado al repositorio de
GitHub **`ajabadia/ABDOmegaEditor`**. Pero el proyecto en el que trabajamos se llama
**`ajabadia/ABDOmegaUnified`**. Son dos repositorios **distintos, sin ningún antepasado
común** (lo comprobé: no comparten ni un solo commit).

Traducción: **todo lo que hemos arreglado en estas sesiones no está en lo que Vercel
publica.** Vercel sigue con su copia antigua. Por eso el error que recibiste
("No Next.js version detected") no se arregla cambiando una casilla.

Además, el repositorio que Vercel clona tiene la aplicación **en la raíz**
(`app/`, `src/`, `package.json` directamente), mientras que el nuestro la tiene en la
carpeta `web/`. Son dos copias que fueron separándose.

**Cuál es el bueno:** el nuestro, `ABDOmegaUnified`. Es donde se ha trabajado hoy, y
tiene el motor de audio, los módulos y las herramientas. `ABDOmegaEditor` parece la
versión antigua, que solo ha seguido recibiendo cambios de documentación y de GitHub
Actions.

**Lo que tienes que hacer tú** (no puedo hacerlo yo, es tu cuenta de Vercel):

1. Entra en [vercel.com](https://vercel.com) → proyecto `abd-omega-editor`.
2. Pestaña **Settings** → **Git** → **Disconnect** el repositorio `ABDOmegaEditor`.
3. Pestaña **Settings** → **General** → **Root Directory** → escribe `web` y guarda.
4. Conecta el repositorio `ajabadia/ABDOmegaUnified` y despliega desde `main`.
5. Vuelve a desplegar.

**Aviso importante antes de que lo hagas:** los arreglos de esta sesión están en tu
ordenador, en commits que **todavía no se han subido** a GitHub. Si conectas Vercel
antes de subirlos, Vercel construirá una versión antigua. Subir los commits es una
acción tuya que yo no hago salvo que me lo pidas expresamente.

**Lo que ya está arreglado por mi parte** (esto era el segundo problema de fondo):

Las cuatro carpetas que en tu ordenador son enlaces (`modules`, `fonts`, `host-ui`,
`omega-ui-core`) **ya no son un problema**: ahora hay un paso automático que las
reconstruye con archivos de verdad antes de compilar, en cualquier ordenador. En tu
ordenador no hace nada, porque los enlaces ya funcionan. Está probado con 10
comprobaciones automáticas.

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

1. **Subir a GitHub los cambios que están solo en tu ordenador** (los 8 commits de esta
   sesión y el trabajo de otras sesiones). Hasta que eso no pase, Vercel —y cualquier
   copia nueva del proyecto— sigue viendo una versión antigua. **Es tuyo**: no subo
   nada a GitHub sin que me lo digas.
2. **Investigar el editor de texto que no aparece.** Probablemente esté relacionado con
   la 3.2, y puede ser un fallo real que afecta al uso diario.
3. **Convertir las tres pruebas que no pueden fallar** en pruebas de verdad, o marcarlas
   como "pendiente" con el motivo escrito. Para que nunca más den un falso verde.
4. **Ejecutar las 9 pruebas de navegador que no he ejecutado**, para cerrar el punto flaco
   del punto 2.
5. **Decidir qué hacemos con `ABDOmegaEditor`**, el repositorio antiguo al que apunta
   Vercel. Si nadie lo usa, lo correcto es olvidarlo; si le queda algo útil, hay que
   decidir si se copia algo.

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
  `npx jest middlewareMatcher`. Prueba 608 rutas generadas.- **"Los módulos dicen la verdad cuando faltan"** → en `web`: `npx jest sharedModuleCatalog`.

- **"Las carpetas se reconstruyen solas"** → en la raíz del proyecto:
  `node scripts/prepare_public_assets.mjs --check`. Debe decir `junction` en las cuatro
  (en tu ordenador) y salir con código 0. Las pruebas del script están en
  `node --test scripts/__tests__/prepare_public_assets.test.mjs` (10 en verde).

Si alguno de esos seis falla, este documento está equivocado y quiero saberlo antes que
nadie.