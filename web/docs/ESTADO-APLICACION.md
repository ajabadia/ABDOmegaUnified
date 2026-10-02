# Estado de la aplicación — 2 de octubre de 2026

Este documento está pensado para alguien que **no** programa. Explica qué funciona,
qué no, y qué hay que hacer. Nada de aquí requiere leer código para actuar.

---

## 1. Lo que arreglé

Todo lo de esta lista está **arreglado, probado y guardado en el historial de Git**
(11 commits). No está subido a internet todavía; ver el punto 5.1.

### Cosas que mentían y ahora dicen la verdad

| Qué | Antes | Ahora |
|---|---|---|
| Las rutas de la web | Con un tipo de letra mal escrito, casi ninguna página respondía. La web devolvía errores en sitios raros sin dar ninguna pista. | Funciona. Hay 608 casos generados automáticamente que lo comprueban. |
| Los módulos de sonido | Si un módulo no se encontraba, la aplicación decía "este módulo está mal formado". Mentía: el fichero sencillamente no estaba. | Dice el nombre del módulo y el fichero que falta. |
| Botón "Rehacer" | El rótulo decía `Ctrl+Shift+Z`. **Ese atajo no hacía nada.** El bueno es `Ctrl+Y`. | Dice la verdad. |
| Atajos en general | Los atajos se repartían en dos sitios distintos, y parte de la configuración era código que nunca se ejecutaba. | Un solo sitio. |
| Las carpetas que se publican | Cuatro carpetas necesarias eran **enlaces a carpetas de tu disco**, que solo existen en tu ordenador. En un servidor no existen. | Se reconstruyen solas al compilar, en cualquier ordenador. |

### El editor de texto: ya no necesita internet

Esto era lo más grave de los que he encontrado hoy, y lo descubrí porque por fin
ejecuté unas pruebas que nunca se habían ejecutado del todo.

El editor de código (la pestaña "Source") **no venía dentro de la aplicación**: la
descargaba de un servidor externo, `cdn.jsdelivr.net`, cada vez que se abría. Si ese
sitio estaba lento, bloqueado o no había conexión, la aplicación se quedaba
**colgada en "Loading..." para siempre y sin decir ningún error**. No es que estuviera
roto: sencillamente el editor no llegaba nunca.

**Ahora el editor viene de casa.** Se copia de los archivos que ya tenías al compilar y
se sirve desde tu propia aplicación. Medido en el navegador: el editor carga desde
`/monaco/vs/…` y el error de consola ha desaparecido.

### Un fallo de accesibilidad que llevaba meses escondido

En la parte de arriba de cada página hay un enlace de **"Saltar al contenido"**, pensado
para quien navega con teclado. Ese enlace **no llevaba a ninguna parte**: apuntaba a un
sitio que no existía en ninguna página de la aplicación. Para quien usa el teclado con
una pantalla lectora, era un callejón sin salida.

Ahora las tres páginas (portal, editor y reproductor) tienen el destino correcto. Lo
detectó una prueba que nunca se había ejecutado entera.

---

## 2. Cómo está el proyecto ahora

| Comprobación | Resultado |
|---|---|
| Tipos y compilación | **Correcto** |
| Compilación para producción | **Correcta** |
| Pruebas automáticas | 1644 en total: 1643 pasan, **1 falla** (no es mía, ver 3.6) |
| Pruebas en navegador real | Las que he ejecutado. Ahora **ninguna se hace pasar por buena si no funciona** |

---

## 3. Lo que está roto y NO he arreglado

Lo digo claro porque prefiero que lo sepas.

### 3.1 La publicación en internet (Vercel) — lo más urgente

**Lo primero, y es lo importante: Vercel está publicando OTRO proyecto.**

Tu proyecto en Vercel se llama `abd-omega-editor`, y está conectado al repositorio de
GitHub **`ajabadia/ABDOmegaEditor`**. Pero el proyecto en el que trabajamos se llama
**`ajabadia/ABDOmegaUnified`**. Son dos repositorios **distintos, sin ningún antepasado
común** (lo comprobé: no comparten ni un solo commit).

Traducción: **todo lo que hemos arreglado no está en lo que Vercel publica.** Vercel
sigue con su copia antigua. Por eso el error que recibiste ("No Next.js version detected")
no se arregla cambiando una casilla.

Además, el repositorio que Vercel clona tiene la aplicación **en la raíz**
(`app/`, `src/`, `package.json` directamente), mientras que el nuestro la tiene en la
carpeta `web/`.

**Cuál es el bueno:** el nuestro, `ABDOmegaUnified`. Es donde se ha trabajado hoy, y
tiene el motor de audio, los módulos y las herramientas. `ABDOmegaEditor` parece la
versión antigua.

**Lo que tienes que hacer tú** (no puedo hacerlo yo, es tu cuenta de Vercel):

1. Entra en [vercel.com](https://vercel.com) → proyecto `abd-omega-editor`.
2. Pestaña **Settings** → **Git** → **Disconnect** el repositorio `ABDOmegaEditor`.
3. Pestaña **Settings** → **General** → **Root Directory** → escribe `web` y guarda.
4. Conecta el repositorio `ajabadia/ABDOmegaUnified` y despliega desde `main`.

**Aviso importante:** los arreglos de esta sesión están en tu ordenador, en 11 commits que
**todavía no se han subido** a GitHub. Si conectas Vercel antes de subirlos, construirá
una versión antigua.

### 3.2 Un fallo real que ha salido al mirar las pruebas de verdad

Al reescribir las pruebas del editor, ha aparecido esto:

**"Reset Workspace" (la opción de menú que deshace todo) deja el documento marcado como
"cambios sin guardar", cuando debería dejarlo limpio.** El texto sí vuelve a su estado
inicial; el cartel de "cambios sin guardar" se queda encendido.

Todavía **no sé por qué**. Mi sospecha es que el programa no anota el nuevo texto como
"punto limpio" al reiniciar, pero **suspuesta no es lo mismo que comprobado**, así que no
lo doy por cierto.

### 3.3 Las tres pruebas que "pasaban" sin comprobar nada

Buena noticia: **esto ya está resuelto**. Antes, tres pruebas envolvían su comprobación
en un `try/catch` que, si fallaba, escribía un mensaje y seguía tan tranquilo. Eso significa que
daban igual de "bien" tanto si la función servía como si estaba rota.

Descubrí además que **el fallo era de las pruebas, no de la aplicación**: escribían el
texto en un trozo de memoria que ya no estaba en pantalla,así que la aplicación nunca se enteraba de que la habías editado. Por eso el cartel de "cambios sin guardar" no aparecía
"nunca": **nunca le llegaban los cambios**.

Ahora:

- **2 pruebas affirms de verdad y pasan.** Una comprueba que al escribir aparece el
  cartel de cambios sin guardar y que al guardar desaparece; la otra comprueba que al
  recargar la página sale el aviso de "¿seguro?". Esta última **nunca se había comprobado
  de verdad** y funciona.
- **3 pruebas quedan marcadas como "pendiente"**, con el motivo escrito dentro del propio
  archivo. Salen como *pendiente* en el informe y **no pueden pasar por buenas**.

### 3.4 Una prueba en rojo en la barra de herramientas

Fallan al pedir que aparezcan cosas en un módulo vacío. Comportamiento real sin
investigar.

### 3.5 El editor de conexiones — **arreglado en parte**

Al ejecutar por fin estas pruebas encontré que fallaban **todas** (22). La causa era de las
pruebas, no de la aplicación:

- Las pruebas declaraban dos "jacks" (conexiones de audio) en el manifiesto pero **sin
  dibujarlos en el rack**. Un tirador de conexión necesita una posición en pantalla, y
  sin dibujar no la hay: solo aparecían 2 de 4.
- Además, **21 de esas pruebas leían una lista vacía sin avisar**. Buscaban un dato
  interno de la aplicación por un nombre que ya no existe, y cuando no lo encontraban
  devolvían "nada" en silencio. Es decir: no estaban comprobando nada.

**Resultado: de 0 pruebas en verde a 13.** Quedan **9 en rojo**, todas del mismo tipo:
intentan pasar el ratón por encima de la línea de conexión o pincharla para
borrarla, y el elemento no aparece. **No está diagnosticado.** Puede ser que el
ratón no alcance la línea, o que la línea no se dibuje; todavía no lo he medido.

### 3.6 Una prueba en rojo que no es mía

Falla una prueba de la **persistencia de sesión** (guardar y recuperar el trabajo al
abrir la aplicación). Ese archivo lo está escribiendo **otra sesión de trabajo**, no yo:
está sin guardar y no tiene nada que ver con nada de lo que he tocado hoy. Lo dejo dicho
para que no se me atribuya.

### 3.7 Pruebas de navegador que siguen sin ejecutar

Quedan **5** sin ejecutar de las 16 que hay. No es un problema de la aplicación: es un
hueco en lo que yo he podido comprobar. Cada tanda tarda entre 5 y 9 minutos y mi tiempo
de trabajo tiene un límite.

---

## 4. Trabajo de otras sesiones que sigue sin guardarse

Hay **66 ficheros** modificados que pertenecen a otras sesiones (el motor de audio, el
historial, el guardado de sesión, el reproductor). **No los he guardado** porque no son
míos y no quiero mezclar trabajo a medio terminar.

Consecuencia práctica: **una copia nueva del proyecto, descargada de internet, no
tendría todo lo que tiene tu ordenador ahora mismo.**

---

## 5. Lo que propongo hacer ahora, por orden

### 5.1 Subir los cambios a GitHub — es tuyo

Los 11 commits de esta sesión y el trabajo de otras sesiones están solo en tu ordenador.
Hasta que eso no pase, Vercel —y cualquier copia nueva— sigue viendo una versión
antigua. **No subo nada a GitHub sin que me lo digas expresamente.**

### 5.2 Lo siguiente, por orden

1. **Investigar por qué "Reset Workspace" deja el documento sucio** (3.2). Es un fallo
   real que afecta al uso diario.
2. **Acabar con las 9 pruebas del editor de conexiones** que quedan en rojo (3.5). Ahora
   fallan por un motivo distinto y ya se pueden investigar de verdad.
3. **Ejecutar las 5 pruebas de navegador que quedan** (3.7).
4. **Decidir qué hacemos con `ABDOmegaEditor`** (ver sección 8).

---

## 6. Una nota sobre cómo trabajo

En esta sesión **cuatro veces estuve a punto de comunicarte un problema que no existía**
o al revés: un fallo de Next.js que no era de Next.js, un módulo que sí se importaba, un
atajo equivocado que era un error mío al leer la lista, y un fallo de compilación que
había provocado yo mismo un rato antes.

En todos los casos lo detectó **medir en vez de suponer**. Por eso este documento
distingue siempre entre **"comprobado"** y **"sospechado"**. Si en algún punto lees
"sospecho", es porque no lo he verificado, y no quiero que lo tomes por otra cosa.

Un ejemplo de por qué importa: el editor de texto que no aparecía. Podía haber dicho
"el editor no funciona". Midiendo, descubrí que **el editor funcionaba perfectamente**
y que lo que estaba mal eran las pruebas que lo comprobaban.

---

## 7. Cómo puedes comprobar que esto es cierto

No hace falta que te fíes de mí. Cada afirmación comprobada tiene una forma de revisarla.
En la carpeta `web` salvo donde se dice otra cosa:

- **"Compila bien"** → `npx next build`. Debe terminar sin errores.

- **"Las pruebas automáticas pasan"** →
  `npx jest src/lib src/features/manifest-editor src/services/history.test.ts src/omega-ui-core`
  Deben salir `81 passed` y **1 failed** (la de la otra sesión, punto 3.6).

- **"El editor no necesita internet"** → `npx jest configureMonacoLoader`. Comprueba que
  el editor se pide a `/monaco/vs` y que en ninguna parte se configura una dirección de
  internet.

- **"Las carpetas se reconstruyen solas"** → desde la raíz del proyecto:
  `node scripts/prepare_public_assets.mjs --check`. En tu ordenador debe decir `junction`
  en cuatro y `materializado` en Monaco.

- **"El enlace de accesibilidad funciona"** → `npx playwright test accessibility -g main-content`.

- **"Las pruebas del editor no fingen"** → `npx playwright test e2e/smoke-tests.spec.ts`.
  Deben salir **2 aprobadas, 3 pendientes (fixme) y ninguna en rojo**.

Si alguno de esos falla, este documento está equivocado y quiero saberlo antes que nadie.

---

## 8. Qué hacer con el repositorio antiguo `ABDOmegaEditor`

Lo he mirado por dentro. Esto es lo que hay y lo que no hay:

**Vale la pena traer (no existe en el proyecto bueno):**

- **`.agent/`** — un conjunto de reglas y técnicas de trabajo: arquitectura limpia,
  pruebas antes que código, buenas prácticas de React, planificación. Son notas de
  trabajo, no código, y se pueden copiar tal cual.
- **`AGENTS.md` y `CLAUDE.md`** — las instrucciones de trabajo.
- **`tools/` y `.github/`** — dos comprobaciones automáticas que se ejecutan solas en
  cada cambio. El proyecto bueno **no tiene nada de eso**: sus pruebas solo se ejecutan
  cuando alguien se acuerda.
- **Historial de cambios** (`CHANGELOG.md`, `ROADMAP.md`) y cuatro documentos de plan.

**No hay que traer:**

- `app/`, `src/`, `public/`, `e2e/`, `package.json`… Eso es **la misma aplicación pero
  en la carpeta de arriba**, y ya la tenemos (dentro de `web/`). Copiarlo sería tener dos
  copias distintas peleándose por lo mismo.

**Mi recomendación:** traerse los cuatro primeros puntos, y **archivar** (no borrar) el
repositorio antiguo una vez que Vercel apunte al bueno. Borrarlo sería tirar algo que
nadie ha mirado en serio, y no soy quién para decidir eso.